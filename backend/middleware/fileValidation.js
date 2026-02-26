import sharp from 'sharp';
import fs from 'fs/promises';
import { UnsupportedMediaTypeError } from '../utils/errors.js';
import logger from '../utils/logger.js';

// Magic numbers mapped to their file types
const MAGIC_NUMBERS = {
  JPEG: [0xFF, 0xD8, 0xFF],
  PNG: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  WEBP_RIFF: [0x52, 0x49, 0x46, 0x46], // RIFF
  WEBP_WEBP: [0x57, 0x45, 0x42, 0x50]  // WEBP at offset 8
};

function checkMagicNumber(buffer, magicNumber, offset = 0) {
  if (buffer.length < offset + magicNumber.length) return false;
  for (let i = 0; i < magicNumber.length; i++) {
    if (buffer[i + offset] !== magicNumber[i]) return false;
  }
  return true;
}

export const validateImageBuffer = async (req, res, next) => {
  if (!req.file) {
    return next(); // Delegate missing file errors to the route logic if required
  }

  const { buffer, mimetype } = req.file;

  // 1. Weak check: Mimetype (Multer already sets this, but let's double check)
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimetype)) {
    return next(new UnsupportedMediaTypeError());
  }

  // 2. Strong check: Magic Numbers
  let isValidMagicNumber = false;
  if (checkMagicNumber(buffer, MAGIC_NUMBERS.JPEG)) isValidMagicNumber = true;
  else if (checkMagicNumber(buffer, MAGIC_NUMBERS.PNG)) isValidMagicNumber = true;
  else if (checkMagicNumber(buffer, MAGIC_NUMBERS.WEBP_RIFF) && checkMagicNumber(buffer, MAGIC_NUMBERS.WEBP_WEBP, 8)) {
    isValidMagicNumber = true;
  }

  if (!isValidMagicNumber) {
    logger.warn({ ip: req.ip, mimetype }, "Magic number mismatch or unsupported format detected.");
    return next(new UnsupportedMediaTypeError('Invalid file signature detected.'));
  }

  // 3. Ultra-strong check: Try decoding with sharp (catches malformed images)
  try {
    const metadata = await sharp(buffer).metadata();
    
    // Attach metadata safely for downstream usage if needed
    req.fileMetadata = {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
    };
    
    next();
  } catch (error) {
    logger.error({ err: error }, 'Sharp decode failed during validation');
    return next(new UnsupportedMediaTypeError('Image file is corrupted or unsupported.'));
  }
};
