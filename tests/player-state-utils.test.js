const { isValidResumeState, normalizeResumeState } = require('../scripts/player-state-utils');

describe('player state utils', () => {
  const albums = [
    { name: 'Kindness', tracks: [{ title: 'Locked Away', src: 'locked-away.mp3' }] }
  ];
  const stations = [
    { name: 'Naija Hits (Live)', url: 'https://stream.zeno.fm/thbqnu2wvmzuv' }
  ];
  const slugify = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-');

  test('normalizes legacy saved state', () => {
    const normalized = normalizeResumeState({
      albumIndex: 0,
      trackIndex: 0,
      playbackPosition: 42,
      timestamp: Date.now()
    }, albums, slugify, stations);

    expect(normalized).toEqual({
      mode: 'track',
      albumIndex: 0,
      trackIndex: 0,
      positionSeconds: 42,
      trackId: 'locked-away',
      srcUrl: 'locked-away.mp3',
      title: 'Locked Away',
      timestamp: expect.any(Number)
    });
  });

  test('validates resume state', () => {
    const valid = {
      mode: 'track',
      albumIndex: 0,
      trackIndex: 0,
      positionSeconds: 0,
      trackId: 'locked-away',
      srcUrl: 'locked-away.mp3',
      title: 'Locked Away',
      timestamp: Date.now()
    };
    expect(isValidResumeState(valid, albums, stations)).toBe(true);
    expect(isValidResumeState({ ...valid, srcUrl: '' }, albums, stations)).toBe(false);
  });
});
