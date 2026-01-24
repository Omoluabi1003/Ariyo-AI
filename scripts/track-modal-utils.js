(function (global) {
  function clampIndex(index, length) {
    if (!Number.isFinite(index)) return null;
    if (length <= 0) return null;
    const normalized = Math.trunc(index);
    if (normalized < 0 || normalized >= length) return null;
    return normalized;
  }

  function resolveModalAlbum({ albums, pendingAlbumIndex, currentAlbumIndex } = {}) {
    const catalog = Array.isArray(albums) ? albums : [];
    if (!catalog.length) {
      return {
        album: null,
        albumIndex: -1,
        usedFallback: true,
        reason: 'missing-catalog'
      };
    }

    const pending = clampIndex(pendingAlbumIndex, catalog.length);
    const current = clampIndex(currentAlbumIndex, catalog.length);

    const albumIndex = pending ?? current ?? 0;
    const album = catalog[albumIndex] || null;

    return {
      album,
      albumIndex,
      usedFallback: pending === null && current === null,
      reason: album ? null : 'missing-album'
    };
  }

  function describeTrackAvailability(album) {
    if (!album) {
      return { status: 'loading', message: 'Loading tracks…' };
    }
    if (!Array.isArray(album.tracks)) {
      return { status: 'loading', message: 'Loading tracks…' };
    }
    if (!album.tracks.length) {
      return { status: 'empty', message: 'Track not available.' };
    }
    return { status: 'ready', message: '' };
  }

  const api = {
    resolveModalAlbum,
    describeTrackAvailability
  };

  global.trackModalUtils = Object.assign({}, global.trackModalUtils, api);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);

