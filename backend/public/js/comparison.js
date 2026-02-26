export function initComparisonSlider() {
  const slider = document.getElementById('comparisonSlider');
  const imageBefore = document.getElementById('originalImage');
  const visualHandle = document.getElementById('sliderHandleVisual');

  function updateSlider(value) {
    // Value represents percentage from left
    imageBefore.style.clipPath = `polygon(0 0, ${value}% 0, ${value}% 100%, 0 100%)`;
    visualHandle.style.left = `${value}%`;
  }

  // Bind input event for real-time drag
  slider.addEventListener('input', (e) => {
    updateSlider(e.target.value);
  });

  // Handle external reset
  return {
    reset: () => {
      slider.value = 50;
      updateSlider(50);
    }
  };
}
