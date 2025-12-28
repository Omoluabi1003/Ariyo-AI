(function () {
  function computeBackoffDelay(attempt, baseMs = 2000, maxMs = 15000, jitterRatio = 0.2) {
    const safeAttempt = Math.max(1, Number(attempt) || 1);
    const base = Math.max(0, baseMs);
    const max = Math.max(base, maxMs);
    const exponential = Math.min(max, base * Math.pow(2, safeAttempt - 1));
    const jitter = exponential * jitterRatio * Math.random();
    return Math.round(exponential + jitter);
  }

  if (typeof window !== 'undefined') {
    window.AriyoAudioRecoveryUtils = {
      computeBackoffDelay
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      computeBackoffDelay
    };
  }
})();
