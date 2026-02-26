import config from '../config/index.js';
import * as unetProvider from './providers/unet.provider.js';
import * as removebgProvider from './providers/removebg.provider.js';
import { ProcessingError } from '../utils/errors.js';
import logger from '../utils/logger.js';

export async function processBackgroundRemoval(buffer, requestedProvider = 'auto', userApiKey = null) {
  let activeProvider = requestedProvider;

  // Inherit default configuration if provider not explicitly requested in REST API
  if (!['auto', 'local', 'removebg'].includes(activeProvider)) {
    activeProvider = config.AI_PROVIDER;
  }

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
    } else { // 'auto'
      try {
        resultBuffer = await unetProvider.removeBackground(buffer);
        modelUsed = 'unet-onnx';
      } catch (localError) {
        logger.warn({ err: localError }, 'Local provider failed, falling back to remote');
        if (config.REMOVEBG_API_KEY || userApiKey) {
          resultBuffer = await removebgProvider.removeBackground(buffer, userApiKey);
          modelUsed = 'removebg-api';
        } else {
          throw new ProcessingError('Local provider failed and remote provider is not configured.');
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
    logger.error({ err: error, provider: activeProvider }, 'All background removal strategies failed');
    // If we already threw a structured ProcessingError inside the logic block, pass its custom message!
    if (error instanceof ProcessingError) {
      throw error;
    }
    throw new ProcessingError(error.message || undefined);
  }
}
