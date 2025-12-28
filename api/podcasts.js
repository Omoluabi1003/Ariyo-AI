const { XMLParser } = require('fast-xml-parser');

const FEEDS = [
  { url: 'https://feed.podbean.com/djcruze/feed.xml', category: 'Hip Hop / American Rap' },
  { url: 'https://feeds.buzzsprout.com/1879513.rss', category: 'Hip Hop / American Rap' },
  { url: 'https://rss.com/podcasts/hip-hop-talking-heads/feed/', category: 'Hip Hop / American Rap' },
  { url: 'https://feeds.buzzsprout.com/217281.rss', category: 'Afrobeat' },
  { url: 'https://feeds.soundcloud.com/users/soundcloud:users:211411884/sounds.rss', category: 'Afrobeat' },
  { url: 'https://anchor.fm/s/31f26724/podcast/rss', category: 'Afrobeat' },
  { url: 'https://www.spreaker.com/show/2572192/episodes/feed', category: 'Pop' },
  { url: 'https://feeds.simplecast.com/TzbxCT1l', category: 'Pop' },
  { url: 'https://rss.art19.com/pop-apologists', category: 'Pop' }
];

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/x-m4a',
  'audio/mp4',
  'audio/aac',
  'audio/m4a'
]);
const CACHE_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours, within the required 6–24 hour window.

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  attributeNamePrefix: '',
  textNodeName: 'text'
});

const feedCache = {
  timestamp: 0,
  payload: null
};

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function truncateTitle(title = '') {
  const clean = String(title).trim();
  return clean.length > 120 ? `${clean.slice(0, 117).trim()}...` : clean;
}

function stripHtml(html = '') {
  return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function clampDescription(text = '') {
  if (!text) return '';
  const clean = stripHtml(text);
  return clean.length > 260 ? `${clean.slice(0, 257).trim()}...` : clean;
}

function parseDuration(value) {
  if (value == null) return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed);
    }

    const parts = trimmed.split(':').map(Number);
    if (parts.every(num => Number.isFinite(num))) {
      const [h, m, s] = parts.length === 3
        ? parts
        : parts.length === 2
          ? [0, parts[0], parts[1]]
          : [0, 0, parts[0]];
      return (h * 3600) + (m * 60) + s;
    }
  }

  return null;
}

function durationFromEnclosure(enclosure = {}) {
  const bytes = Number(enclosure.length);
  if (!Number.isFinite(bytes) || bytes <= 0) return null;

  // Assume a conservative 128kbps bitrate when duration metadata is missing.
  const seconds = Math.round((bytes * 8) / 128000);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

function resolveUrl(url, base) {
  if (!url) return null;
  try {
    const normalized = url.startsWith('//') ? `https:${url}` : url;
    const resolved = new URL(normalized, base || undefined);
    if (resolved.protocol === 'http:') {
      resolved.protocol = 'https:';
    }
    return resolved.toString();
  } catch (error) {
    return null;
  }
}

function extractEnclosure(entry = {}) {
  if (entry.enclosure) {
    const enclosure = entry.enclosure;
    return {
      url: resolveUrl(enclosure.url || enclosure.href),
      type: enclosure.type
    };
  }

  const mediaContent = entry['media:content'] || entry.mediaContent;
  if (mediaContent) {
    const content = Array.isArray(mediaContent) ? mediaContent[0] : mediaContent;
    return {
      url: resolveUrl(content.url || content.src),
      type: content.type
    };
  }

  const atomLinks = toArray(entry.link).filter(link => link.rel === 'enclosure');
  if (atomLinks.length) {
    return {
      url: resolveUrl(atomLinks[0].href || atomLinks[0].url),
      type: atomLinks[0].type
    };
  }

  return null;
}

function extractArtwork(entry = {}, fallback) {
  const itunesImage = entry['itunes:image'] || entry.itunesImage;
  if (itunesImage && (itunesImage.href || itunesImage.url)) {
    return resolveUrl(itunesImage.href || itunesImage.url);
  }

  const mediaThumbnail = entry['media:thumbnail'] || entry.mediaThumbnail;
  if (mediaThumbnail) {
    const thumb = Array.isArray(mediaThumbnail) ? mediaThumbnail[0] : mediaThumbnail;
    if (thumb.url) {
      return resolveUrl(thumb.url);
    }
  }

  return fallback || null;
}

function normalizeEntry(entry, feedMeta) {
  const enclosure = extractEnclosure(entry);
  if (!enclosure || !enclosure.url) return null;

  const type = (enclosure.type || '').toLowerCase();
  const isAllowedType = ALLOWED_AUDIO_TYPES.has(type) || (!type && /\.(mp3|m4a)($|\?)/i.test(enclosure.url));
  if (!isAllowedType) return null;

  const title = truncateTitle(entry.title || entry['media:title'] || entry['itunes:title'] || 'Untitled Episode');
  const duration = parseDuration(entry['itunes:duration'] || entry.itunesDuration || entry.duration)
    || durationFromEnclosure(entry.enclosure);
  const artwork = extractArtwork(entry, feedMeta.artwork);
  const description = clampDescription(entry.description || entry.summary || entry['media:description']);

  return {
    id: entry.guid && entry.guid.text ? entry.guid.text : entry.guid || enclosure.url,
    title,
    audioUrl: enclosure.url,
    duration,
    artwork,
    description,
    publishedAt: entry.pubDate || entry.published || entry.updated || null,
    source: feedMeta.title,
    category: feedMeta.category,
    feedId: feedMeta.id,
    feedArtwork: feedMeta.artwork
  };
}

function parseFeed(xml, url, category) {
  const document = parser.parse(xml);
  const channel = document?.rss?.channel || document?.feed;
  if (!channel) {
    return {
      tracks: [],
      collection: { id: url, category, title: new URL(url).hostname, artwork: null }
    };
  }

  const feedTitle = channel.title?.text || channel.title || new URL(url).hostname;
  const items = toArray(channel.item || channel.entry || []);
  const fallbackArtwork = extractArtwork(channel, null);
  const feedMeta = { id: url, category, title: feedTitle, artwork: fallbackArtwork };

  return {
    tracks: items
      .map(item => normalizeEntry(item, feedMeta))
      .filter(Boolean),
    collection: feedMeta
  };
}

async function fetchFeed(url, category) {
  const response = await fetch(url, { headers: { 'User-Agent': 'AriyoAI-RSS/1.0' } });
  if (!response.ok) {
    throw new Error(`Feed request failed: ${response.status}`);
  }
  const xml = await response.text();
  return parseFeed(xml, url, category);
}

async function fetchAllFeeds() {
  if (feedCache.payload && (Date.now() - feedCache.timestamp) < CACHE_WINDOW_MS) {
    return feedCache.payload;
  }

  const results = await Promise.allSettled(FEEDS.map(feed => fetchFeed(feed.url, feed.category)));

  const tracks = [];
  const collections = [];

  results.forEach(result => {
    if (result.status !== 'fulfilled') return;
    const { tracks: feedTracks = [], collection } = result.value || {};
    if (collection) {
      collections.push(collection);
    }
    feedTracks.forEach(track => tracks.push(track));
  });

  const sortedTracks = tracks
    .filter(Boolean)
    .sort((a, b) => {
      const aDate = new Date(a.publishedAt || 0).getTime();
      const bDate = new Date(b.publishedAt || 0).getTime();
      return bDate - aDate;
    })
    .slice(0, 120);

  feedCache.payload = { tracks: sortedTracks, collections, fetchedAt: new Date().toISOString() };
  feedCache.timestamp = Date.now();

  return feedCache.payload;
}

module.exports = async (req, res) => {
  if (req.method && req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end('Method Not Allowed');
    return;
  }

  try {
    const payload = await fetchAllFeeds();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=21600');
    res.end(JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to ingest podcast feeds', error);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ tracks: [], error: 'Unable to load podcast feeds right now.' }));
  }
};
