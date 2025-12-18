const { XMLParser } = require('fast-xml-parser');

const SOURCES = [
  {
    url: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
    tag: 'Global Headlines'
  },
  {
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    tag: 'BBC World'
  },
  {
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    tag: 'NYT World'
  },
  {
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    tag: 'Al Jazeera'
  },
  {
    url: 'https://apnews.com/hub/ap-top-news?output=rss',
    tag: 'AP Top News'
  },
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

const DEFAULT_IMAGE = '/img/news-fallback.svg';
const KEYWORD_STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'for',
  'with',
  'without',
  'from',
  'in',
  'on',
  'at',
  'to',
  'by',
  'about',
  'after',
  'before',
  'this',
  'that',
  'these',
  'those',
  'is',
  'are',
  'was',
  'were',
  'be',
  'being',
  'been',
  'it',
  'its',
  'as',
  'news',
  'update',
  'story'
]);
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

function unwrapGoogleNewsUrl(url) {
  const resolved = resolveUrl(url);
  if (!resolved) return null;

  try {
    const parsed = new URL(resolved);
    if (!parsed.hostname.endsWith('news.google.com')) return resolved;

    const candidateParams = ['url', 'u', 'link'];
    for (const key of candidateParams) {
      const candidate = resolveUrl(parsed.searchParams.get(key));
      if (candidate) return candidate;
    }

    const decodedPath = decodeURIComponent(`${parsed.pathname}${parsed.search}${parsed.hash}`);
    const embeddedMatch = decodedPath.match(/https?:\/\/(?!news\.google\.com)[^\s]+/);
    if (embeddedMatch) {
      const embedded = resolveUrl(embeddedMatch[0]);
      if (embedded) return embedded;
    }

    const encodedSegment = parsed.pathname.split('/').pop();
    if (encodedSegment) {
      try {
        const cleanSegment = encodedSegment
          .replace(/-/g, '+')
          .replace(/_/g, '/')
          .replace(/[^A-Za-z0-9+/=]/g, '');
        const padding = (4 - (cleanSegment.length % 4)) % 4;
        const paddedSegment = cleanSegment.padEnd(cleanSegment.length + padding, '=');
        const decoded = Buffer.from(paddedSegment, 'base64').toString('utf8');
        const decodedMatch = decoded.match(/https?:\/\/(?!news\.google\.com)[^\s]+/);
        if (decodedMatch) {
          const cleanedMatch = decodedMatch[0].replace(/[\uFFFD\u0000-\u001F]+$/g, '');
          const decodedUrl = resolveUrl(cleanedMatch);
          if (decodedUrl) return decodedUrl;
        }
      } catch (error) {
        // ignore invalid base64
      }
    }

    return resolved;
  } catch (error) {
    return resolved;
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
  const link = unwrapGoogleNewsUrl(
    typeof entry.link === 'string' ? entry.link : entry.link?.href || entry.link?.[0]?.href
  );
  const title = decodeHtml(entry.title || 'Untitled');
  const summary = stripHtml(entry.description || entry.summary || entry.text || '');
  const publishedAt = parseDate(entry).toISOString();
  const id = link || `${title}-${publishedAt}`;
  const image = findImage(entry, link) || DEFAULT_IMAGE;

  return {
    id,
    url: link,
    title,
    summary: summary || title,
    image,
    publishedAt,
    tag
  };
}

function extractKeywords(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(token => !KEYWORD_STOPWORDS.has(token));
}

function hashColor(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 62%, 52%)`;
}

function buildKeywordImage(item) {
  const keywords = new Set();

  [item.title, item.summary, item.tag]
    .filter(Boolean)
    .forEach(text => {
      extractKeywords(text).forEach(token => keywords.add(token));
    });

  if (!keywords.size) return null;

  const topKeywords = Array.from(keywords).slice(0, 4);
  const theme = hashColor(topKeywords.join('-') || 'naija-news');
  const headline = (item.title || 'Naija Vibes').slice(0, 70);
  const tags = topKeywords.join(' • ') || 'Naija Vibes';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" role="img" aria-label="${headline}">
      <defs>
        <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="${theme}" stop-opacity="0.95" />
          <stop offset="100%" stop-color="${theme}" stop-opacity="0.6" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#bg)" />
      <circle cx="1040" cy="160" r="120" fill="rgba(255,255,255,0.18)" />
      <text x="72" y="200" font-family="'Montserrat', 'Manrope', system-ui" font-size="58" font-weight="700" fill="#fff" opacity="0.95">
        Naija Vibes News
      </text>
      <text x="72" y="300" font-family="'Manrope', 'Inter', system-ui" font-size="42" font-weight="600" fill="#fff" opacity="0.9">
        ${headline.replace(/"/g, '\\"')}
      </text>
      <text x="72" y="380" font-family="'Manrope', 'Inter', system-ui" font-size="30" font-weight="500" fill="rgba(255,255,255,0.9)">
        ${tags}
      </text>
      <text x="72" y="470" font-family="'Manrope', 'Inter', system-ui" font-size="26" font-weight="600" fill="rgba(255,255,255,0.75)">
        Instant playback • Always with artwork • ${new Date().getFullYear()}
      </text>
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

async function enrichImages(items) {
  const tasks = items.map(async (item) => {
    if (item.image && item.image !== DEFAULT_IMAGE) return item;

    const openGraph = await fetchOpenGraphImage(item.url);
    if (openGraph) {
      return { ...item, image: openGraph };
    }

    const keywordImage = buildKeywordImage(item);
    if (keywordImage) {
      return { ...item, image: keywordImage };
    }

    return { ...item, image: item.image || DEFAULT_IMAGE };
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

module.exports.unwrapGoogleNewsUrl = unwrapGoogleNewsUrl;
module.exports.findImage = findImage;
module.exports.normalizeEntry = normalizeEntry;
module.exports.buildKeywordImage = buildKeywordImage;
module.exports.DEFAULT_IMAGE = DEFAULT_IMAGE;
