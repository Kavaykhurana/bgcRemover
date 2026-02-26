import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('3000'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  
  // AI Providers
  AI_PROVIDER: z.enum(['auto', 'local', 'removebg']).default('auto'),
  REMOVEBG_API_KEY: z.string().optional(),

  // File Handling
  MAX_FILE_SIZE_BYTES: z.string().transform((val) => parseInt(val, 10)).default('5242880'), // 5MB
  TEMP_DIR: z.string().default('/tmp'),
  TEMP_FILE_TTL_MS: z.string().transform((val) => parseInt(val, 10)).default('120000'), // 2 mins

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform((val) => parseInt(val, 10)).default('60000'),
  RATE_LIMIT_MAX_UNAUTHENTICATED: z.string().transform((val) => parseInt(val, 10)).default('10'),
  RATE_LIMIT_MAX_AUTHENTICATED: z.string().transform((val) => parseInt(val, 10)).default('60'),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
}).refine(data => {
  if ((data.AI_PROVIDER === 'removebg' || data.AI_PROVIDER === 'auto') && !data.REMOVEBG_API_KEY) {
    if (data.AI_PROVIDER === 'removebg') return false; // Fail validation if strict requirement
    // In 'auto' mode, it will fallback to local if key is missing. We log a warning elsewhere.
  }
  return true;
}, {
  message: "REMOVEBG_API_KEY is required if AI_PROVIDER is 'removebg'",
  path: ["REMOVEBG_API_KEY"],
});

let config;
try {
  config = envSchema.parse(process.env);
  config.ROOT_DIR = path.resolve(__dirname, '..');
  config.MODELS_DIR = path.join(config.ROOT_DIR, 'models');
} catch (error) {
  console.error("❌ Invalid environment variables:", error.format());
  process.exit(1);
}

export default config;
