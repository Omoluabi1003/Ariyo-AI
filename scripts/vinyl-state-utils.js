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
    const resolvedPlayIntent = typeof playIntent === 'boolean' ? playIntent : Boolean(isPlaying);
    if (reducedMotion) return false;
    if (ended) return false;
    if (paused && !resolvedPlayIntent) return false;
    if (waiting && !resolvedPlayIntent) return false;
    if (Number.isFinite(readyState) && readyState < DEFAULT_READY_STATE && !resolvedPlayIntent) return false;
    return true;
  }

  function deriveVinylSpinState(audioElement, options = {}) {
    if (!audioElement) return false;
    const {
      waiting = false,
      reducedMotion = false,
      isPlaying = false,
      playIntent
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
