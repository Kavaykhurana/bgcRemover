import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import fs from 'fs/promises';

(async () => {
  const testImgArrayBuffer = await (await fetch('https://upload.wikimedia.org/wikipedia/en/a/a6/Bender_Rodriguez.png')).arrayBuffer();
  const inputBuffer = Buffer.from(testImgArrayBuffer);

  const session = await ort.InferenceSession.create('./models/u2net.onnx', { executionProviders: ['cpu'] });
  
  const MODEL_SIZE = 320;
  const { data: rgbData } = await sharp(inputBuffer)
    .resize(MODEL_SIZE, MODEL_SIZE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const Float32Data = new Float32Array(3 * MODEL_SIZE * MODEL_SIZE);
  for (let i = 0; i < MODEL_SIZE * MODEL_SIZE; i++) {
    const r = rgbData[i*3] / 255.0;
    const g = rgbData[i*3 + 1] / 255.0;
    const b = rgbData[i*3 + 2] / 255.0;
    Float32Data[i] = (r - 0.485)/0.229;
    Float32Data[MODEL_SIZE*MODEL_SIZE + i] = (g - 0.456)/0.224;
    Float32Data[2*MODEL_SIZE*MODEL_SIZE + i] = (b - 0.406)/0.225;
  }

  const inputName = session.inputNames[0];
  const inputTensor = new ort.Tensor('float32', Float32Data, [1, 3, MODEL_SIZE, MODEL_SIZE]);
  const results = await session.run({ [inputName]: inputTensor });
  const outputTensor = results[session.outputNames[0]];
  const tensorData = outputTensor.cpuData || outputTensor.data;

  let min = Infinity, max = -Infinity;
  for(let i=0; i<tensorData.length; i++) {
    if(tensorData[i] < min) min = tensorData[i];
    if(tensorData[i] > max) max = tensorData[i];
  }
  console.log(`Bender test image Min: ${min}, Max: ${max}`);
})();
