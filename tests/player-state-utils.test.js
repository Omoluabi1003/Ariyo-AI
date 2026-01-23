const { isValidResumeState, normalizeResumeState } = require('../scripts/player-state-utils');

describe('player state utils', () => {
  const albums = [
    { name: 'Kindness', tracks: [{ title: 'Locked Away' }] }
  ];
  const slugify = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-');

  test('normalizes legacy saved state', () => {
    const normalized = normalizeResumeState({
      albumIndex: 0,
      trackIndex: 0,
      playbackPosition: 42,
      timestamp: Date.now()
    }, albums, slugify);

    expect(normalized).toEqual({
      albumIndex: 0,
      trackIndex: 0,
      position: 42,
      trackId: 'locked-away',
      title: 'Locked Away'
    });
  });

  test('validates resume state', () => {
    const valid = {
      albumIndex: 0,
      trackIndex: 0,
      position: 12,
      trackId: 'locked-away',
      title: 'Locked Away'
    };
    expect(isValidResumeState(valid, albums)).toBe(true);
    expect(isValidResumeState({ ...valid, position: 0 }, albums)).toBe(false);
  });
});
