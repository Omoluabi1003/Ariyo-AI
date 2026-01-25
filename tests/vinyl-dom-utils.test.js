const { applyVinylSpinState } = require('../scripts/vinyl-state-utils');

describe('vinyl DOM utils', () => {
  test('toggles spinning class and animation play state', () => {
    const disc = document.createElement('div');
    const cover = document.createElement('div');
    disc.className = 'turntable-disc';
    cover.className = 'album-cover';

    applyVinylSpinState([disc, cover], true);

    expect(disc.classList.contains('is-spinning')).toBe(true);
    expect(cover.classList.contains('is-spinning')).toBe(true);
    expect(disc.style.animationPlayState).toBe('running');
    expect(cover.style.animationPlayState).toBe('running');

    applyVinylSpinState([disc, cover], false);

    expect(disc.classList.contains('is-spinning')).toBe(false);
    expect(cover.classList.contains('is-spinning')).toBe(false);
    expect(disc.style.animationPlayState).toBe('paused');
    expect(cover.style.animationPlayState).toBe('paused');
  });
});
