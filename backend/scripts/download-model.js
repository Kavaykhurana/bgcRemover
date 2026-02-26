import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODELS_DIR = path.resolve(__dirname, '../models');
const MODEL_PATH = path.join(MODELS_DIR, 'u2net.onnx');

// Highly reliable mirror for the ONNX model used commonly by rembg
const MODEL_URL = 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx';

async function downloadModel() {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
  }

  if (fs.existsSync(MODEL_PATH)) {
    logger.info('✅ Model already exists, skipping download.');
    return;
  }

  logger.info(`⬇️ Downloading U2-Net model (~170MB) from ${MODEL_URL}`);
  
  const file = fs.createWriteStream(MODEL_PATH);

  // Simple promise wrapper around https.get
  const download = (url) => new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Handle redirects, which GitHub releases always do
      if (response.statusCode === 301 || response.statusCode === 302) {
        logger.info(`Redirecting...`);
        return download(response.headers.location).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
          return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloaded = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        // Print progress every 10%
        if (totalSize) {
           const percent = ((downloaded / totalSize) * 100).toFixed(2);
           if (parseFloat(percent) % 10 < 0.1) {
              process.stdout.write(`\rProgress: ${percent}%`);
           }
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        process.stdout.write(`\rProgress: 100%   \n`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(MODEL_PATH, () => reject(err)); // Delete partial file
    });
  });

  try {
     await download(MODEL_URL);
     logger.info('✅ Model downloaded completely.');
  } catch (e) {
     logger.error({ err: e }, "❌ Failed to download model.");
     process.exit(1);
  }
}

downloadModel();
