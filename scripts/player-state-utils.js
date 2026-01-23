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
   * @typedef {Object} LastPlayedState
   * @property {'track'|'radio'} mode
   * @property {string} [trackId]
   * @property {string} [stationId]
   * @property {string} srcUrl
   * @property {number} positionSeconds
   * @property {number} timestamp
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

  /**
   * @param {LastPlayedState} state
   * @returns {boolean}
   */
  function isValidLastPlayedState(state) {
    if (!state || typeof state !== 'object') return false;
    if (state.mode !== 'track' && state.mode !== 'radio') return false;
    const hasSrc = typeof state.srcUrl === 'string' && state.srcUrl.trim().length > 0;
    const hasTimestamp = Number.isFinite(state.timestamp) && state.timestamp > 0;
    const hasPosition = Number.isFinite(state.positionSeconds) && state.positionSeconds >= 0;
    return Boolean(hasSrc && hasTimestamp && hasPosition);
  }

  /**
   * @param {Object} raw
   * @returns {LastPlayedState | null}
   */
  function normalizeLastPlayedState(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const mode = raw.mode === 'track' || raw.mode === 'radio' ? raw.mode : null;
    if (!mode) return null;
    const srcUrl = typeof raw.srcUrl === 'string' ? raw.srcUrl.trim() : '';
    const trackId = typeof raw.trackId === 'string' ? raw.trackId.trim() : '';
    const stationId = typeof raw.stationId === 'string' ? raw.stationId.trim() : '';
    const positionSeconds = Number.isFinite(raw.positionSeconds)
      ? raw.positionSeconds
      : (Number.isFinite(raw.position) ? raw.position : 0);
    const timestamp = Number.isFinite(raw.timestamp) ? raw.timestamp : NaN;
    const normalized = {
      mode,
      srcUrl,
      trackId: trackId || undefined,
      stationId: stationId || undefined,
      positionSeconds: positionSeconds >= 0 ? positionSeconds : 0,
      timestamp
    };
    return isValidLastPlayedState(normalized) ? normalized : null;
  }

  if (typeof window !== 'undefined') {
    window.AriyoPlayerStateUtils = {
      isValidResumeState,
      normalizeResumeState,
      isValidLastPlayedState,
      normalizeLastPlayedState
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      isValidResumeState,
      normalizeResumeState,
      isValidLastPlayedState,
      normalizeLastPlayedState
    };
  }
})();
