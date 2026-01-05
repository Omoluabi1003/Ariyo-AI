# Radio Stream Status Troubleshooting (Ariyò AI)

## Summary (PR-style)
**What was broken**
- Radio stations were marked **Offline** when streams were actually reachable. The status probe only listened for `canplay` and treated timeouts as failures, so slow HLS/MP3 streams and playlist endpoints frequently fell into the offline state.
- Playlist URLs (`.pls`, `.m3u`) were never resolved to an actual stream, so the probe often checked a text playlist and called it offline.
- Mixed-content and CORS edge cases were not classified correctly, so a blocked probe looked identical to a true outage.

**What changed**
- **scripts/player.js**
  - Replaced the single `canplay` probe with a robust pipeline: playlist resolution → audio probe (`loadedmetadata`/`canplay`) → range GET fallback.
  - Classified results into **Online**, **Offline**, or **Unavailable** (CORS/mixed-content/unsupported) instead of conflating timeouts with outages.
  - Added short-lived **in-memory status caching** (3 minutes) and debounced concurrent probes.
  - Added dev-only **radio debug panel** and non-production instrumentation logs.
- **api/radio/proxy.js**
  - New secure proxy endpoint for radio streams and playlist resolution, with SSRF protection (HTTP/S only, deny localhost/private IPs), range support, and short cache headers.
- **service-worker.js**
  - Ensured radio proxy requests bypass Workbox runtime caching.
- **scripts/radioStations.ts**
  - Kept the dev-only validation helper aligned with the new probe/playlist logic.
- **style.css**
  - Minimal styling for the debug panel.

**How to test**
1. Local dev: `npm run dev` → open `http://localhost:5173/main.html`.
2. Open **Radio Stations** and confirm statuses:
   - Known working stations should show **Online** quickly.
   - CORS/mixed-content edge cases should show **Unavailable**, not **Offline**.
3. Enable diagnostics: add `?radioDebug=1` to the URL to see per-station timing and resolved URLs.
4. Vercel: deploy and validate a mix of HTTP and HTTPS stations. The proxy should serve HTTP stations over HTTPS without mixed-content errors.

**Known gaps**
- Stations whose codecs are not supported by the browser will appear **Unavailable** (e.g., HLS in non-Safari browsers without MSE). Playback still works where the browser supports the stream.
