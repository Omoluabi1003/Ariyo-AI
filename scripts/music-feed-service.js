(function (global) {
  const DIRECT_AUDIO_PATTERN = /\.(mp3|m4a|aac|ogg|wav)(\?|#|$)/i;
  const CACHE_TTL_MS = 10 * 60 * 1000;
  const REQUEST_TIMEOUT_MS = 8000;

  function resolveBaseUrl() {
    try {
      if (typeof import !== 'undefined' && typeof import.meta !== 'undefined' && import.meta.env) {
        const viteUrl = import.meta.env.VITE_MUSIC_FEED_BASE_URL || import.meta.env.NEXT_PUBLIC_MUSIC_FEED_BASE_URL;
        if (viteUrl) return viteUrl;
      }
    } catch (err) {
      /* no-op */
    }

    if (typeof global !== 'undefined') {
      const injected = global.__MUSIC_FEED_BASE_URL__ || global.MUSIC_FEED_BASE_URL;
      if (injected) return injected;
    }

    try {
      if (typeof process !== 'undefined' && process.env) {
        return process.env.VITE_MUSIC_FEED_BASE_URL || process.env.NEXT_PUBLIC_MUSIC_FEED_BASE_URL || '';
      }
    } catch (err) {
      /* no-op */
    }

    return '';
  }

  const rawBaseUrl = resolveBaseUrl();
  const trimmedBaseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/$/, '') : '';

  const cache = new Map();

  function isLocalhostHost(hostname) {
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }

  function isDirectAudioUrl(url) {
    if (!url) return false;
    let parsed;
    try {
      parsed = new URL(url, global.location ? global.location.origin : undefined);
    } catch (err) {
      return false;
    }

    const protocolValid = parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isLocalhostHost(parsed.hostname));
    const hasDirectExtension = DIRECT_AUDIO_PATTERN.test(parsed.pathname);
    return protocolValid && hasDirectExtension;
  }

  function normalizeItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const title = (raw.title || '').toString().trim();
    const artist = (raw.artist || '').toString().trim();
    const audioUrl = (raw.audioUrl || '').toString().trim();
    const format = raw.format === 'track' || raw.format === 'mix' || raw.format === 'episode' ? raw.format : null;
    const category = (raw.category || '').toString().trim();
    const sourceKey = (raw.sourceKey || '').toString().trim();
    const sourceName = (raw.sourceName || '').toString().trim();
    const publishedAt = raw.publishedAt ? new Date(raw.publishedAt) : null;

    if (!title || !artist || !audioUrl || !format || !category || !sourceKey || !sourceName || !publishedAt || isNaN(publishedAt.getTime())) {
      return null;
    }

    if (!isDirectAudioUrl(audioUrl)) {
      return null;
    }

    const safePageUrl = raw.pageUrl && typeof raw.pageUrl === 'string' ? raw.pageUrl : '';
    const safeArtwork = raw.artwork && typeof raw.artwork === 'string' ? raw.artwork : '';
    const durationSec = typeof raw.durationSec === 'number' && raw.durationSec > 0 ? raw.durationSec : undefined;
    const explicit = Boolean(raw.explicit);
    const confidence = typeof raw.confidence === 'number' ? raw.confidence : undefined;

    const publishedIso = publishedAt.toISOString();
    const normalized = {
      id: (raw.id || `${title}-${artist}-${publishedIso}`).toString(),
      title,
      artist,
      format,
      category,
      audioUrl,
      pageUrl: safePageUrl,
      artwork: safeArtwork,
      publishedAt: publishedIso,
      durationSec,
      explicit,
      sourceKey,
      sourceName,
      confidence,
    };

    normalized.signature = `${normalized.audioUrl.toLowerCase()}|${normalized.title.toLowerCase()}|${normalized.artist.toLowerCase()}|${publishedIso}`;
    return normalized;
  }

  function dedupeItems(items) {
    const seenAudio = new Set();
    const seenSignature = new Set();
    const result = [];

    for (const item of items) {
      if (seenAudio.has(item.audioUrl)) continue;
      const sig = item.signature || `${item.audioUrl}-${item.title}-${item.artist}-${item.publishedAt}`;
      if (seenSignature.has(sig)) continue;
      seenAudio.add(item.audioUrl);
      seenSignature.add(sig);
      result.push(item);
    }
    return result;
  }

  function buildUrl(pathname, params) {
    const url = new URL(trimmedBaseUrl + pathname);
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    });
    return url;
  }

  function withTimeout(promise, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      promise
        .then(value => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  async function fetchFeed(pathname, params, cacheKey) {
    if (!trimmedBaseUrl) {
      return { items: [], sources: [], generatedAt: null, version: null };
    }

    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const targetUrl = buildUrl(pathname, params);
    const controller = new AbortController();
    const fetchPromise = fetch(targetUrl.toString(), { signal: controller.signal }).then(res => {
      if (!res.ok) {
        throw new Error(`Request failed with ${res.status}`);
      }
      return res.json();
    });

    const response = await withTimeout(fetchPromise, REQUEST_TIMEOUT_MS);
    const items = Array.isArray(response?.items) ? response.items.map(normalizeItem).filter(Boolean) : [];
    const deduped = dedupeItems(items);
    const payload = {
      version: response?.version || null,
      generatedAt: response?.generatedAt || null,
      sources: Array.isArray(response?.sources) ? response.sources : [],
      items: deduped,
    };

    cache.set(cacheKey, { timestamp: now, data: payload });
    return payload;
  }

  const api = {
    isEnabled: Boolean(trimmedBaseUrl),
    baseUrl: trimmedBaseUrl,
    async getLatest(limit = 50) {
      return fetchFeed('/feed/latest', { limit }, `latest-${limit}`);
    },
    async getLibrary(category = 'Afrobeat', limit = 100) {
      return fetchFeed('/feed/library', { category, limit }, `library-${category}-${limit}`);
    },
    async getEpisodes(limit = 50) {
      return fetchFeed('/feed/episodes', { limit }, `episodes-${limit}`);
    },
    isDirectAudioUrl,
  };

  global.musicFeedService = api;
})(typeof window !== 'undefined' ? window : globalThis);
