const { isValidResumeState, normalizeResumeState } = require('../scripts/player-state-utils');

describe('player state utils', () => {
  const albums = [
    { name: 'Kindness', tracks: [{ title: 'Locked Away', src: 'https://example.com/locked.mp3' }] }
  ];
  const stations = [
    { name: 'Omoluabi FM', url: 'https://radio.example.com/live' }
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
      stationIndex: -1,
      position: 42,
      trackId: 'locked-away',
      stationId: '',
      title: 'Locked Away',
      srcUrl: 'https://example.com/locked.mp3',
      timestamp: expect.any(Number)
    });
  });

  test('validates resume state', () => {
    const valid = {
      mode: 'track',
      albumIndex: 0,
      trackIndex: 0,
      stationIndex: -1,
      position: 0,
      trackId: 'locked-away',
      stationId: '',
      title: 'Locked Away',
      srcUrl: 'https://example.com/track.mp3',
      timestamp: Date.now()
    };
    expect(isValidResumeState(valid, albums, stations)).toBe(true);
  });

  test('normalizes radio saved state', () => {
    const normalized = normalizeResumeState({
      mode: 'radio',
      radioIndex: 0,
      timestamp: Date.now(),
      playbackPosition: 0
    }, albums, slugify, stations);

    expect(normalized).toEqual({
      mode: 'radio',
      albumIndex: -1,
      trackIndex: -1,
      stationIndex: 0,
      position: 0,
      trackId: '',
      stationId: 'omoluabi-fm',
      title: 'Omoluabi FM',
      srcUrl: 'https://radio.example.com/live',
      timestamp: expect.any(Number)
    });
  });
});
