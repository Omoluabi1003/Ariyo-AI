(function () {
  /**
   * Runs a callback during browser idle time with a timeout fallback.
   * @param {() => void} cb
   * @param {number} [timeout=1200]
   */
  function runWhenIdle(cb, timeout = 1200) {
    if (typeof cb !== 'function') return;
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(cb, { timeout });
    } else {
      setTimeout(cb, timeout);
    }
  }

  if (typeof window !== 'undefined') {
    window.runWhenIdle = runWhenIdle;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runWhenIdle };
  }
})();
