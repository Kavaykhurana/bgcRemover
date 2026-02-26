import express from 'express';
import multer from 'multer';
import config from '../config/index.js';
import { validateImageBuffer } from '../middleware/fileValidation.js';
import imageProcessor from '../services/imageProcessor.js';
import { processBackgroundRemoval } from '../services/backgroundRemover.js';
import tempStorage from '../services/tempStorage.js';
import fs from 'fs';
import { z } from 'zod';
import logger from '../utils/logger.js';

const router = express.Router();

// Input Validation Schema (Zod) - Prevents NoSQL/Command injection and prototype pollution
const UploadQuerySchema = z.object({
  provider: z.enum(['auto', 'local', 'removebg']).default('auto'),
  output_format: z.enum(['png', 'jpeg', 'webp']).default('png'),
});

// 1. Initial layer: Multer locks down memory and prevents DOS payload stuffing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.MAX_FILE_SIZE_BYTES, // 5MB limit
    files: 1, // Strictly only 1 file
    fields: 4, // Max 4 text fields
    parts: 6,  // Max 6 multi-parts
    headerPairs: 100 // Prevent header DOS
  },
});

router.post(
  '/',
  upload.single('image'),
  validateImageBuffer, // 2. Custom validation
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'MISSING_FILE', message: 'No image uploaded.' });
      }

      // 2.5 Security: Strict Query Validation (Stripping malicious payloads)
      const parseResult = UploadQuerySchema.safeParse(req.body);
      if (!parseResult.success) {
        logger.warn({ ip: req.ip, issues: parseResult.error.issues }, 'Payload validation failed');
        return res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'Invalid payload parameters provided.' });
      }

      const { provider: requestedProvider, output_format: requestedOutputFormat } = parseResult.data;
      
      const { width, height } = req.fileMetadata || {}; // Inferred early from sharp in validation step

      // 3. Preprocess Image (orient, strip EXIF)
      const cleanBuffer = await imageProcessor.preprocessImage(req.file.buffer);

      // 4. AI Processing Layer (Removes background)
      const aiResult = await processBackgroundRemoval(cleanBuffer, requestedProvider);

      // 5. Postprocess Image (Optimization)
      const formattedBuffer = await imageProcessor.formatOutput(aiResult.buffer, requestedOutputFormat);

      // 6. Save to disk temporarily (To stream it cleanly and avoid large response buffering in V8 memory)
      const tempPath = await tempStorage.saveBuffer(formattedBuffer, 'bgc-result');

      // 7. Stream response
      res.set({
        'Content-Type': `image/${requestedOutputFormat}`,
        'X-Processing-Time-Ms': aiResult.metadata.processingTimeMs.toString(),
        'X-Model-Used': aiResult.metadata.modelUsed,
      });

      if (width && height) {
        res.set('X-Original-Dimensions', `${width}x${height}`);
      }

      const stream = fs.createReadStream(tempPath);
      
      // We rely on tempStorage's scheduled cleanup to delete the file later.
      stream.on('error', (err) => {
          logger.error({ err }, 'Stream sending error');
          next(err);
      });
      stream.pipe(res);

    } catch (error) {
      next(error);
    }
  }
);

export default router;
