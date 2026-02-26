import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import { RateLimitError } from '../utils/errors.js';
import logger from '../utils/logger.js';

// General rate limiter logic
export const createRateLimiter = () => {
  return rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS, // e.g., 60,000 ms = 1 minute
    max: config.RATE_LIMIT_MAX_UNAUTHENTICATED, // 10 requests per window
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res, next, options) => {
      logger.warn({ ip: req.ip }, 'Rate limit exceeded');
      next(new RateLimitError(options.message, Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000)));
    },
    message: 'Too many requests. Try again in 60 seconds.',
  });
};

export default createRateLimiter;
