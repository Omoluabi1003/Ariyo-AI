# Suno CDN smart fallback

## 1) Drop-in client helper (40 lines)
```html
<!-- Load once before any player code -->
<script src="/scripts/suno-audio-fallback.js"></script>
```

```js
// Usage: always feed the original src. Local assets remain untouched.
const finalUrl = await window.resolveSunoAudioSrc(originalSrc);
```

## 2) Server-side proxy endpoints

### a) Next.js 14+ App Router — `app/api/proxy-audio/route.ts`
```ts
import { NextRequest, NextResponse } from 'next/server';

const ALLOW = [/\.suno\.com$/i];
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAllowed(url: URL) {
  return ALLOW.some(rule => rule.test(url.hostname));
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url');
  if (!target) return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  const url = new URL(target);
  if (!isAllowed(url)) return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });

  const range = req.headers.get('range') || undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(url.toString(), { headers: range ? { range } : {}, signal: controller.signal });
    if (!res.ok && res.status !== 206) return NextResponse.json({ error: 'Upstream error' }, { status: res.status });
    const headers = new Headers(res.headers);
    headers.set('Content-Type', 'audio/mpeg');
    headers.set('Cache-Control', 'public, max-age=3600');
    if (range) headers.set('Accept-Ranges', 'bytes');
    return new NextResponse(res.body, { status: res.status, statusText: res.statusText, headers });
  } finally {
    clearTimeout(timeout);
  }
}
```

### b) Node.js + Express
```js
import express from 'express';
import { pipeline } from 'stream';
import { promisify } from 'util';
const app = express();
const pipe = promisify(pipeline);
const ALLOW = [/\.suno\.com$/i];

app.get('/api/proxy-audio', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).json({ error: 'Missing url' });
  const url = new URL(String(target));
  if (!ALLOW.some(rule => rule.test(url.hostname))) return res.status(403).json({ error: 'Host not allowed' });

  const range = req.headers.range;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const upstream = await fetch(url, { headers: range ? { range } : {}, signal: controller.signal });
    if (!upstream.ok && upstream.status !== 206) return res.status(upstream.status).json({ error: 'Upstream error' });

    res.status(upstream.status);
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Accept-Ranges', 'bytes');
    if (upstream.headers.get('content-range')) res.set('Content-Range', upstream.headers.get('content-range'));
    await pipe(upstream.body, res);
  } catch (error) {
    if (error.name === 'AbortError') return res.status(504).json({ error: 'Timeout' });
    res.status(502).json({ error: 'Proxy failure' });
  } finally {
    clearTimeout(timer);
  }
});
```

### c) Python FastAPI
```py
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
import httpx, re

app = FastAPI()
ALLOW = re.compile(r"\.suno\.com$", re.IGNORECASE)

def is_allowed(url: str) -> bool:
    return bool(ALLOW.search(httpx.URL(url).host))

@app.get('/api/proxy-audio')
async def proxy_audio(request: Request, url: str):
    if not url:
        raise HTTPException(status_code=400, detail='Missing url')
    if not is_allowed(url):
        raise HTTPException(status_code=403, detail='Host not allowed')

    headers = {}
    if 'range' in request.headers:
        headers['Range'] = request.headers['range']

    timeout = httpx.Timeout(25.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        try:
            upstream = await client.get(url, headers=headers)
        except httpx.RequestError as exc:
            raise HTTPException(status_code=504, detail=str(exc))

    if upstream.status_code not in (200, 206):
        raise HTTPException(status_code=upstream.status_code, detail='Upstream error')

    response_headers = {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes'
    }
    if upstream.headers.get('content-range'):
        response_headers['Content-Range'] = upstream.headers['content-range']

    return StreamingResponse(upstream.aiter_raw(), status_code=upstream.status_code, headers=response_headers)
```

### d) Cloudflare Worker (streaming, Range-aware)
```js
const ALLOW = [/\.suno\.com$/i];

function isAllowed(url) {
  return ALLOW.some(rule => rule.test(url.hostname));
}

export default {
  async fetch(request, env, ctx) {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('url');
    if (!target) return new Response('Missing url', { status: 400 });
    const url = new URL(target);
    if (!isAllowed(url)) return new Response('Host not allowed', { status: 403 });

    const range = request.headers.get('range') || undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);
    try {
      const upstream = await fetch(url.toString(), { headers: range ? { range } : {}, signal: controller.signal });
      if (!upstream.ok && upstream.status !== 206) return new Response('Upstream error', { status: upstream.status });
      const headers = new Headers(upstream.headers);
      headers.set('Content-Type', 'audio/mpeg');
      headers.set('Cache-Control', 'public, max-age=3600');
      headers.set('Accept-Ranges', 'bytes');
      return new Response(upstream.body, { status: upstream.status, headers });
    } catch (error) {
      const status = error.name === 'AbortError' ? 504 : 502;
      return new Response('Proxy failure', { status });
    } finally {
      clearTimeout(timer);
    }
  }
};
```

## 3) Usage examples
```html
<!-- Native audio -->
<audio controls preload="none" id="demoAudio"></audio>
<script>
  const original = 'https://cdn.suno.com/your-track.mp3';
  window.resolveSunoAudioSrc(original).then(url => {
    const player = document.getElementById('demoAudio');
    player.src = url;
    player.load();
  });
</script>
```

```js
// Howler.js
import { Howl } from 'howler';
const original = 'https://cdn1.suno.com/your-track.mp3';
const url = await window.resolveSunoAudioSrc(original);
const sound = new Howl({ src: [url], html5: true });
sound.play();
```

```jsx
// React-Player
import ReactPlayer from 'react-player';
const [url, setUrl] = useState();
useEffect(() => { window.resolveSunoAudioSrc(original).then(setUrl); }, [original]);
return <ReactPlayer url={url || original} controls playing />;
```

Local assets (`/audio/song.mp3`, `/static/tracks/local.mp3`, `https://myapp.com/assets/xyz.mp3`) are returned untouched and still load directly. Only blocked Suno CDN links auto-switch to `/api/proxy-audio?url=…` after a failed 2–3s probe.
