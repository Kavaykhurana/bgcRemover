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
    logger.warn('onnxruntime-node not found. Local provider will be unavailable.');
    throw err;
  }

  try {
    const modelPath = path.join(config.MODELS_DIR, 'u2net.onnx');
    session = await ort.InferenceSession.create(modelPath, { executionProviders: ['cpu'] });
    logger.info('Local U2-Net ONNX session initialized successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize U2-Net session. Did you download the model?');
    throw error;
  }
}

export async function removeBackground(inputBuffer) {
  if (!session) {
    await initialize();
  }

  const metadata = await sharp(inputBuffer).metadata();
  const { width, height } = metadata;

  const { data: rgbData } = await sharp(inputBuffer)
    .flatten({ background: '#ffffff' })
    .resize(MODEL_SIZE, MODEL_SIZE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

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

  const inputTensor = new ort.Tensor('float32', Float32Data, [1, 3, MODEL_SIZE, MODEL_SIZE]);

  const inputName = session.inputNames[0];
  const feeds = { [inputName]: inputTensor };
  const results = await session.run(feeds);
  const outputName = session.outputNames[0];
  const outputTensor = results[outputName];

  const tensorData = outputTensor.cpuData || outputTensor.data;
  const maskData = new Uint8Array(MODEL_SIZE * MODEL_SIZE);
  
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let i = 0; i < tensorData.length; i++) {
    if (tensorData[i] < minVal) minVal = tensorData[i];
    if (tensorData[i] > maxVal) maxVal = tensorData[i];
  }

  const range = (maxVal - minVal) || 1;

  for (let i = 0; i < tensorData.length; i++) {
    let val = (tensorData[i] - minVal) / range;
    maskData[i] = Math.max(0, Math.min(255, Math.round(val * 255))); 
  }

  const maskResized = await sharp(maskData, {
      raw: { width: MODEL_SIZE, height: MODEL_SIZE, channels: 1 }
    })
    .resize(width, height, { fit: 'fill', kernel: 'cubic' })
    .toColorspace('b-w')
    .raw()
    .toBuffer();

  const { data: originalRGBA } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const composited = Buffer.from(originalRGBA);
  for (let i = 0; i < width * height; i++) {
    composited[i * 4 + 3] = maskResized[i]; 
  }

  const finalImage = await sharp(composited, {
      raw: { width, height, channels: 4 }
    })
    .png()
    .toBuffer();

  return finalImage;
}
