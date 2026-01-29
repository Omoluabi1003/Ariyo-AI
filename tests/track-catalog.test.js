const {
  buildCatalog,
  createProvider
} = require('../scripts/track-catalog');

describe('track-catalog', () => {
  const albums = [
    {
      id: 'album-one',
      name: 'Album One',
      artist: 'Omoluabi',
      tracks: [
        { title: 'Beyoncé', src: 'https://example.com/a.mp3', artist: 'Omoluabi', trackNumber: 2 },
        { title: 'Alpha', src: 'https://example.com/b.mp3', trackNumber: 1 },
        { title: 'Beyoncé', src: 'https://example.com/a.mp3', artist: 'Omoluabi', trackNumber: 2 }
      ]
    },
    {
      name: 'Album Two',
      tracks: [
        { title: 'Hello, World!', src: 'https://example.com/c.mp3' }
      ]
    }
  ];

  test('buildCatalog produces stable ids and de-duplicates tracks', () => {
    const first = buildCatalog(albums);
    const second = buildCatalog(albums);

    expect(first.trackCatalog.length).toBe(3);
    expect(Object.keys(first.trackById).length).toBe(3);
    expect(first.trackCatalog.map(track => track.id)).toEqual(second.trackCatalog.map(track => track.id));
  });

  test('tracksByAlbumId sorts by trackNumber then title', () => {
    const { tracksByAlbumId } = buildCatalog(albums);
    const albumTracks = tracksByAlbumId['album-one'];
    expect(albumTracks.map(track => track.title)).toEqual(['Alpha', 'Beyoncé']);
  });

  test('searchTracks normalizes accents and punctuation', () => {
    const provider = createProvider(albums);
    const matches = provider.searchTracks('beyonce');
    expect(matches.map(track => track.title)).toContain('Beyoncé');
    const punctuationMatches = provider.searchTracks('hello world');
    expect(punctuationMatches.map(track => track.title)).toContain('Hello, World!');
  });

  test('buildQueue is deterministic with seed and shuffles without duplicates', () => {
    const provider = createProvider(albums);
    const seed = 42;
    const first = provider.buildQueue('ALL_TRACKS', { seed });
    const second = provider.buildQueue('ALL_TRACKS', { seed });

    expect(first).toEqual(second);
    expect(new Set(first).size).toBe(first.length);
    expect(first.length).toBe(provider.trackCatalog.length);

    const variations = new Set([
      provider.buildQueue('ALL_TRACKS', { seed: 1 }).join(','),
      provider.buildQueue('ALL_TRACKS', { seed: 2 }).join(','),
      provider.buildQueue('ALL_TRACKS', { seed: 3 }).join(',')
    ]);
    expect(variations.size).toBeGreaterThan(1);
  });
});
