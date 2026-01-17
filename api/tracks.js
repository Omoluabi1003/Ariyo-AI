const { buildTrackManifest } = require('./media-library');

let cachedPayload = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

module.exports = async (_req, res) => {
  const now = Date.now();
  if (!cachedPayload || now - cachedAt > CACHE_TTL_MS) {
    cachedPayload = buildTrackManifest();
    cachedAt = now;
  }

  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  res.status(200).json(cachedPayload);
};
