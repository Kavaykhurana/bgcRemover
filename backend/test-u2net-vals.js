import * as ort from 'onnxruntime-node';

(async () => {
  const session = await ort.InferenceSession.create('./models/u2net.onnx', { executionProviders: ['cpu'] });
  const Float32Data = new Float32Array(3 * 320 * 320);
  Float32Data.fill(0); // Dummy black image
  
  const inputName = session.inputNames[0];
  const inputTensor = new ort.Tensor('float32', Float32Data, [1, 3, 320, 320]);
  
  const results = await session.run({ [inputName]: inputTensor });
  const outputName = session.outputNames[0];
  const outputTensor = results[outputName];
  
  const tensorData = outputTensor.cpuData || outputTensor.data;
  
  let min = Infinity, max = -Infinity;
  for(let i=0; i<tensorData.length; i++) {
    if (tensorData[i] < min) min = tensorData[i];
    if (tensorData[i] > max) max = tensorData[i];
  }
  
  console.log(`Min: ${min}, Max: ${max}`);
})();
