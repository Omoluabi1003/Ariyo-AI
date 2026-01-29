(() => {
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

  const slugifyLabel = (value) => normalizeText(value).replace(/\s+/g, '-');

  const hashString = (value) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36);
  };

  const generateTrackId = ({ title, artist, audioUrl, albumId }) => {
    const signature = [
      normalizeText(title),
      normalizeText(artist),
      normalizeText(audioUrl),
      normalizeText(albumId)
    ].join('|');
    return `trk_${hashString(signature)}`;
  };

  const warnInvalidTrack = ({ reason, albumIndex, trackIndex, album, track }) => {
    if (typeof console === 'undefined' || typeof console.warn !== 'function') {
      return;
    }
    console.warn('[catalog] Track skipped:', {
      reason,
      albumIndex,
      trackIndex,
      albumTitle: album?.name || album?.title,
      trackTitle: track?.title,
      trackSrc: track?.src || track?.url
    });
  };

  const sortAlbumTracks = (tracks = []) => tracks.slice().sort((a, b) => {
    const aHasNumber = Number.isFinite(a.trackNumber);
    const bHasNumber = Number.isFinite(b.trackNumber);
    if (aHasNumber && bHasNumber) {
      return a.trackNumber - b.trackNumber;
    }
    if (aHasNumber) return -1;
    if (bHasNumber) return 1;
    return String(a.title || '').localeCompare(String(b.title || ''), undefined, { sensitivity: 'base' });
  });

  const buildCatalog = (albums = []) => {
    const trackCatalog = [];
    const trackById = {};
    const tracksByAlbumId = {};
    const albumIdByIndex = [];
    const albumIndexById = {};
    const trackLocationById = {};
    const trackIdByAudioUrl = {};

    if (!Array.isArray(albums)) {
      return {
        trackCatalog,
        trackById,
        tracksByAlbumId,
        albumIdByIndex,
        albumIndexById,
        trackLocationById,
        trackIdByAudioUrl
      };
    }

    albums.forEach((album, albumIndex) => {
      if (!album || !Array.isArray(album.tracks)) {
        return;
      }

      const albumTitle = album.name || album.title || `Album ${albumIndex + 1}`;
      const albumId = String(album.id || slugifyLabel(albumTitle) || `album-${albumIndex + 1}`);
      const albumCover = album.cover || album.coverImage;
      const albumArtist = album.artist;
      const albumTracks = [];

      albumIdByIndex[albumIndex] = albumId;
      albumIndexById[albumId] = albumIndex;

      album.tracks.forEach((track, trackIndex) => {
        if (!track) {
          warnInvalidTrack({ reason: 'missing-track', albumIndex, trackIndex, album, track });
          return;
        }

        const audioUrl = track.src || track.url;
        const title = track.title || track.name;

        if (!title) {
          warnInvalidTrack({ reason: 'missing-title', albumIndex, trackIndex, album, track });
          return;
        }

        if (!audioUrl) {
          warnInvalidTrack({ reason: 'missing-audio-url', albumIndex, trackIndex, album, track });
          return;
        }

        if (!albumId) {
          warnInvalidTrack({ reason: 'missing-album-id', albumIndex, trackIndex, album, track });
          return;
        }

        const artist = track.artist || albumArtist;
        const trackNumber = Number.isFinite(track.trackNumber)
          ? track.trackNumber
          : (Number.isFinite(track.index) ? track.index : undefined);
        const durationSec = Number.isFinite(track.duration) ? track.duration : undefined;
        const source = track.source
          || (track.sourceType === 'stream' || track.isLive ? 'remote' : 'local');
        const tags = Array.isArray(track.tags) ? track.tags.slice() : [];
        if (track.isLive || track.sourceType === 'stream') {
          if (!tags.includes('live')) {
            tags.push('live');
          }
        }

        const id = track.id ? String(track.id) : generateTrackId({
          title,
          artist,
          audioUrl,
          albumId
        });

        if (trackById[id]) {
          return;
        }

        const catalogTrack = {
          id,
          title,
          artist,
          albumId,
          albumTitle,
          trackNumber,
          durationSec,
          audioUrl,
          coverUrl: track.cover || albumCover,
          tags: tags.length ? tags : undefined,
          source
        };

        trackById[id] = catalogTrack;
        trackCatalog.push(catalogTrack);
        albumTracks.push(catalogTrack);
        trackLocationById[id] = { albumIndex, trackIndex };
        if (!trackIdByAudioUrl[audioUrl]) {
          trackIdByAudioUrl[audioUrl] = id;
        }
      });

      if (albumTracks.length) {
        tracksByAlbumId[albumId] = sortAlbumTracks(albumTracks);
      }
    });

    return {
      trackCatalog,
      trackById,
      tracksByAlbumId,
      albumIdByIndex,
      albumIndexById,
      trackLocationById,
      trackIdByAudioUrl
    };
  };

  const createSeededRng = (seed = 1) => {
    let state = seed >>> 0;
    return () => {
      state += 0x6d2b79f5;
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

  const createProvider = (albums = []) => {
    const catalog = buildCatalog(albums);
    const searchIndex = catalog.trackCatalog.map(track => ({
      id: track.id,
      searchText: normalizeText([
        track.title,
        track.artist,
        track.albumTitle,
        Array.isArray(track.tags) ? track.tags.join(' ') : ''
      ].filter(Boolean).join(' '))
    }));

    const searchTracks = (query) => {
      const normalizedQuery = normalizeText(query);
      if (!normalizedQuery) return [];
      return searchIndex
        .filter(entry => entry.searchText.includes(normalizedQuery))
        .map(entry => catalog.trackById[entry.id])
        .filter(Boolean);
    };

    const resolveTrackId = (track, { albumId } = {}) => {
      if (!track) return '';
      if (track.id) return String(track.id);
      const audioUrl = track.audioUrl || track.src || track.url;
      if (audioUrl && catalog.trackIdByAudioUrl[audioUrl]) {
        return catalog.trackIdByAudioUrl[audioUrl];
      }
      const resolvedAlbumId = albumId || track.albumId || 'unknown-album';
      return generateTrackId({
        title: track.title || track.name || '',
        artist: track.artist || '',
        audioUrl: audioUrl || '',
        albumId: resolvedAlbumId
      });
    };

    const buildQueue = (scope, options = {}) => {
      const {
        seed = Date.now(),
        rng = null,
        startTrackId = null,
        includeStart = false,
        albumId = null,
        filteredTracks = null,
        playlistTracks = null
      } = options;

      const random = typeof rng === 'function' ? rng : createSeededRng(seed);
      let poolIds = [];

      if (scope === 'ALL_TRACKS') {
        poolIds = catalog.trackCatalog.map(track => track.id);
      } else if (scope === 'ALBUM') {
        const albumTracks = albumId ? catalog.tracksByAlbumId[albumId] : [];
        poolIds = Array.isArray(albumTracks) ? albumTracks.map(track => track.id) : [];
      } else if (scope === 'FILTERED') {
        if (Array.isArray(filteredTracks)) {
          poolIds = filteredTracks.map(track => (typeof track === 'string' ? track : track.id)).filter(Boolean);
        }
      } else if (scope === 'PLAYLIST') {
        if (Array.isArray(playlistTracks)) {
          poolIds = playlistTracks.map(track => {
            if (typeof track === 'string') return track;
            return resolveTrackId(track, { albumId: track.albumId });
          }).filter(Boolean);
        }
      }

      const uniqueIds = Array.from(new Set(poolIds));
      const withoutStart = startTrackId
        ? uniqueIds.filter(id => id !== startTrackId)
        : uniqueIds;
      const shuffled = shuffleArray(withoutStart, random);
      if (startTrackId && includeStart) {
        return [startTrackId, ...shuffled];
      }
      return shuffled;
    };

    const groupTracksByAlbum = (tracks = []) => tracks.reduce((acc, track) => {
      if (!track) return acc;
      const key = track.albumId || 'unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(track);
      return acc;
    }, {});

    return {
      ...catalog,
      normalizeText,
      createSeededRng,
      shuffleArray,
      searchTracks,
      buildQueue,
      resolveTrackId,
      groupTracksByAlbum
    };
  };

  const api = {
    buildCatalog,
    createProvider,
    createSeededRng,
    shuffleArray,
    normalizeText,
    getProvider: () => window.AriyoTrackCatalogProvider || null,
    setProvider: (provider) => {
      window.AriyoTrackCatalogProvider = provider;
      return provider;
    }
  };

  if (typeof window !== 'undefined') {
    window.AriyoTrackCatalog = api;
    if (Array.isArray(window.albums) && window.albums.length) {
      api.setProvider(createProvider(window.albums));
    }
    window.addEventListener('ariyo:library-ready', (event) => {
      const source = event?.detail?.source || 'unknown';
      if (Array.isArray(window.albums) && window.albums.length) {
        api.setProvider(createProvider(window.albums));
        if (source === 'full') {
          window.__ariyoLibraryHydrated = true;
          window.__ariyoLibraryMode = 'full';
        }
      }
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
