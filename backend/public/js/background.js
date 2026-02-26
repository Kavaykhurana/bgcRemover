export function initBackgroundControls() {
  const swatches = document.querySelectorAll('.swatch');
  const colorPicker = document.getElementById('customColorPicker');
  const resultImage = document.getElementById('resultImage');
  const comparisonWrapper = document.getElementById('comparisonWrapper');

  function setBackground(color, element) {
    if (color === 'transparent') {
      comparisonWrapper.classList.add('checkerboard');
      comparisonWrapper.style.backgroundColor = 'transparent';
    } else {
      comparisonWrapper.classList.remove('checkerboard');
      comparisonWrapper.style.backgroundColor = color;
    }
    
    // Update active swatch state
    swatches.forEach(s => s.classList.remove('active'));
    if (element) {
      element.classList.add('active');
    }
  }

  // Handle Preset Swatches
  swatches.forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      const color = e.target.getAttribute('data-color');
      setBackground(color, e.target);
    });
  });

  // Handle Custom Color Picker
  colorPicker.addEventListener('input', (e) => {
    const color = e.target.value;
    setBackground(color, null); // custom color doesn't set a swatch active right away
  });
}
