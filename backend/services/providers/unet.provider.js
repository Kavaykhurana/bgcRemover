import sharp from 'sharp';
import path from 'path';
import config from '../../config/index.js';
import logger from '../../utils/logger.js';

let session = null;
let ort = null;
const MODEL_SIZE = 320; // 320x320 input size

export async function initialize() {
  if (session) return;
  try {
    ort = await import('onnxruntime-node');
  } catch (err) {
    logger.warn('onnxruntime-node not found. Local AI provider will be unavailable.');
    throw err;
  }

  try {
    const modelPath = path.join(config.MODELS_DIR, 'u2net.onnx');
    // Using CPU execution provider. You could add 'cuda' if GPU is available.
    session = await ort.InferenceSession.create(modelPath, { executionProviders: ['cpu'] });
    logger.info('✅ Local U2-Net ONNX session initialized successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize U2-Net session. Did you download the model?');
    throw error;
  }
}

export async function removeBackground(inputBuffer) {
  if (!session) {
    await initialize();
  }

  // 1. Get original image metadata
  const metadata = await sharp(inputBuffer).metadata();
  const { width, height } = metadata;

  // 2. Preprocess: Resize to 320x320, rgb, raw tensor data
  // Using flatten to ensure transparent regions become white, not black
  const { data: rgbData } = await sharp(inputBuffer)
    .flatten({ background: '#ffffff' })
    .resize(MODEL_SIZE, MODEL_SIZE, { fit: 'fill' }) // match network input shape perfectly
    .removeAlpha() // U2Net wants 3 channels
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Debug: Save the preprocessed image to see what the model actually gets
  sharp(rgbData, { raw: { width: MODEL_SIZE, height: MODEL_SIZE, channels: 3 } })
    .toFile(path.join(process.cwd(), 'debug_preprocessed.png'))
    .catch(() => {});

  // 3. Normalize image data for the tensor
  // Officially, U2-Net normalizes RGB by dividing by the local maximum pixel value of the image first!
  let maxPx = 1;
  for (let i = 0; i < rgbData.length; i++) {
    if (rgbData[i] > maxPx) maxPx = rgbData[i];
  }

  const Float32Data = new Float32Array(3 * MODEL_SIZE * MODEL_SIZE);
  for (let i = 0; i < MODEL_SIZE * MODEL_SIZE; i++) {
    const r = rgbData[i * 3] / maxPx;
    const g = rgbData[i * 3 + 1] / maxPx;
    const b = rgbData[i * 3 + 2] / maxPx;

    Float32Data[i] = (r - 0.485) / 0.229; // Red
    Float32Data[MODEL_SIZE * MODEL_SIZE + i] = (g - 0.456) / 0.224; // Green
    Float32Data[2 * MODEL_SIZE * MODEL_SIZE + i] = (b - 0.406) / 0.225; // Blue
  }

  const tensorOptions = { dims: [1, 3, MODEL_SIZE, MODEL_SIZE], type: 'float32', data: Float32Data };
  const inputTensor = new ort.Tensor('float32', Float32Data, [1, 3, MODEL_SIZE, MODEL_SIZE]);

  // 4. Run inference
  const inputName = session.inputNames[0];
  const feeds = { [inputName]: inputTensor };
  const results = await session.run(feeds);
  const outputName = session.outputNames[0];
  const outputTensor = results[outputName];

  // 5. Postprocess mask
  const tensorData = outputTensor.cpuData || outputTensor.data;
  const maskData = new Uint8Array(MODEL_SIZE * MODEL_SIZE);
  
  // Find min and max values to normalize the probability map back to [0.0, 1.0]
  // This step is critical because ONNX export graphs often output raw un-sigmoid'd logits
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let i = 0; i < tensorData.length; i++) {
    if (tensorData[i] < minVal) minVal = tensorData[i];
    if (tensorData[i] > maxVal) maxVal = tensorData[i];
  }

  const range = (maxVal - minVal) || 1;

  for (let i = 0; i < tensorData.length; i++) {
    // Pure linear mapping. Preserves 100% of the model's confidence without arbitrary thresholding
    let val = (tensorData[i] - minVal) / range;
    maskData[i] = Math.max(0, Math.min(255, Math.round(val * 255))); 
  }

  // 6. Build a resized mask matching original dimensions
  const maskResized = await sharp(maskData, {
      raw: { width: MODEL_SIZE, height: MODEL_SIZE, channels: 1 }
    })
    .resize(width, height, { fit: 'fill', kernel: 'cubic' }) // Use cubic to prevent lanczos ringing artifacts around edges
    .toColorspace('b-w')
    .raw()
    .toBuffer();

  // 7. Get the original image as raw RGBA pixels
  const { data: originalRGBA } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 8. Replace the alpha channel with the mask
  const composited = Buffer.from(originalRGBA);
  for (let i = 0; i < width * height; i++) {
    composited[i * 4 + 3] = maskResized[i]; 
  }

  // 9. Rebuild the final transparent image
  const finalImage = await sharp(composited, {
      raw: { width, height, channels: 4 }
    })
    .png()
    .toBuffer();

  return finalImage;
}
