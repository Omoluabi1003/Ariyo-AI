const { XMLParser } = require('fast-xml-parser');

const SOURCES = [
  {
    url: 'https://news.google.com/rss/search?q=Nigeria%20OR%20Nigerian&hl=en&gl=NG&ceid=NG:en',
    tag: 'Global Nigeria'
  },
  {
    url: 'https://news.google.com/rss/search?q=Nigerian%20diaspora%20OR%20Nigerians%20abroad&hl=en&gl=NG&ceid=NG:en',
    tag: 'Diaspora'
  },
  {
    url: 'https://news.google.com/rss/search?q=Nollywood%20OR%20Afrobeats%20OR%20Nigerian%20entertainment&hl=en&gl=NG&ceid=NG:en',
    tag: 'Entertainment NG'
  },
  {
    url: 'https://news.google.com/rss/search?q=Nigerian%20artists%20abroad%20OR%20Nigerian%20entertainers%20global&hl=en&gl=US&ceid=US:en',
    tag: 'Global Entertainment'
  },
  {
    url: 'https://guardian.ng/feed',
    tag: 'Guardian Nigeria'
  },
  {
    url: 'https://www.premiumtimesng.com/feed',
    tag: 'Premium Times'
  }
];

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80';
const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  attributeNamePrefix: '',
  textNodeName: 'text'
});

function decodeHtml(input = '') {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(html = '') {
  return decodeHtml(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getUrlFrom(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = getUrlFrom(item);
      if (nested) return nested;
    }
    return null;
  }
  if (typeof value === 'object') return value.url || value.href || null;
  return null;
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

function extractMediaContent(entry) {
  const media = toArray(entry['media:content'] || entry.media || []);
  if (!media.length) return null;

  const ranked = media
    .map(item => {
      const url = getUrlFrom(item);
      const width = Number(item.width || item['media:width'] || item['@_width'] || 0) || 0;
      const height = Number(item.height || item['media:height'] || item['@_height'] || 0) || 0;
      return { url, area: width * height };
    })
    .filter(item => Boolean(item.url))
    .sort((a, b) => b.area - a.area);

  return ranked[0]?.url || ranked.find(item => item.url)?.url || null;
}

function extractInlineImage(html = '') {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || null;
}

function findImage(entry, baseLink) {
  const inlineImage =
    extractInlineImage(entry['content:encoded']) || extractInlineImage(entry.description) || extractInlineImage(entry.summary);

  const candidates = [
    extractMediaContent(entry),
    getUrlFrom(entry.enclosure),
    getUrlFrom(entry.content),
    getUrlFrom(entry['media:thumbnail']),
    getUrlFrom(entry.image),
    inlineImage
  ];

  for (const candidate of candidates) {
    const resolved = resolveUrl(candidate, baseLink);
    if (resolved) return resolved;
  }

  return DEFAULT_IMAGE;
}

async function fetchOpenGraphImage(url) {
  if (!url) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AriyoAI-NewsFetcher/1.0' },
      redirect: 'follow'
    });

    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
      return null;
    }

    const html = await response.text();
    const metaMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    const twitterMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    const image = metaMatch?.[1] || twitterMatch?.[1];

    return resolveUrl(image, url);
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function parseDate(entry) {
  const raw = entry.pubDate || entry.published || entry.updated || entry.date || entry.createdAt;
  const parsed = new Date(raw || Date.now());
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}

function normalizeEntry(entry, tag) {
  const link = typeof entry.link === 'string' ? entry.link : entry.link?.href || entry.link?.[0]?.href;
  const title = decodeHtml(entry.title || 'Untitled');
  const summary = stripHtml(entry.description || entry.summary || entry.text || '');
  const publishedAt = parseDate(entry).toISOString();
  const id = link || `${title}-${publishedAt}`;

  return {
    id,
    url: link,
    title,
    summary: summary || title,
    image: findImage(entry, link) || DEFAULT_IMAGE,
    publishedAt,
    tag
  };
}

async function enrichImages(items) {
  const tasks = items.map(async (item) => {
    if (item.image && item.image !== DEFAULT_IMAGE) return item;

    const openGraph = await fetchOpenGraphImage(item.url);
    if (openGraph) {
      return { ...item, image: openGraph };
    }
    return item;
  });

  return Promise.all(tasks);
}

async function fetchFeed(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AriyoAI-NewsFetcher/1.0' }
    });

    if (!response.ok) {
      throw new Error(`Feed request failed with status ${response.status}`);
    }

    const xml = await response.text();
    const parsed = parser.parse(xml);
    const items =
      parsed?.rss?.channel?.item || parsed?.feed?.entry || parsed?.channel?.item || parsed?.entries || [];
    return toArray(items).map(item => normalizeEntry(item, source.tag));
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAllNews() {
  const feedResults = await Promise.allSettled(SOURCES.map(fetchFeed));
  const collected = feedResults
    .filter(result => result.status === 'fulfilled')
    .flatMap(result => result.value);

  const uniqueByUrl = new Map();
  collected.forEach(item => {
    const key = item.url || item.id;
    if (!uniqueByUrl.has(key)) {
      uniqueByUrl.set(key, item);
    }
  });

  const uniqueItems = Array.from(uniqueByUrl.values())
    .filter(item => item.title && item.summary)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 30);

  return enrichImages(uniqueItems);
}

module.exports = async (req, res) => {
  if (req.method && req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end('Method Not Allowed');
    return;
  }

  try {
    const news = await fetchAllNews();
    res.statusCode = 200;
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(news));
  } catch (error) {
    console.error('Failed to load live news', error);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unable to fetch live Naija news right now.' }));
  }
};
