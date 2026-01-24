const { resolveVinylSpinState } = require('../scripts/vinyl-utils');

describe('vinyl utils', () => {
  test('spins only when audio is actively playing', () => {
    expect(resolveVinylSpinState({ paused: true, ended: false, readyState: 4 })).toBe(false);
    expect(resolveVinylSpinState({ paused: false, ended: false, readyState: 4 })).toBe(true);
    expect(resolveVinylSpinState({ paused: false, ended: true, readyState: 4 })).toBe(false);
  });

  test('stops while seeking or buffering', () => {
    expect(resolveVinylSpinState({ paused: false, ended: false, seeking: true, readyState: 4 })).toBe(false);
    expect(resolveVinylSpinState({ paused: false, ended: false, readyState: 1 })).toBe(false);
  });

  test('respects reduced motion preference', () => {
    expect(resolveVinylSpinState({ paused: false, ended: false, readyState: 4 }, { prefersReducedMotion: true })).toBe(false);
  });
});
