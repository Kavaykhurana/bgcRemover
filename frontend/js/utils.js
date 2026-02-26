/**
 * Format bytes as human-readable text.
 * @param {number} bytes Number of bytes.
 * @return {string} Formatted string.
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Creates a unique auto-generated filename
 */
export function generateFileName(originalName) {
  const timestamp = Date.now();
  const ext = originalName.substring(originalName.lastIndexOf('.')) || '.png';
  const base = originalName.substring(0, originalName.lastIndexOf('.')) || 'image';
  
  // Clean special characters from base
  const cleanBase = base.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 20);
  
  return `${cleanBase}-bg-removed-${timestamp}${ext}`;
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
