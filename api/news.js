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

function findImage(entry) {
  if (entry.enclosure?.url) return entry.enclosure.url;
  if (entry.content?.url) return entry.content.url;
  if (entry['media:content']?.url) return entry['media:content'].url;
  if (entry.image?.url) return entry.image.url;

  const description = entry.description || entry.summary || '';
  const match = description.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && match[1]) return match[1];

  return DEFAULT_IMAGE;
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
    image: findImage(entry),
    publishedAt,
    tag
  };
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

  return Array.from(uniqueByUrl.values())
    .filter(item => item.title && item.summary)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 30);
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
