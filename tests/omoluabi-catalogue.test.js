const {
  OMOLUABI_TRACKS,
  LATEST_ANNOUNCEMENTS,
  resolveAnnouncementTrack
} = require('../scripts/omoluabi-catalogue.js');

const trackBySlug = Object.fromEntries(OMOLUABI_TRACKS.map(track => [track.slug, track]));

describe('Omoluabi catalogue', () => {
  test('uses canonical Suno URLs for core catalogue items', () => {
    const sunoSlugs = [
      'pepper-4-body',
      'watchman',
      'omoluabi',
      'no-contact'
    ];
    const sunoLinks = sunoSlugs.map(slug => trackBySlug[slug]?.src).filter(Boolean);
    expect(sunoLinks.length).toBe(sunoSlugs.length);
    sunoLinks.forEach(src => {
      expect(/^https?:\/\/(?:cdn\d*\.)?suno\.ai\//.test(src)).toBe(true);
    });
  });

  test('latest track announcements resolve to catalogue sources', () => {
    const resolved = LATEST_ANNOUNCEMENTS.map(resolveAnnouncementTrack).filter(Boolean);
    expect(resolved).toHaveLength(LATEST_ANNOUNCEMENTS.length);
    resolved.forEach(track => {
      const catalog = trackBySlug[track.slug];
      expect(catalog).toBeDefined();
      expect(track.src).toBe(catalog.src);
      expect(track.albumName).toBe('Omoluabi Production Catalogue');
    });
  });

  test('no catalogue entries point to legacy local asset folders', () => {
    const hasLegacyLocalPath = OMOLUABI_TRACKS.some(track =>
      track.src.includes('/data/omoluabi') || track.src.includes('/data/suno-assets')
    );
    expect(hasLegacyLocalPath).toBe(false);
  });
});
