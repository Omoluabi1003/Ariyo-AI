const { unwrapGoogleNewsUrl, findImage, DEFAULT_IMAGE, buildKeywordImage } = require('../api/news');

const buildEntryWithMedia = (media = []) => ({
  media
});

describe('Google News link handling', () => {
  test('extracts canonical URL from explicit url parameter', () => {
    const target = 'https://example.com/news/naija-story?ref=direct';
    const wrapped =
      'https://news.google.com/rss/articles/CBMiSmh0dHBzOi8vbmV3cy5nb29nbGUuY29tL3Jzcy9hcnRpY2xlcz9vYz01JnVybD1odHRwcyUzQSUyRiUyRmV4YW1wbGUuY29tJTJGbmvigJlpYS1zdG9yeSUzRnJlZiUzRGRpcmVjdA?oc=5&url=' +
      encodeURIComponent(target);

    expect(unwrapGoogleNewsUrl(wrapped)).toBe(target);
  });

  test('unwraps embedded article links from Google News paths', () => {
    const canonical = 'https://example.com/entertainment/afrobeats-story.html?amp=true';
    const wrapped =
      'https://news.google.com/rss/articles/CBMiSmh0dHBzOi8vZXhhbXBsZS5jb20vZW50ZXJ0YWlubWVudC9hZnJvYmVhdHMtc3RvcnkuaHRtbD9hbXA9dHJ1ZdIBAA?oc=5';

    expect(unwrapGoogleNewsUrl(wrapped)).toBe(canonical);
  });

  test('returns non-Google links untouched', () => {
    const direct = 'https://guardian.ng/politics/ahead-of-2025';
    expect(unwrapGoogleNewsUrl(direct)).toBe(direct);
  });
});

describe('image selection', () => {
  test('prefers the largest media item and upgrades to https', () => {
    const entry = buildEntryWithMedia([
      { url: 'http://cdn.example.com/small.jpg', width: 400, height: 200 },
      { url: 'http://cdn.example.com/large.jpg', width: 1200, height: 800 },
      { url: 'http://cdn.example.com/medium.jpg', width: 800, height: 600 }
    ]);

    expect(findImage(entry)).toBe('https://cdn.example.com/large.jpg');
  });

  test('falls back to the default image when none are available', () => {
    const entry = { description: '<p>No media here</p>' };
    expect(findImage(entry)).toBe(DEFAULT_IMAGE);
  });
});

describe('keyword-based fallbacks', () => {
  test('builds a keyword-focused image URL from story context', () => {
    const item = {
      title: 'Nigerian tech founders expand hubs in Lagos',
      summary: 'Investors back new innovation centers across the city.',
      tag: 'Global Nigeria'
    };

    const keywordUrl = buildKeywordImage(item);

    expect(keywordUrl).toContain('source.unsplash.com/featured/1200x800?');
    const query = decodeURIComponent(keywordUrl.split('?')[1]);
    expect(query).toContain('nigerian');
    expect(query).toContain('lagos');
  });
});
