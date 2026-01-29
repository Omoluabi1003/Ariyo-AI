(() => {
  /**
   * @typedef {Object} Track
   * @property {string} id
   * @property {string} title
   * @property {string} [artist]
   * @property {string} albumId
   * @property {string} [albumTitle]
   * @property {number} [trackNumber]
   * @property {number} [durationSec]
   * @property {string} audioUrl
   * @property {string} [coverUrl]
   * @property {string[]} [tags]
   * @property {"local" | "remote"} [source]
   */

  const normalizeText = (value) => {
    const raw = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return raw;
  };

  const slugify = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  const hashString = (value) => {
    let hash = 5381;
    const input = String(value || '');
    for (let i = 0; i < input.length; i += 1) {
      hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
  };

  const resolveAlbumId = (album, albumIndex) => {
    const explicit = album?.id || album?.albumId || album?.slug;
    if (explicit) return String(explicit);
    const label = album?.name || album?.title;
    const slug = slugify(label);
    return slug || `album-${albumIndex + 1}`;
  };

  const resolveTrackNumber = (track, trackIndex) => {
    if (Number.isFinite(track?.trackNumber)) return Number(track.trackNumber);
    if (Number.isFinite(track?.trackNo)) return Number(track.trackNo);
    if (Number.isFinite(track?.number)) return Number(track.number);
    return trackIndex + 1;
  };

  const resolveAudioUrl = (track) => track?.audioUrl || track?.src || track?.url || '';

  const resolveCoverUrl = (track, album, fallbackCover) => (
    track?.cover || album?.cover || album?.coverImage || fallbackCover || undefined
  );

  const resolveSource = (track, audioUrl) => {
    if (track?.source === 'local' || track?.source === 'remote') return track.source;
    if (track?.sourceType === 'stream' || track?.isLive) return 'remote';
    if (track?.sourceType === 'file') return 'local';
    if (typeof audioUrl === 'string' && audioUrl.startsWith('http')) return 'remote';
    return 'local';
  };

  const buildTrackId = ({ track, albumId, title, artist, audioUrl }) => {
    if (track?.id) return String(track.id);
    const normalized = [
      normalizeText(title),
      normalizeText(artist),
      normalizeText(audioUrl),
      normalizeText(albumId)
    ].join('|');
    return `trk_${hashString(normalized)}`;
  };

  const sortTracks = (tracks) => {
    return tracks.slice().sort((a, b) => {
      if (Number.isFinite(a.trackNumber) && Number.isFinite(b.trackNumber)) {
        return a.trackNumber - b.trackNumber;
      }
      return String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' });
    });
  };

  const warnIfInvalid = ({ title, audioUrl, albumId, albumTitle, albumIndex, trackIndex }) => {
    if (!title || !audioUrl || !albumId) {
      console.warn('[track-catalog] Invalid track detected.', {
        title,
        audioUrl,
        albumId,
        albumTitle,
        albumIndex,
        trackIndex
      });
    }
  };

  const buildTrackCatalog = (albums = [], { fallbackCover } = {}) => {
    /** @type {Track[]} */
    const trackCatalog = [];
    const trackById = {};
    const tracksByAlbumId = {};
    const albumIndexById = {};
    const albumIdByIndex = {};
    const albumById = {};
    const trackLocationsById = {};
    const trackIdByLocation = {};
    const trackIdByAudioUrl = {};

    albums.forEach((album, albumIndex) => {
      if (!album || !Array.isArray(album.tracks)) {
        return;
      }
      const albumId = resolveAlbumId(album, albumIndex);
      const albumTitle = album?.name || album?.title || `Album ${albumIndex + 1}`;
      albumIndexById[albumId] = albumIndex;
      albumIdByIndex[albumIndex] = albumId;
      albumById[albumId] = album;

      const albumTracks = [];

      album.tracks.forEach((track, trackIndex) => {
        if (!track) return;
        const title = track.title || track.name || `Track ${trackIndex + 1}`;
        const audioUrl = resolveAudioUrl(track);
        const artist = track.artist || album.artist || undefined;
        warnIfInvalid({
          title,
          audioUrl,
          albumId,
          albumTitle,
          albumIndex,
          trackIndex
        });
        if (!audioUrl) return;

        const trackNumber = resolveTrackNumber(track, trackIndex);
        const durationSec = Number.isFinite(track.duration) ? Number(track.duration) : undefined;
        const coverUrl = resolveCoverUrl(track, album, fallbackCover);
        const tags = Array.isArray(track.tags) ? track.tags.slice() : (Array.isArray(album.tags) ? album.tags.slice() : undefined);
        const source = resolveSource(track, audioUrl);
        const id = buildTrackId({ track, albumId, title, artist, audioUrl });

        if (trackById[id]) {
          return;
        }

        /** @type {Track} */
        const normalizedTrack = {
          id,
          title,
          artist,
          albumId,
          albumTitle,
          trackNumber,
          durationSec,
          audioUrl,
          coverUrl,
          tags,
          source
        };

        trackById[id] = normalizedTrack;
        trackCatalog.push(normalizedTrack);
        albumTracks.push(normalizedTrack);
        trackLocationsById[id] = { albumIndex, trackIndex };
        trackIdByLocation[`${albumIndex}:${trackIndex}`] = id;
        const normalizedAudio = normalizeText(audioUrl);
        if (normalizedAudio && !trackIdByAudioUrl[normalizedAudio]) {
          trackIdByAudioUrl[normalizedAudio] = id;
        }
      });

      if (albumTracks.length) {
        tracksByAlbumId[albumId] = sortTracks(albumTracks);
      }
    });

    return {
      trackCatalog,
      trackById,
      tracksByAlbumId,
      albumIndexById,
      albumIdByIndex,
      albumById,
      trackLocationsById,
      trackIdByLocation,
      trackIdByAudioUrl
    };
  };

  const createSeededRng = (seed) => {
    const numericSeed = typeof seed === 'number'
      ? seed >>> 0
      : parseInt(hashString(String(seed)), 36) >>> 0;
    let state = numericSeed || 1;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const shuffleArray = (items, rng) => {
    const shuffled = items.slice();
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const createTrackCatalogProvider = (albums = [], options = {}) => {
    const catalog = buildTrackCatalog(albums, options);
    const searchIndex = catalog.trackCatalog.map(track => ({
      id: track.id,
      searchText: normalizeText([
        track.title,
        track.artist,
        track.albumTitle,
        ...(track.tags || [])
      ].filter(Boolean).join(' '))
    }));

    const searchTracks = (query) => {
      const normalizedQuery = normalizeText(query);
      if (!normalizedQuery) return [];
      return searchIndex
        .filter(item => item.searchText.includes(normalizedQuery))
        .map(item => catalog.trackById[item.id])
        .filter(Boolean);
    };

    const buildQueue = (scope, options = {}) => {
      const {
        albumId,
        filteredTrackIds,
        playlistTrackIds,
        startTrackId,
        excludeTrackIds,
        seed,
        rng
      } = options;
      let poolIds = [];

      if (scope === 'ALL_TRACKS') {
        poolIds = catalog.trackCatalog.map(track => track.id);
      } else if (scope === 'ALBUM') {
        poolIds = (catalog.tracksByAlbumId[albumId] || []).map(track => track.id);
      } else if (scope === 'FILTERED') {
        poolIds = Array.isArray(filteredTrackIds) ? filteredTrackIds.slice() : [];
      } else if (scope === 'PLAYLIST') {
        poolIds = Array.isArray(playlistTrackIds) ? playlistTrackIds.slice() : [];
      }

      const excludeSet = new Set(Array.isArray(excludeTrackIds) ? excludeTrackIds : []);
      poolIds = poolIds.filter(id => catalog.trackById[id] && !excludeSet.has(id));
      const random = rng || (typeof seed !== 'undefined' ? createSeededRng(seed) : Math.random);
      const shuffled = shuffleArray(poolIds, random);
      if (startTrackId && catalog.trackById[startTrackId]) {
        const withoutStart = shuffled.filter(id => id !== startTrackId);
        return [startTrackId, ...withoutStart];
      }
      return shuffled;
    };

    return {
      ...catalog,
      normalizeText,
      createSeededRng,
      shuffleArray,
      searchTracks,
      buildQueue
    };
  };

  const api = {
    normalizeText,
    buildTrackCatalog,
    createTrackCatalogProvider,
    createSeededRng,
    shuffleArray
  };

  if (typeof window !== 'undefined') {
    window.AriyoTrackCatalogBuilder = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
