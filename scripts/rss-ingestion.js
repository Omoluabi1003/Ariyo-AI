(function() {
  const PODCAST_ENDPOINT = '/api/podcasts';
  const FEED_CACHE_KEY = 'ariyoPodcastFeedCache';
  const FEED_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
  const AUDIO_URL_CACHE_KEY = 'ariyoAudioUrlCache';
  const AUDIO_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  const collectionSeeds = Array.isArray(window.RSS_COLLECTIONS) ? window.RSS_COLLECTIONS : [];
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
    const match = collectionSeeds.find(item => item.category === category);
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

  function normalizeTrack(item, collectionMap) {
    const safeUrl = cacheAudioUrl(item.audioUrl);
    const feedKey = item.feedId || item.source || item.category;
    const collection = collectionMap.get(feedKey) || collectionMap.get(item.category);
    const categoryCover = normalizeArtworkForCategory(collection?.category || item.category);
    const cover = item.artwork || item.feedArtwork || collection?.artwork || categoryCover;
    const subtitleParts = [item.source || collection?.title || item.category];
    if (item.publishedAt) {
      subtitleParts.push(new Date(item.publishedAt).toLocaleDateString());
    }
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
      rssSource: item.source || collection?.title || item.category,
      publishedAt: item.publishedAt,
      feedId: feedKey,
      subtitle: subtitleParts.filter(Boolean).join(' • ')
    };
  }

  function groupTracksByFeed(tracks, collectionMap) {
    const grouped = new Map();

    tracks.forEach(track => {
      const bucket = collectionMap.get(track.feedId) || collectionMap.get(track.category) || {};
      const key = track.feedId || track.rssSource || 'rss';
      if (!grouped.has(key)) {
        grouped.set(key, { meta: bucket, tracks: [] });
      }
      grouped.get(key).tracks.push(track);
    });

    return Array.from(grouped.values())
      .filter(entry => entry.tracks.length)
      .map(entry => {
        const meta = entry.meta || {};
        const categoryCover = normalizeArtworkForCategory(meta.category || entry.tracks[0]?.category);
        const cover = entry.tracks[0]?.cover || meta.artwork || categoryCover;
        const albumName = meta.title || entry.tracks[0]?.rssSource || meta.category || 'Podcasts';
        return {
          name: albumName,
          cover,
          tracks: entry.tracks,
          rssFeed: true,
          releaseYear: new Date().getFullYear(),
          artist: meta.title || 'Podcast Feed'
        };
      });
  }

  let activeController = null;
  let ingestPromise = null;

  async function fetchFeedPayload(signal) {
    const cached = readCache(FEED_CACHE_KEY, FEED_CACHE_TTL_MS);
    if (cached) return cached;

    const response = await fetch(PODCAST_ENDPOINT, { cache: 'no-store', signal });
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

  async function ingestFeeds(reason = 'manual') {
    try {
      if (activeController) {
        activeController.abort();
      }
      activeController = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const payload = await fetchFeedPayload(activeController?.signal);
      const incomingTracks = Array.isArray(payload?.tracks) ? payload.tracks : [];
      if (!incomingTracks.length) return;

      const collections = Array.isArray(payload?.collections) ? payload.collections : [];
      const collectionMap = new Map();
      collectionSeeds.forEach(seed => collectionMap.set(seed.category, seed));
      collections.forEach(meta => collectionMap.set(meta.id || meta.url || meta.category, meta));

      const normalized = incomingTracks
        .map(item => normalizeTrack(item, collectionMap))
        .filter(track => track.src && track.title);

      const newAlbums = groupTracksByFeed(normalized, collectionMap);
      if (!newAlbums.length) return;

      if (window.libraryState) {
        window.libraryState.tracks = normalized;
      }

      newAlbums.forEach(album => {
        albums.push(album);
      });

      refreshUi();
      window.dispatchEvent(new CustomEvent('ariyo:library-updated', {
        detail: { source: 'rss', albums: newAlbums.length, tracks: normalized.length }
      }));
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.warn('[rss-ingestion] Unable to hydrate podcast feeds:', error, { reason });
    } finally {
      activeController = null;
    }
  }

  function requestRssIngestion({ reason = 'user', immediate = false } = {}) {
    if (ingestPromise) return ingestPromise;
    const run = () => ingestFeeds(reason);

    ingestPromise = immediate
      ? run()
      : new Promise(resolve => {
          const schedule = typeof requestIdleCallback === 'function'
            ? cb => requestIdleCallback(cb, { timeout: 2000 })
            : cb => setTimeout(cb, 500);
          schedule(() => resolve(run()));
        }).finally(() => {
          ingestPromise = null;
        });

    return ingestPromise;
  }

  window.requestRssIngestion = requestRssIngestion;
})();
