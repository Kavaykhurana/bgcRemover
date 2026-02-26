import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    logger.warn({ err, userId: req.user?.id || 'anonymous' }, err.message);
    const response = {
      error: err.errorCode,
      message: err.message,
    };
    if (err.statusCode === 429) {
      response.retry_after = err.retryAfter;
    }
    return res.status(err.statusCode).json(response);
  }

  // Handle Multer payload too large
  if (err.code === 'LIMIT_FILE_SIZE') {
    logger.warn({ err }, 'File size limit exceeded handled by Multer');
    return res.status(413).json({
      error: 'FILE_TOO_LARGE',
      message: 'Maximum file size is 5MB.',
    });
  }

  // Fallback for unhandled errors
  logger.error({ err, path: req.path }, 'Unhandled exception');
  
  if (req.app.get('env') === 'development') {
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: err.message,
      stack: err.stack,
    });
  }

  return res.status(500).json({
    error: 'PROCESSING_FAILED',
    message: 'Background removal failed. Please try a different image.',
  });
};

export default errorHandler;
