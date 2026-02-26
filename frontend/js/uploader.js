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
    
    // Check type client-side before sending
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
    
    // Update Preview UI
    const objectUrl = URL.createObjectURL(file);
    previewImage.src = objectUrl;
    fileName.textContent = file.name;
    fileSize.textContent = formatBytes(file.size);
    
    // Notify main controller
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
    document.body.addEventListener(eventName, preventDefaults, false); // Prevent drop outside to stop browser nav
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
    // If we're not inside upload zone, ignore paste? We can allow it anywhere but upload
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        handleFile(file);
        break; // take first image only
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
