(function() {
  const PODCAST_ENDPOINT = '/api/podcasts';
  const FEED_CACHE_KEY = 'ariyoPodcastFeedCache';
  const FEED_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
  const AUDIO_URL_CACHE_KEY = 'ariyoAudioUrlCache';
  const AUDIO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  const collections = Array.isArray(window.RSS_COLLECTIONS) ? window.RSS_COLLECTIONS : [];
  const defaultCover = window.RSS_DEFAULT_COVER || '/Logo.jpg';

  function readCache(key, ttlMs) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed.timestamp || (Date.now() - parsed.timestamp) > ttlMs) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed.payload;
    } catch (error) {
      console.warn('[rss-cache] Unable to read cache:', error);
      return null;
    }
  }

  function writeCache(key, payload) {
    try {
      localStorage.setItem(key, JSON.stringify({ payload, timestamp: Date.now() }));
    } catch (error) {
      console.warn('[rss-cache] Unable to write cache:', error);
    }
  }

  function normalizeArtworkForCategory(category) {
    const match = collections.find(item => item.category === category);
    return match?.cover || defaultCover;
  }

  function getAudioCache() {
    try {
      const raw = localStorage.getItem(AUDIO_URL_CACHE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const now = Date.now();
      return Object.fromEntries(
        Object.entries(parsed).filter(([, entry]) => entry && (now - entry.timestamp) < AUDIO_CACHE_TTL_MS)
      );
    } catch (error) {
      return {};
    }
  }

  function persistAudioCache(cache) {
    try {
      localStorage.setItem(AUDIO_URL_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('[rss-cache] Unable to persist audio cache', error);
    }
  }

  function cacheAudioUrl(url) {
    const cache = getAudioCache();
    if (cache[url]) {
      return cache[url].resolved;
    }
    cache[url] = { resolved: url, timestamp: Date.now() };
    persistAudioCache(cache);
    return url;
  }

  function normalizeTrack(item) {
    const safeUrl = cacheAudioUrl(item.audioUrl);
    const cover = item.artwork || normalizeArtworkForCategory(item.category);
    return {
      id: item.id || item.audioUrl,
      src: safeUrl,
      title: item.title || 'Untitled Episode',
      artist: item.source || item.category,
      duration: item.duration || null,
      cover,
      lrc: safeUrl.replace(/\.mp3($|\?.*$)/i, '.lrc'),
      description: item.description,
      sourceType: 'rss',
      rssSource: item.source || item.category,
      publishedAt: item.publishedAt
    };
  }

  function groupTracksByCollection(tracks) {
    const grouped = new Map();

    tracks.forEach(track => {
      const bucket = collections.find(item => item.category === track.category) || collections[0];
      const key = bucket ? bucket.category : 'rss';
      if (!grouped.has(key)) {
        grouped.set(key, { meta: bucket, tracks: [] });
      }
      grouped.get(key).tracks.push(track);
    });

    return Array.from(grouped.values())
      .filter(entry => entry.tracks.length)
      .map(entry => {
        const meta = entry.meta || {};
        const cover = meta.cover || defaultCover;
        const albumName = meta.name || meta.category || 'Podcasts';
        return {
          name: albumName,
          cover,
          tracks: entry.tracks,
          rssFeed: true,
          releaseYear: new Date().getFullYear(),
          artist: meta.name || 'Podcast Feeds'
        };
      });
  }

  async function fetchFeedPayload() {
    const cached = readCache(FEED_CACHE_KEY, FEED_CACHE_TTL_MS);
    if (cached) return cached;

    const response = await fetch(PODCAST_ENDPOINT, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to load podcast feeds');
    const payload = await response.json();
    writeCache(FEED_CACHE_KEY, payload);
    return payload;
  }

  function refreshUi() {
    if (typeof populateAlbumList === 'function') {
      populateAlbumList();
    }
    if (typeof updateTrackListModal === 'function') {
      updateTrackListModal();
    }
  }

  async function ingestFeeds() {
    try {
      const payload = await fetchFeedPayload();
      const incomingTracks = Array.isArray(payload?.tracks) ? payload.tracks : [];
      if (!incomingTracks.length) return;

      const normalized = incomingTracks
        .map(normalizeTrack)
        .filter(track => track.src && track.title);

      const newAlbums = groupTracksByCollection(normalized);
      if (!newAlbums.length) return;

      if (window.libraryState) {
        window.libraryState.tracks = normalized;
      }

      newAlbums.forEach(album => {
        albums.push(album);
      });

      refreshUi();
    } catch (error) {
      console.warn('[rss-ingestion] Unable to hydrate podcast feeds:', error);
    }
  }

  function scheduleIngestion() {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(ingestFeeds, 250);
    } else {
      document.addEventListener('DOMContentLoaded', () => ingestFeeds(), { once: true });
    }
  }

  scheduleIngestion();
})();
