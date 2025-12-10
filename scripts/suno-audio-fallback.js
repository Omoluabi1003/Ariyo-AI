(function () {
  const cache = new Map();
  const SUNO_HOST = /^https?:\/\/(?:cdn\d*\.)?suno\.com\//i;
  async function resolveSunoAudioSrc(src, timeoutMs = 2600) {
    if (!SUNO_HOST.test(src)) return src;
    if (cache.has(src)) return cache.get(src);
    const proxy = `/api/proxy-audio?url=${encodeURIComponent(src)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let resolved = proxy;
    try {
      const res = await fetch(src, { method: 'HEAD', mode: 'cors', cache: 'no-store', signal: controller.signal });
      if (res.ok) resolved = src;
    } catch (error) {
      console.warn('[suno-fallback] Direct Suno fetch failed, using proxy.', error);
    } finally {
      clearTimeout(timer);
    }
    cache.set(src, resolved);
    return resolved;
  }
  window.resolveSunoAudioSrc = resolveSunoAudioSrc;
})();
