(function() {
  const schedule = (cb) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(cb, { timeout: 500 });
    } else {
      setTimeout(cb, 100);
    }
  };

  function hideBootSpinner() {
    const spinner = document.getElementById('bootSpinner');
    if (spinner) {
      spinner.classList.add('hidden');
      setTimeout(() => spinner.remove(), 300);
    }
  }

  function unlockAudioContext() {
    if (window.__ariyoAudioContext && window.__ariyoAudioContext.state === 'suspended') {
      window.__ariyoAudioContext.resume().catch(() => {});
    }
  }

  function attachUnlockGesture() {
    const handler = () => {
      unlockAudioContext();
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', handler);
    };
    document.addEventListener('click', handler, { passive: true });
    document.addEventListener('touchstart', handler, { passive: true });
    document.addEventListener('keydown', handler);
  }

  window.addEventListener('load', () => {
    hideBootSpinner();
    attachUnlockGesture();

    schedule(() => {
      if (typeof prepareDeferredIframes === 'function') {
        prepareDeferredIframes();
      }
      if (typeof startBackgroundRotator === 'function') {
        startBackgroundRotator();
      }
    });

    schedule(() => {
      if (typeof populateAlbumList === 'function') {
        populateAlbumList();
      }
      if (typeof deferExperienceInit === 'function') {
        deferExperienceInit();
      }
      if (typeof initUserTracking === 'function') {
        initUserTracking();
      }
    });
  });
})();
