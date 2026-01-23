(function () {
  /**
   * @typedef {Object} ResumeState
   * @property {'track'|'radio'} mode
   * @property {number} position
   * @property {number} timestamp
   * @property {string} title
   * @property {string} [trackId]
   * @property {string} [stationId]
   * @property {string} srcUrl
   * @property {number} [albumIndex]
   * @property {number} [trackIndex]
   * @property {number} [stationIndex]
   */

  /**
   * @param {ResumeState} state
   * @param {Array<{tracks?: Array<{title?: string, id?: string, src?: string}>}>} albums
   * @param {Array<{name?: string, url?: string}>} stations
   * @returns {boolean}
   */
  function isValidResumeState(state, albums = [], stations = []) {
    if (!state || typeof state !== 'object') return false;
    const mode = state.mode === 'radio' ? 'radio' : 'track';
    const hasTrackId = typeof state.trackId === 'string' && state.trackId.trim().length > 0;
    const hasStationId = typeof state.stationId === 'string' && state.stationId.trim().length > 0;
    const hasTitle = typeof state.title === 'string' && state.title.trim().length > 0;
    const hasPosition = Number.isFinite(state.position) && state.position >= 0;
    const hasSrcUrl = typeof state.srcUrl === 'string' && state.srcUrl.trim().length > 0;
    if (!hasTitle || !hasPosition || !hasSrcUrl) return false;

    if (mode === 'radio') {
      const hasStationIndex = Number.isInteger(state.stationIndex)
        && state.stationIndex >= 0
        && state.stationIndex < stations.length;
      return Boolean(hasStationId || hasStationIndex || hasSrcUrl);
    }

    const hasAlbumIndex = Number.isInteger(state.albumIndex)
      && state.albumIndex >= 0
      && state.albumIndex < albums.length;
    const album = hasAlbumIndex ? albums[state.albumIndex] : null;
    const hasTrackIndex = Number.isInteger(state.trackIndex)
      && state.trackIndex >= 0
      && album
      && Array.isArray(album.tracks)
      && state.trackIndex < album.tracks.length;

    return Boolean((hasTrackId || hasSrcUrl) && hasAlbumIndex && hasTrackIndex);
  }

  /**
   * @param {Object} raw
   * @param {Array<{name?: string, tracks?: Array<{title?: string, id?: string, src?: string}>}>} albums
   * @param {(value: string) => string} slugify
   * @param {Array<{name?: string, url?: string}>} stations
   * @returns {ResumeState | null}
   */
  function normalizeResumeState(raw, albums = [], slugify = value => value, stations = []) {
    if (!raw || typeof raw !== 'object') return null;
    const mode = raw.mode === 'radio' || Number.isInteger(raw.radioIndex) ? 'radio' : 'track';
    const albumIndex = Number.isInteger(raw.albumIndex) ? raw.albumIndex : -1;
    const trackIndex = Number.isInteger(raw.trackIndex) ? raw.trackIndex : -1;
    const stationIndex = Number.isInteger(raw.stationIndex)
      ? raw.stationIndex
      : (Number.isInteger(raw.radioIndex) ? raw.radioIndex : -1);
    const station = stations[stationIndex];
    const album = albums[albumIndex];
    const track = album && Array.isArray(album.tracks) ? album.tracks[trackIndex] : null;
    const title = typeof raw.title === 'string' && raw.title.trim()
      ? raw.title.trim()
      : mode === 'radio'
        ? (station && station.name ? String(station.name) : '')
        : (track && track.title ? String(track.title) : '');
    const trackId = typeof raw.trackId === 'string' && raw.trackId.trim()
      ? raw.trackId.trim()
      : (track && track.id ? String(track.id) : (track && track.title ? slugify(String(track.title)) : ''));
    const stationId = typeof raw.stationId === 'string' && raw.stationId.trim()
      ? raw.stationId.trim()
      : (station && station.name ? slugify(String(station.name)) : '');
    const position = Number.isFinite(raw.position)
      ? raw.position
      : (Number.isFinite(raw.playbackPosition) ? raw.playbackPosition : 0);
    const timestamp = Number.isFinite(raw.timestamp) ? raw.timestamp : Date.now();
    const srcUrl = typeof raw.srcUrl === 'string' && raw.srcUrl.trim()
      ? raw.srcUrl.trim()
      : (typeof raw.src === 'string' && raw.src.trim()
        ? raw.src.trim()
        : mode === 'radio'
          ? (station && station.url ? String(station.url) : '')
          : (track && track.src ? String(track.src) : ''));

    const normalized = {
      mode,
      albumIndex,
      trackIndex,
      stationIndex,
      position,
      trackId,
      stationId,
      title,
      srcUrl,
      timestamp
    };

    return isValidResumeState(normalized, albums, stations) ? normalized : null;
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
