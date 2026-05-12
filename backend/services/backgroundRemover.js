import config from '../config/index.js';
import * as unetProvider from './providers/unet.provider.js';
import * as removebgProvider from './providers/removebg.provider.js';
import { ProcessingError } from '../utils/errors.js';
import logger from '../utils/logger.js';

export async function processBackgroundRemoval(buffer, requestedProvider = 'auto', userApiKey = null) {
  let activeProvider = requestedProvider;

  if (!['auto', 'local', 'removebg'].includes(activeProvider)) {
    activeProvider = config.REMOVAL_PROVIDER;
  }

  if (process.env.VERCEL && activeProvider === 'auto') {
    activeProvider = 'removebg';
  }

  const remoteKeyAvailable = Boolean(userApiKey || (!process.env.VERCEL && config.REMOVEBG_API_KEY));

  const startTime = performance.now();
  let resultBuffer = null;
  let modelUsed = null;

  try {
    if (activeProvider === 'local') {
      resultBuffer = await unetProvider.removeBackground(buffer);
      modelUsed = 'unet-onnx';
    } else if (activeProvider === 'removebg') {
      resultBuffer = await removebgProvider.removeBackground(buffer, userApiKey);
      modelUsed = 'removebg-api';
    } else {
      try {
        resultBuffer = await unetProvider.removeBackground(buffer);
        modelUsed = 'unet-onnx';
      } catch (localError) {
        logger.warn({ err: localError }, 'Local provider failed, falling back to remote');
        if (remoteKeyAvailable) {
          resultBuffer = await removebgProvider.removeBackground(buffer, userApiKey);
          modelUsed = 'removebg-api';
        } else {
          throw new ProcessingError('Local background removal is unavailable. Add a remove.bg API key and try again.');
        }
      }
    }

    const processingTimeMs = Math.round(performance.now() - startTime);

    return {
      buffer: resultBuffer,
      metadata: {
        modelUsed,
        processingTimeMs,
      }
    };
  } catch (error) {
    if (error instanceof ProcessingError || error.isOperational) {
      logger.warn({ err: error, provider: activeProvider }, error.message);
      throw error;
    }
    logger.error({ err: error, provider: activeProvider }, 'All background removal strategies failed');
    throw new ProcessingError(error.message || undefined);
  }
}
