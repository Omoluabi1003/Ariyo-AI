(function () {
  function updateVinylSpinState(elements, isSpinning, options = {}) {
    const { spinClass = 'spin', activeClass = 'spinning', setPlayState = true } = options;
    const list = Array.isArray(elements) ? elements : [elements];
    list.forEach(element => {
      if (!element) return;
      if (spinClass) {
        element.classList.toggle(spinClass, isSpinning);
      }
      if (activeClass) {
        element.classList.toggle(activeClass, isSpinning);
      }
      if (setPlayState) {
        element.style.animationPlayState = isSpinning ? 'running' : 'paused';
      }
    });
  }

  if (typeof window !== 'undefined') {
    window.AriyoVinylSpinController = {
      updateVinylSpinState
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      updateVinylSpinState
    };
  }
})();
