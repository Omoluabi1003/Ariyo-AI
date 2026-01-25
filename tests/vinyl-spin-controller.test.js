const { updateVinylSpinState } = require('../scripts/vinyl-spin-controller');

describe('vinyl spin controller', () => {
  test('adds spinning class and runs animation when enabled', () => {
    const disc = document.createElement('div');
    const cover = document.createElement('div');

    updateVinylSpinState([disc, cover], true);

    expect(disc.classList.contains('spinning')).toBe(true);
    expect(cover.classList.contains('spinning')).toBe(true);
    expect(disc.classList.contains('spin')).toBe(true);
    expect(cover.classList.contains('spin')).toBe(true);
    expect(disc.style.animationPlayState).toBe('running');
    expect(cover.style.animationPlayState).toBe('running');
  });

  test('removes spinning class and pauses animation when disabled', () => {
    const disc = document.createElement('div');
    const cover = document.createElement('div');

    updateVinylSpinState([disc, cover], true);
    updateVinylSpinState([disc, cover], false);

    expect(disc.classList.contains('spinning')).toBe(false);
    expect(cover.classList.contains('spinning')).toBe(false);
    expect(disc.classList.contains('spin')).toBe(false);
    expect(cover.classList.contains('spin')).toBe(false);
    expect(disc.style.animationPlayState).toBe('paused');
    expect(cover.style.animationPlayState).toBe('paused');
  });
});
