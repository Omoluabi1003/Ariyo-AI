(function () {
  const DEFAULT_READY_STATE = typeof HTMLMediaElement !== 'undefined'
    ? HTMLMediaElement.HAVE_CURRENT_DATA
    : 2;

  function shouldVinylSpin({
    paused,
    ended,
    waiting,
    readyState,
    reducedMotion,
    isPlaying,
    playIntent
  } = {}) {
    if (reducedMotion) return false;
    if (ended) return false;
    const hasPlayIntent = Boolean(playIntent || isPlaying);
    if (paused && !hasPlayIntent) return false;
    if (waiting && !hasPlayIntent) return false;
    if (Number.isFinite(readyState) && readyState < DEFAULT_READY_STATE && !hasPlayIntent) return false;
    return true;
  }

  function deriveVinylSpinState(audioElement, options = {}) {
    if (!audioElement) return false;
    const {
      waiting = false,
      reducedMotion = false,
      isPlaying = false,
      playIntent = false
    } = options;
    return shouldVinylSpin({
      paused: audioElement.paused,
      ended: audioElement.ended,
      waiting,
      readyState: audioElement.readyState,
      reducedMotion,
      isPlaying,
      playIntent
    });
  }

  if (typeof window !== 'undefined') {
    window.AriyoVinylStateUtils = {
      shouldVinylSpin,
      deriveVinylSpinState
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      shouldVinylSpin,
      deriveVinylSpinState
    };
  }
})();
