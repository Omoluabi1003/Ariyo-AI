# Audio Engine (Howler.js)

## Overview
The music player uses a single, global Howler.js instance for playback. The engine lives in
`apps/music-player/lib/audio/engine.js` and exposes a small API so the UI can load tracks
and live streams without managing audio elements directly.

Key traits:
- One `Howl` instance at a time (tracks and streams are mutually exclusive).
- Tracks preload, streams do not.
- Previous audio is always stopped/unloaded before loading a new source.
- Playback errors are logged as warnings and surfaced to the UI without crashing.
- A single play retry is attempted after an unlock gesture (mobile Safari behavior).

## API
The engine is attached to `window.audioEngine` and provides:

- `loadTrack({ id, url, title, artist, artwork })`
- `loadStream({ id, url, title, region })`
- `play()`
- `pause()`
- `stop()`
- `seek(seconds)`
- `setVolume(value)`
- `mute(isMuted)`
- `getState()` → `idle | loading | playing | paused | error`
- `isLive()` → `true` for streams
- `teardown()`
- `getDuration()` → seconds (helper used by the UI)

## UI Wiring
The UI (see `apps/music-player/music-player.js`) calls the engine directly:
- Play/pause/stop buttons map to `play()`, `pause()`, and `stop()`.
- Track clicks call `loadTrack(...)` and then `play()`.
- Live radio stations call `loadStream(...)` and then `play()`.
- The seek bar calls `seek()` for on-demand tracks only.

The engine emits browser events for state changes and lifecycle hooks:
- `audioengine:state`
- `audioengine:loaded`
- `audioengine:ended`
- `audioengine:error`

These events keep the UI in sync with buffering, progress updates, and track transitions.
