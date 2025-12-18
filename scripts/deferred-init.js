(function() {
  const schedule = (cb, timeout = 750) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(cb, { timeout });
    } else {
      setTimeout(cb, timeout);
    }
  };

  function hideBootSpinner() {
    const spinner = document.getElementById('bootSpinner');
    if (spinner) {
      spinner.classList.add('hidden');
      setTimeout(() => spinner.remove(), 260);
    }
  }

  function forcePreloadWelcomeAudio() {
    const welcomeAudio = document.getElementById('welcomeAudio');
    if (!welcomeAudio) return;
    welcomeAudio.preload = window.__IS_IOS__ ? 'auto' : 'metadata';
    if (window.__IS_IOS__) {
      try { welcomeAudio.load(); } catch (_) {}
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

  function deferNonCritical() {
    schedule(() => {
      if (typeof prepareDeferredIframes === 'function') prepareDeferredIframes();
      if (typeof startBackgroundRotator === 'function') startBackgroundRotator();
      if (typeof initUserTracking === 'function') initUserTracking();
    }, 500);

    schedule(() => {
      if (typeof deferExperienceInit === 'function') deferExperienceInit();
      if (typeof warmMiniGames === 'function') warmMiniGames();
    }, 1000);
  }

  function bootstrap() {
    hideBootSpinner();
    attachUnlockGesture();
    forcePreloadWelcomeAudio();
    deferNonCritical();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    requestAnimationFrame(bootstrap);
  } else {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  }

  window.addEventListener('load', hideBootSpinner, { once: true });
  setTimeout(hideBootSpinner, 1200);
})();
