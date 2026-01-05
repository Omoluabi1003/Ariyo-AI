const { Readable } = require('node:stream');
const dns = require('node:dns').promises;
const net = require('node:net');

const ALLOW_HOSTS = [
  /\.suno\.(?:ai|com)$/i,
  /cdn\d*\.suno\.(?:ai|com)$/i,
  /raw\.githubusercontent\.com$/i,
  /githubusercontent\.com$/i,
  /github\.io$/i,
  /cloudfront\.net$/i,
  /anchor\.fm$/i,
  /agidigbostream\.com\.ng$/i,
  /asurahosting\.com$/i,
  /instainternet\.com$/i,
  /mixlr\.com$/i,
  /fastcast4u\.com$/i,
  /wnyc\.org$/i,
  /webgateready\.com$/i,
  /alonhosting\.com$/i,
  /infomaniak\.ch$/i,
  /radioca\.st$/i,
  /servoserver\.com\.ng$/i,
  /radionigeria\.gov\.ng$/i,
  /ubc\.go\.ug$/i,
  /listen2myradio\.com$/i,
  /hearthis\.at$/i,
  /rcast\.net$/i,
  /gotright\.net$/i,
  /ifastekpanel\.com$/i,
  /radiorelax\.ua$/i,
  /ihrhls\.com$/i,
  /bbcmedia\.co\.uk$/i,
  /streaming\.faajifmradio\.com$/i,
  /myradiostream\.com$/i,
  /musicradio\.com$/i,
  /tunein\.cdnstream1\.com$/i,
  /getaj\.net$/i,
  /rte\.ie$/i,
  /virginradio\.co\.uk$/i,
  /talksport\.com$/i,
  /galcom\.org$/i,
  /streamguys1\.com$/i,
  /streamtheworld\.com$/i,
  /radio\.co$/i,
  /zeno\.fm$/i,
  /akamaized\.net$/i,
  /mystreaming\.net$/i,
  /securenetsystems\.net$/i,
  /streamonkey\.net$/i,
  /radio12345\.com$/i,
  /capitalfm\.co\.ke$/i,
  /radio\.co\.za$/i,
  /mediahubaustralia\.com$/i,
  /radio\.tunein\.com$/i
];
const DENY_HOSTS = [
  /^localhost$/i,
  /\.local$/i,
  /\.internal$/i
];
const ALLOW_ALL_PUBLIC_HOSTS = true;
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_CONTENT_LENGTH = 10 * 1024 * 1024;

function isAllowedHost(url) {
  if (DENY_HOSTS.some(rule => rule.test(url.hostname))) {
    return false;
  }
  if (ALLOW_HOSTS.some(rule => rule.test(url.hostname))) {
    return true;
  }
  return ALLOW_ALL_PUBLIC_HOSTS;
}

function isPrivateIp(ip) {
  if (!ip) return false;
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(part => parseInt(part, 10));
    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80');
  }
  return false;
}

async function resolvesToPrivateIp(hostname) {
  if (!hostname) return true;
  if (net.isIP(hostname)) {
    return isPrivateIp(hostname);
  }
  try {
    const results = await dns.lookup(hostname, { all: true });
    return results.some(result => isPrivateIp(result.address));
  } catch (error) {
    return true;
  }
}

module.exports = async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    res.end('Method Not Allowed');
    return;
  }

  const target = req.query?.url;
  if (!target) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing url' }));
    return;
  }

  let url;
  try {
    url = new URL(String(target));
  } catch (error) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Invalid url' }));
    return;
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Invalid protocol' }));
    return;
  }

  if (!isAllowedHost(url)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Host not allowed' }));
    return;
  }

  if (await resolvesToPrivateIp(url.hostname)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Blocked host' }));
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = {};

  if (req.headers?.range) {
    headers.Range = req.headers.range;
  }

  const method = req.method === 'HEAD' ? 'HEAD' : 'GET';

  try {
    let upstream = await fetch(url.toString(), {
      method,
      headers,
      signal: controller.signal,
      redirect: 'follow'
    });

    if (!upstream.ok && method === 'HEAD') {
      upstream = await fetch(url.toString(), { headers, signal: controller.signal, redirect: 'follow' });
    }

    if (!upstream.ok && upstream.status !== 206) {
      res.statusCode = upstream.status || 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Upstream error' }));
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
    const contentRange = upstream.headers.get('content-range');
    const contentLength = upstream.headers.get('content-length');
    const isLiveStream = !contentLength && !contentRange;

    if (contentLength && Number(contentLength) > MAX_CONTENT_LENGTH && !contentRange && req.method !== 'HEAD') {
      res.statusCode = 413;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Response too large' }));
      return;
    }

    res.statusCode = upstream.status;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', isLiveStream ? 'no-store' : 'public, max-age=60');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Proxy-Upstream', upstream.url || url.toString());
    res.setHeader('X-Proxy-Status', String(upstream.status));
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (contentLength) res.setHeader('Content-Length', contentLength);

    if (req.method === 'HEAD') {
      res.end();
    } else if (upstream.body && typeof upstream.body.getReader === 'function') {
      const nodeStream = Readable.fromWeb(upstream.body);
      nodeStream.pipe(res);
    } else {
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.end(buffer);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      res.statusCode = 504;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Proxy timeout' }));
    } else {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Proxy failure', detail: error.message }));
    }
  } finally {
    clearTimeout(timer);
  }
};
