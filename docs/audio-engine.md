# Audio engine (Howler.js)

This app uses a single Howler.js-backed engine for playback to avoid duplicate audio instances and to keep UI state consistent across actions.

## Location

`apps/music-player/lib/audio/engine.js`

## API

```js
audioEngine.loadTrack({ id, url, title, artist, artwork });
audioEngine.loadStream({ id, url, title, region, artwork });
audioEngine.play();
audioEngine.pause();
audioEngine.stop();
audioEngine.seek(seconds); // no-op when live
audioEngine.setVolume(value); // 0..1
audioEngine.mute(true);
audioEngine.getSnapshot();
```

### Snapshot shape

```json
{
  "status": "idle|loading|playing|paused|error",
  "isLive": false,
  "seek": 0,
  "duration": 0,
  "volume": 1,
  "muted": false,
  "currentId": null,
  "error": null
}
```

## Events

Subscribe to engine events using `on`/`off`:

```js
audioEngine.on('state', ({ status }) => {});
audioEngine.on('time', ({ seek, duration }) => {});
audioEngine.on('end', () => {});
audioEngine.on('error', ({ type, error }) => {});
audioEngine.on('sourcechange', ({ id, url, type }) => {});
```

`time` updates emit approximately every 250ms while playing.

## Notes

- Tracks preload to allow quick scrubbing and metadata updates.
- Live streams skip preloading and disable seek operations.
- The engine stops and unloads the active Howl before switching sources to prevent ghost audio.
