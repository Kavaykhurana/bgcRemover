import { formatBytes } from './utils.js';

export function setupUploader(onFileAccepted) {
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const previewImage = document.getElementById('previewImage');
  const fileName = document.getElementById('fileName');
  const fileSize = document.getElementById('fileSize');

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  let currentFile = null;

  function validateFile(file) {
    if (!file) return false;
    
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Invalid file format. Only JPG, PNG, and WebP are supported.');
      return false;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large. Max size is ${formatBytes(MAX_FILE_SIZE)}.`);
      return false;
    }
    
    return true;
  }

  function handleFile(file) {
    if (!validateFile(file)) return;
    
    currentFile = file;
    
    const objectUrl = URL.createObjectURL(file);
    previewImage.src = objectUrl;
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size);
    
    onFileAccepted(file, objectUrl);
  }

  // Click handling
  uploadZone.addEventListener('click', (e) => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Drag & Drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    uploadZone.addEventListener(eventName, () => {
      uploadZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadZone.addEventListener(eventName, () => {
      uploadZone.classList.remove('dragover');
    }, false);
  });

  uploadZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, false);

  // Paste Support
  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        handleFile(file);
        break;
      }
    }
  });

  return {
    getCurrentFile: () => currentFile,
    reset: () => {
      currentFile = null;
      fileInput.value = '';
      if (previewImage.src) {
        URL.revokeObjectURL(previewImage.src);
        previewImage.src = '';
      }
    }
  };
}
