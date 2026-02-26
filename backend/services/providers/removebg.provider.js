import axios from 'axios';
import FormData from 'form-data';
import config from '../../config/index.js';
import { ProcessingError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

export async function removeBackground(inputBuffer, userApiKey = null) {
  const activeKey = userApiKey || config.REMOVEBG_API_KEY;
  if (!activeKey) {
    throw new Error('Remove.bg API key is required but none was provided');
  }

  const formData = new FormData();
  formData.append('image_file', inputBuffer, {
    filename: 'image.png',
    contentType: 'image/png',
  });
  formData.append('size', 'auto'); // Auto detect subject size

  try {
    const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
      headers: {
        ...formData.getHeaders(),
        'X-Api-Key': activeKey,
      },
      responseType: 'arraybuffer', // Need raw binary data back
    });

    return Buffer.from(response.data);
  } catch (error) {
    logger.error({ 
      err: error, 
      status: error.response?.status, 
      response: error.response?.data?.toString() 
    }, 'remove.bg API call failed');
    
    // Convert to application error
    throw new ProcessingError('Remote background removal service failed. Check your API key.');
  }
}
