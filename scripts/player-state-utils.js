(function () {
  /**
   * @typedef {Object} ResumeState
   * @property {'track'|'radio'} mode
   * @property {number} positionSeconds
   * @property {string} srcUrl
   * @property {string} title
   * @property {string} [trackId]
   * @property {string} [stationId]
   * @property {number} [albumIndex]
   * @property {number} [trackIndex]
   * @property {number} [radioIndex]
   * @property {number} timestamp
   */

  /**
   * @param {ResumeState} state
   * @param {Array<{tracks?: Array<{title?: string}>}>} albums
   * @param {Array<{name?: string, url?: string}>} stations
   * @returns {boolean}
   */
  function isValidResumeState(state, albums = [], stations = []) {
    if (!state || typeof state !== 'object') return false;
    const mode = state.mode === 'radio' ? 'radio' : 'track';
    const hasTitle = typeof state.title === 'string' && state.title.trim().length > 0;
    const hasSrc = typeof state.srcUrl === 'string' && state.srcUrl.trim().length > 0;
    const hasPosition = Number.isFinite(state.positionSeconds) && state.positionSeconds >= 0;
    const hasTimestamp = Number.isFinite(state.timestamp) && state.timestamp > 0;

    if (!hasTitle || !hasSrc || !hasPosition || !hasTimestamp) return false;

    if (mode === 'radio') {
      const hasRadioIndex = Number.isInteger(state.radioIndex)
        && state.radioIndex >= 0
        && state.radioIndex < stations.length;
      const hasStationId = typeof state.stationId === 'string' && state.stationId.trim().length > 0;
      return Boolean(hasRadioIndex || hasStationId);
    }

    const hasTrackId = typeof state.trackId === 'string' && state.trackId.trim().length > 0;
    const hasAlbumIndex = Number.isInteger(state.albumIndex) && state.albumIndex >= 0 && state.albumIndex < albums.length;
    const album = hasAlbumIndex ? albums[state.albumIndex] : null;
    const hasTrackIndex = Number.isInteger(state.trackIndex)
      && state.trackIndex >= 0
      && album
      && Array.isArray(album.tracks)
      && state.trackIndex < album.tracks.length;

    return Boolean(hasTrackId && hasAlbumIndex && hasTrackIndex);
  }

  /**
   * @param {Object} raw
   * @param {Array<{name?: string, tracks?: Array<{title?: string, id?: string}>}>} albums
   * @param {(value: string) => string} slugify
   * @param {Array<{name?: string, url?: string}>} stations
   * @returns {ResumeState | null}
   */
  function normalizeResumeState(raw, albums = [], slugify = value => value, stations = []) {
    if (!raw || typeof raw !== 'object') return null;
    const payload = raw.lastPlayed && typeof raw.lastPlayed === 'object'
      ? raw.lastPlayed
      : raw.lastPlayed === null
        ? null
        : raw;
    if (!payload) return null;
    const mode = payload.mode === 'radio' ? 'radio' : 'track';
    const timestamp = Number.isFinite(payload.timestamp)
      ? payload.timestamp
      : (Number.isFinite(raw.timestamp) ? raw.timestamp : Date.now());

    if (mode === 'radio') {
      const radioIndex = Number.isInteger(payload.radioIndex)
        ? payload.radioIndex
        : (Number.isInteger(raw.radioIndex) ? raw.radioIndex : -1);
      const station = stations && stations[radioIndex] ? stations[radioIndex] : null;
      const title = typeof payload.title === 'string' && payload.title.trim()
        ? payload.title.trim()
        : (station && station.name ? String(station.name) : '');
      const stationId = typeof payload.stationId === 'string' && payload.stationId.trim()
        ? payload.stationId.trim()
        : (station && station.name ? slugify(station.name) : '');
      const srcUrl = typeof payload.srcUrl === 'string' && payload.srcUrl.trim()
        ? payload.srcUrl.trim()
        : (station && station.url ? String(station.url) : '');
      const positionSeconds = Number.isFinite(payload.positionSeconds)
        ? payload.positionSeconds
        : 0;

      const normalized = {
        mode: 'radio',
        title,
        stationId,
        radioIndex: radioIndex >= 0 ? radioIndex : undefined,
        srcUrl,
        positionSeconds,
        timestamp
      };

      return isValidResumeState(normalized, albums, stations) ? normalized : null;
    }

    const albumIndex = Number.isInteger(payload.albumIndex) ? payload.albumIndex : -1;
    const trackIndex = Number.isInteger(payload.trackIndex) ? payload.trackIndex : -1;
    const album = albums[albumIndex];
    const track = album && Array.isArray(album.tracks) ? album.tracks[trackIndex] : null;
    const title = typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim()
      : (track && track.title ? String(track.title) : '');
    const trackId = typeof payload.trackId === 'string' && payload.trackId.trim()
      ? payload.trackId.trim()
      : (track && track.id ? String(track.id) : (track && track.title ? slugify(String(track.title)) : ''));
    const srcUrl = typeof payload.srcUrl === 'string' && payload.srcUrl.trim()
      ? payload.srcUrl.trim()
      : (track && track.src ? String(track.src) : '');
    const positionSeconds = Number.isFinite(payload.positionSeconds)
      ? payload.positionSeconds
      : (Number.isFinite(payload.position)
        ? payload.position
        : (Number.isFinite(payload.playbackPosition) ? payload.playbackPosition : NaN));

    const normalized = {
      mode: 'track',
      albumIndex,
      trackIndex,
      positionSeconds,
      trackId,
      srcUrl,
      title,
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
