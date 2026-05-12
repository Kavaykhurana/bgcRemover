import axios from 'axios';
import FormData from 'form-data';
import config from '../../config/index.js';
import { MissingApiKeyError, ProcessingError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

export async function removeBackground(inputBuffer, userApiKey = null) {
  const trimmedUserKey = typeof userApiKey === 'string' ? userApiKey.trim() : '';
  const serverKey = process.env.VERCEL ? '' : config.REMOVEBG_API_KEY;
  const activeKey = trimmedUserKey || serverKey;
  if (!activeKey) {
    throw new MissingApiKeyError();
  }

  const formData = new FormData();
  formData.append('image_file', inputBuffer, {
    filename: 'image.png',
    contentType: 'image/png',
  });
  formData.append('size', 'auto');

  try {
    const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
      headers: {
        ...formData.getHeaders(),
        'X-Api-Key': activeKey,
      },
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
  } catch (error) {
    logger.error({ 
      err: error, 
      status: error.response?.status, 
      response: error.response?.data?.toString() 
    }, 'remove.bg API call failed');
    
    throw new ProcessingError('Remote background removal service failed. Check your API key.');
  }
}
