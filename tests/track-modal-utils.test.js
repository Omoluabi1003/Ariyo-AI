const {
  resolveModalAlbum,
  describeTrackAvailability
} = require('../scripts/track-modal-utils');

describe('track modal utils', () => {
  const albums = [
    { name: 'Kindness', tracks: [{ title: 'Locked Away' }] },
    { name: 'My Playlist', tracks: [] }
  ];

  test('prefers a valid pending album index', () => {
    const result = resolveModalAlbum({
      albums,
      pendingAlbumIndex: 1,
      currentAlbumIndex: 0
    });

    expect(result.albumIndex).toBe(1);
    expect(result.album.name).toBe('My Playlist');
    expect(result.usedFallback).toBe(false);
  });

  test('falls back to the first album when indices are invalid', () => {
    const result = resolveModalAlbum({
      albums,
      pendingAlbumIndex: 99,
      currentAlbumIndex: -1
    });

    expect(result.albumIndex).toBe(0);
    expect(result.album.name).toBe('Kindness');
    expect(result.usedFallback).toBe(true);
  });

  test('describes availability states', () => {
    expect(describeTrackAvailability(null).status).toBe('loading');
    expect(describeTrackAvailability({ name: 'Empty', tracks: [] })).toEqual({
      status: 'empty',
      message: 'Track not available.'
    });
    expect(describeTrackAvailability(albums[0]).status).toBe('ready');
  });
});

