import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class TempStorageManager {
  constructor() {
    this.trackedFiles = new Set();
    
    // Process exit cleanup
    process.on('exit', () => {
      this.cleanupAllSync();
    });

    ['SIGINT', 'SIGTERM'].forEach(signal => {
      process.on(signal, () => {
        this.cleanupAllSync();
        process.exit();
      });
    });
  }

  async saveBuffer(buffer, prefix = 'img') {
    const uuid = crypto.randomUUID();
    const filename = `${prefix}-${uuid}.tmp`;
    const tempPath = path.join(config.TEMP_DIR, filename);

    try {
      // Security Hardening: mode 0o600 ensures ONLY the node process owner
      // can read/write this file. Blocks access from other users on shared hosts (like Render/EC2)
      await fs.writeFile(tempPath, buffer, { mode: 0o600 });
      this.trackedFiles.add(tempPath);
      
      // Schedule cleanup
      setTimeout(() => {
        this.deleteFile(tempPath).catch(() => {});
      }, config.TEMP_FILE_TTL_MS);

      logger.debug({ uuid, file: tempPath }, `Temp file created`);
      return tempPath;
    } catch (error) {
      logger.error({ err: error, tempPath }, 'Failed to save temp file');
      throw error;
    }
  }

  async deleteFile(filePath) {
    if (!this.trackedFiles.has(filePath)) return;

    try {
      await fs.unlink(filePath);
      this.trackedFiles.delete(filePath);
      logger.debug({ file: filePath }, 'Temp file deleted');
    } catch (error) {
      // Ignore if file doesn't exist
      if (error.code !== 'ENOENT') {
        logger.warn({ err: error, path: filePath }, 'Failed to delete temp file');
      }
    }
  }

  // Synchronous cleanup only for process exit
  cleanupAllSync() {
    for (const filePath of this.trackedFiles) {
      try {
        import('fs').then(fsSync => {
            if (fsSync.existsSync(filePath)) {
               fsSync.unlinkSync(filePath);
            }
        });
        
      } catch (err) {
        // Silent catch during shutdown
      }
    }
    this.trackedFiles.clear();
  }
}

export const tempStorage = new TempStorageManager();
export default tempStorage;
