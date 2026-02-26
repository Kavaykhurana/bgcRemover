import { initTheme } from './theme.js';
import { setupUploader } from './uploader.js';
import { processImageWithAI } from './processor.js';
import { initComparisonSlider } from './comparison.js';
import { initBackgroundControls } from './background.js';
import { generateFileName } from './utils.js';

// Global state controller
export function setUIState(state) {
  const states = ['stateUpload', 'statePreview', 'stateProcessing', 'stateResult'];
  states.forEach(s => {
    const el = document.getElementById(s);
    if (el) {
      el.style.display = s === state ? 'block' : 'none';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('[BGC] App initialized');

  // Initialize Modules
  initTheme();
  initBackgroundControls();
  const slider = initComparisonSlider();
  
  const processBtn = document.getElementById('processBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const resetBtn = document.getElementById('resetBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const originalImage = document.getElementById('originalImage');
  const resultImage = document.getElementById('resultImage');
  const metaTime = document.getElementById('metaTime');
  const metaModel = document.getElementById('metaModel');

  let activeProcessedUrl = null;

  // Set initial state
  setUIState('stateUpload');
  
  // Auto-load saved API key
  const apiKeyInput = document.getElementById('apiKeyInput');
  if (apiKeyInput && localStorage.getItem('removebgApiKey')) {
    apiKeyInput.value = localStorage.getItem('removebgApiKey');
  }

  const uploader = setupUploader((file, previewUrl) => {
    console.log('[BGC] File accepted:', file.name, file.size);
    originalImage.src = previewUrl; // Setup original for slider immediately
    setUIState('statePreview');
  });

  cancelBtn.addEventListener('click', () => {
    uploader.reset();
    setUIState('stateUpload');
  });

  processBtn.addEventListener('click', async () => {    
    console.log('[BGC] Process button clicked');
    const file = uploader.getCurrentFile();
    if (!file) return;

    const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
    if (apiKey) {
      localStorage.setItem('removebgApiKey', apiKey);
    } else {
      localStorage.removeItem('removebgApiKey');
    }

    // Process via API
    const response = await processImageWithAI(file, 'auto', apiKey);
    
    if (response && response.success) {
      // Setup successful UI
      activeProcessedUrl = response.resultImageUrl;
      resultImage.src = activeProcessedUrl;
      
      // Update metadata
      const { timeMs, modelUsed } = response.metadata;
      metaTime.textContent = timeMs !== '--' ? `${timeMs} ms` : '-- / cached';
      metaModel.textContent = modelUsed;

      setUIState('stateResult');
      slider.reset();
    } else {
      // On failure, go back to preview
      setUIState('statePreview');
    }
  });

  resetBtn.addEventListener('click', () => {
    // Clean up URLs
    if (activeProcessedUrl) {
      URL.revokeObjectURL(activeProcessedUrl);
      activeProcessedUrl = null;
    }
    
    uploader.reset();
    resultImage.src = '';
    originalImage.src = '';
    
    setUIState('stateUpload');
  });

  downloadBtn.addEventListener('click', () => {
    if (!activeProcessedUrl) return;
    
    const file = uploader.getCurrentFile();
    const desiredFileName = file ? generateFileName(file.name) : 'bg-removed.png';
    
    const a = document.createElement('a');
    a.href = activeProcessedUrl;
    a.download = desiredFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
});
