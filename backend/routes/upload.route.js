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

const UploadQuerySchema = z.object({
  provider: z.enum(['auto', 'local', 'removebg']).default('auto'),
  output_format: z.enum(['png', 'jpeg', 'webp']).default('png'),
  api_key: z.string().optional(),
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.MAX_FILE_SIZE_BYTES,
    files: 1,
    fields: 5,
    parts: 7,
    headerPairs: 100
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

      const parseResult = UploadQuerySchema.safeParse(req.body);
      if (!parseResult.success) {
        logger.warn({ ip: req.ip, issues: parseResult.error.issues }, 'Payload validation failed');
        return res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'Invalid payload parameters provided.' });
      }

      const { provider: requestedProvider, output_format: requestedOutputFormat, api_key: userApiKey } = parseResult.data;
      
      const { width, height } = req.fileMetadata || {}; // Inferred early from sharp in validation step

      const cleanBuffer = await imageProcessor.preprocessImage(req.file.buffer);

      const aiResult = await processBackgroundRemoval(cleanBuffer, requestedProvider, userApiKey);

      const formattedBuffer = await imageProcessor.formatOutput(aiResult.buffer, requestedOutputFormat);

      const tempPath = await tempStorage.saveBuffer(formattedBuffer, 'bgc-result');

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
