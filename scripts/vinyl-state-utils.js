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
    isPlaying
  } = {}) {
    if (reducedMotion) return false;
    if (paused || ended) return false;
    if (waiting && !isPlaying) return false;
    if (Number.isFinite(readyState) && readyState < DEFAULT_READY_STATE && !isPlaying) return false;
    return true;
  }

  function deriveVinylSpinState(audioElement, options = {}) {
    if (!audioElement) return false;
    const { waiting = false, reducedMotion = false, isPlaying = false } = options;
    return shouldVinylSpin({
      paused: audioElement.paused,
      ended: audioElement.ended,
      waiting,
      readyState: audioElement.readyState,
      reducedMotion,
      isPlaying
    });
  }

  if (typeof window !== 'undefined') {
    window.AriyoVinylStateUtils = {
      shouldVinylSpin,
      deriveVinylSpinState
    };
  }
})();
