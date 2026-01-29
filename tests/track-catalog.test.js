const {
  buildTrackCatalog,
  createTrackCatalogProvider,
  createSeededRng,
  shuffleArray
} = require('../scripts/track-catalog');

describe('track catalog', () => {
  const albums = [
    {
      name: 'Studio Sessions',
      tracks: [
        { title: 'Beyoncé Halo!', artist: 'Beyoncé', src: 'https://example.com/halo.mp3' },
        { title: 'Beyoncé Halo!', artist: 'Beyoncé', src: 'https://example.com/halo.mp3' }
      ]
    },
    {
      name: 'Second Set',
      tracks: [
        { title: 'Clean Slate', artist: 'Omoluabi', src: 'local/clean-slate.mp3' }
      ]
    }
  ];

  test('builds a stable, de-duplicated catalog', () => {
    const catalogA = buildTrackCatalog(albums);
    const catalogB = buildTrackCatalog(albums);
    expect(catalogA.trackCatalog).toHaveLength(2);
    expect(catalogA.trackCatalog[0].id).toEqual(catalogB.trackCatalog[0].id);
    expect(Object.keys(catalogA.trackById)).toHaveLength(2);
  });

  test('normalizes search text across diacritics and punctuation', () => {
    const provider = createTrackCatalogProvider(albums);
    const results = provider.searchTracks('beyonce halo');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Beyoncé Halo!');
  });

  test('shuffles deterministically with a seed', () => {
    const provider = createTrackCatalogProvider(albums);
    const queueA = provider.buildQueue('ALL_TRACKS', { seed: 123 });
    const queueB = provider.buildQueue('ALL_TRACKS', { seed: 123 });
    expect(queueA).toEqual(queueB);
    expect(new Set(queueA).size).toBe(provider.trackCatalog.length);
  });

  test('shuffleArray uses injected RNG', () => {
    const rng = createSeededRng('seed');
    const shuffled = shuffleArray([1, 2, 3, 4], rng);
    expect(shuffled).toHaveLength(4);
    expect(new Set(shuffled).size).toBe(4);
  });
});
