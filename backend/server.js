import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import uploadRoute from './routes/upload.route.js';
import healthRoute from './routes/health.route.js';
import errorHandler from './middleware/errorHandler.js';
import rateLimit from './middleware/rateLimit.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialization async function
import { initialize as initLocalU2Net } from './services/providers/unet.provider.js';
import hpp from 'hpp'; // HTTP Parameter Pollution protection

const app = express();

// Security Hardening: Disable Express Fingerprint
app.disable('x-powered-by');

// Security Hardening: Maximum Defense Helmet Configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // required for our script injection
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disabled to allow images depending on deployment
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }, // 1 Year Strict HTTPS
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

// CORS Protection
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.ALLOWED_ORIGINS.includes('*')) return callback(null, true);
      const allowed = config.ALLOWED_ORIGINS.split(',').map(s => s.trim());
      if (allowed.includes(origin) || allowed.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Cross-Origin Request Blocked by local CORS policy'));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    exposedHeaders: ['X-Processing-Time-Ms', 'X-Model-Used', 'X-Original-Dimensions'],
    credentials: true,
    maxAge: 86400, // Preflight caching (24 hours) minimizes server load
  })
);

// Payload Size & Injection Limits
// Shrink the parsing bounds from 1MB down to practically nothing (50kb)
// since our binary blobs move through Multer multi-part, not these parsers.
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// HTTP Parameter Pollution (HPP): mitigates arrays injected in query/body where single strings expected
app.use(hpp());

// Routes
app.use('/health', healthRoute);
app.use('/api', rateLimit()); // Apply strict API rate limits
app.use('/api/remove-background', uploadRoute);

// Serve frontend static files
const frontendPath = path.join(__dirname, 'public');
app.use(express.static(frontendPath));

// SPA fallback — serve index.html for all other non-API routes
app.get('*', (req, res, next) => {
  // Only serve index.html for non-API routes to avoid recursive 404 loops or masking API 404s
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Centralized Error Handling
app.use(errorHandler);

// Start Server (Avoid listening physically on Vercel/Serverless where process.env.VERCEL is set)
let server;
if (!process.env.VERCEL) {
  server = app.listen(config.PORT, async () => {
    logger.info(`Server running in ${config.NODE_ENV} mode on port ${config.PORT}`);
    
    if (config.AI_PROVIDER === 'local' || config.AI_PROVIDER === 'auto') {
      try {
        await initLocalU2Net();
      } catch (err) {
        logger.warn('Failed to pre-warm local model during startup. Will try on first request.');
      }
    }
  });
}

// Graceful shutdown handling
const shutdown = () => {
  logger.info('Shutting down server...');
  server.close(() => {
    logger.info('Server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;
