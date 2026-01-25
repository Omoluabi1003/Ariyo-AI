const { shouldVinylSpin, deriveVinylSpinState } = require('../scripts/vinyl-state-utils');

describe('vinyl state utils', () => {
  test('spins only when actively playing with buffered data', () => {
    expect(shouldVinylSpin({
      paused: false,
      ended: false,
      waiting: false,
      readyState: 3,
      reducedMotion: false
    })).toBe(true);
  });

  test('stops when paused, ended, or waiting without play intent', () => {
    expect(shouldVinylSpin({
      paused: true,
      ended: false,
      waiting: false,
      readyState: 3,
      reducedMotion: false,
      isPlaying: false,
      playIntent: false
    })).toBe(false);

    expect(shouldVinylSpin({
      paused: false,
      ended: true,
      waiting: false,
      readyState: 3,
      reducedMotion: false,
      isPlaying: false,
      playIntent: false
    })).toBe(false);

    expect(shouldVinylSpin({
      paused: false,
      ended: false,
      waiting: true,
      readyState: 3,
      reducedMotion: false,
      isPlaying: false,
      playIntent: false
    })).toBe(false);
  });

  test('respects reduced motion or insufficient readyState without play intent', () => {
    expect(shouldVinylSpin({
      paused: false,
      ended: false,
      waiting: false,
      readyState: 1,
      reducedMotion: false,
      isPlaying: false,
      playIntent: false
    })).toBe(false);

    expect(shouldVinylSpin({
      paused: false,
      ended: false,
      waiting: false,
      readyState: 3,
      reducedMotion: true,
      isPlaying: false,
      playIntent: false
    })).toBe(false);
  });

  test('keeps spinning when UI play intent is true during buffering', () => {
    expect(shouldVinylSpin({
      paused: true,
      ended: false,
      waiting: true,
      readyState: 1,
      reducedMotion: false,
      isPlaying: false,
      playIntent: true
    })).toBe(true);
  });

  test('derives spin state from an audio element', () => {
    const audioElement = {
      paused: false,
      ended: false,
      readyState: 3
    };

    expect(deriveVinylSpinState(audioElement, { waiting: false, reducedMotion: false })).toBe(true);
    expect(deriveVinylSpinState(audioElement, { waiting: true, reducedMotion: false })).toBe(false);
    expect(deriveVinylSpinState(audioElement, { waiting: false, reducedMotion: true })).toBe(false);
  });

  test('derives spinning state when play intent is true', () => {
    const audioElement = {
      paused: true,
      ended: false,
      readyState: 1
    };

    expect(deriveVinylSpinState(audioElement, {
      waiting: true,
      reducedMotion: false,
      isPlaying: false,
      playIntent: true
    })).toBe(true);
  });

  test('returns false when audio element is missing', () => {
    expect(deriveVinylSpinState(null, { waiting: false, reducedMotion: false })).toBe(false);
  });
});
