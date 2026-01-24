(function () {
  const defaultHaveCurrentData = typeof HTMLMediaElement !== 'undefined'
    ? HTMLMediaElement.HAVE_CURRENT_DATA
    : 2;

  /**
   * @param {{paused?: boolean, ended?: boolean, readyState?: number, seeking?: boolean}} audioState
   * @param {{prefersReducedMotion?: boolean, haveCurrentData?: number}} [options]
   * @returns {boolean}
   */
  function resolveVinylSpinState(audioState = {}, options = {}) {
    const prefersReducedMotion = Boolean(options.prefersReducedMotion);
    if (prefersReducedMotion) return false;

    const paused = Boolean(audioState.paused);
    const ended = Boolean(audioState.ended);
    const seeking = Boolean(audioState.seeking);

    if (paused || ended || seeking) return false;

    const readyState = Number.isFinite(audioState.readyState)
      ? audioState.readyState
      : null;
    if (readyState !== null) {
      const threshold = Number.isFinite(options.haveCurrentData)
        ? options.haveCurrentData
        : defaultHaveCurrentData;
      if (readyState < threshold) return false;
    }

    return true;
  }

  if (typeof window !== 'undefined') {
    window.AriyoVinylUtils = {
      resolveVinylSpinState
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      resolveVinylSpinState
    };
  }
})();
