(function () {
  /**
   * @typedef {Object} ResumeState
   * @property {number} albumIndex
   * @property {number} trackIndex
   * @property {number} position
   * @property {string} trackId
   * @property {string} title
   */

  /**
   * @param {ResumeState} state
   * @param {Array<{tracks?: Array<{title?: string}>}>} albums
   * @returns {boolean}
   */
  function isValidResumeState(state, albums = []) {
    if (!state || typeof state !== 'object') return false;
    const hasTrackId = typeof state.trackId === 'string' && state.trackId.trim().length > 0;
    const hasTitle = typeof state.title === 'string' && state.title.trim().length > 0;
    const hasPosition = Number.isFinite(state.position) && state.position > 0;
    const hasAlbumIndex = Number.isInteger(state.albumIndex) && state.albumIndex >= 0 && state.albumIndex < albums.length;
    const album = hasAlbumIndex ? albums[state.albumIndex] : null;
    const hasTrackIndex = Number.isInteger(state.trackIndex)
      && state.trackIndex >= 0
      && album
      && Array.isArray(album.tracks)
      && state.trackIndex < album.tracks.length;

    return Boolean(hasTrackId && hasTitle && hasPosition && hasAlbumIndex && hasTrackIndex);
  }

  /**
   * @param {Object} raw
   * @param {Array<{name?: string, tracks?: Array<{title?: string, id?: string}>}>} albums
   * @param {(value: string) => string} slugify
   * @returns {ResumeState | null}
   */
  function normalizeResumeState(raw, albums = [], slugify = value => value) {
    if (!raw || typeof raw !== 'object') return null;
    const albumIndex = Number.isInteger(raw.albumIndex) ? raw.albumIndex : -1;
    const trackIndex = Number.isInteger(raw.trackIndex) ? raw.trackIndex : -1;
    const album = albums[albumIndex];
    const track = album && Array.isArray(album.tracks) ? album.tracks[trackIndex] : null;
    const title = typeof raw.title === 'string' && raw.title.trim()
      ? raw.title.trim()
      : (track && track.title ? String(track.title) : '');
    const trackId = typeof raw.trackId === 'string' && raw.trackId.trim()
      ? raw.trackId.trim()
      : (track && track.id ? String(track.id) : (track && track.title ? slugify(String(track.title)) : ''));
    const position = Number.isFinite(raw.position)
      ? raw.position
      : (Number.isFinite(raw.playbackPosition) ? raw.playbackPosition : NaN);

    const normalized = {
      albumIndex,
      trackIndex,
      position,
      trackId,
      title
    };

    return isValidResumeState(normalized, albums) ? normalized : null;
  }

  if (typeof window !== 'undefined') {
    window.AriyoPlayerStateUtils = {
      isValidResumeState,
      normalizeResumeState
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      isValidResumeState,
      normalizeResumeState
    };
  }
})();
