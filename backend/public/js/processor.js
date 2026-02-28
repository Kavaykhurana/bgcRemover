export class APIError extends Error {
  constructor(message, status, retryAfter = null) {
      super(message);
      this.status = status;
      this.retryAfter = retryAfter;
  }
}

export async function processImageWithAI(file, provider = 'auto', apiKey = '') {
  // Update state UI
  import('./main.js').then(module => module.setUIState('stateProcessing'));

  const formData = new FormData();
  formData.append('provider', provider);
  formData.append('output_format', 'png');
  if (apiKey) formData.append('api_key', apiKey);
  formData.append('image', file);

  try {
      const response = await fetch('/api/remove-background', {
          method: 'POST',
          body: formData,
      });

      if (!response.ok) {
          let errorMessage = 'An error occurred during processing.';
          let retryAfter = null;
          
          try {
              const errorData = await response.json();
              errorMessage = errorData.message || errorMessage;
              retryAfter = errorData.retry_after;
          } catch(e) { /* non-json response */ }
          
          throw new APIError(errorMessage, response.status, retryAfter);
      }

      // Read metadata from headers
      const timeMs = response.headers.get('x-processing-time-ms') || '--';
      const modelUsed = response.headers.get('x-model-used') || 'unknown';
      const dimensions = response.headers.get('x-original-dimensions') || '--';

      // Parse binary image stream
      const blob = await response.blob();
      const resultImageUrl = URL.createObjectURL(blob);

      // Return processed output
      return {
          success: true,
          resultImageUrl,
          blob,
          metadata: { timeMs, modelUsed, dimensions }
      };

  } catch (error) {      
      let msg = error.message;
      if (error instanceof APIError && error.status === 429) {
          msg = `Rate limited. Please wait ${error.retryAfter || 60} seconds.`;
      }
      
      alert(`Processing Failed: ${msg}`);
      return { success: false, error };
  }
}
