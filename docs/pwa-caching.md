# PWA caching (Workbox + Vite)

The project uses `vite-plugin-pwa` to generate a Workbox-powered service worker.

## Registration

Service worker registration is handled via `scripts/pwa-register.js` using `virtual:pwa-register`.

## Default strategies

- **App shell assets (JS/CSS/images/fonts):** `CacheFirst` for fast repeat visits.
- **API JSON (`/api/*`):** `StaleWhileRevalidate` to keep metadata fresh while serving cached results.
- **Audio streams:** `NetworkFirst` for live endpoints to prioritize real-time playback.
- **Track MP3s:** `CacheFirst` with bounded cache size for repeat listening.

## Offline support

`offline.html` is used as the navigation fallback for offline visits.

## Notes

- Keep cache sizes bounded in `vite.config.js` to avoid unbounded storage growth.
- If you change API routes, update the runtime caching patterns accordingly.
