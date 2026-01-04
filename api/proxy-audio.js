const { Readable } = require('node:stream');

const ALLOW = [
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
  /securenetsystems\.net$/i
];
const REQUEST_TIMEOUT_MS = 25_000;

function isAllowedHost(url) {
  return ALLOW.some(rule => rule.test(url.hostname));
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

  if (!isAllowedHost(url)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Host not allowed' }));
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
      signal: controller.signal
    });

    if (!upstream.ok && method === 'HEAD') {
      // Some hosts reject HEAD requests; retry with GET so health checks still work.
      upstream = await fetch(url.toString(), { headers, signal: controller.signal });
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

    res.statusCode = upstream.status;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', isLiveStream ? 'no-store' : 'public, max-age=3600');
    res.setHeader('Accept-Ranges', 'bytes');
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
