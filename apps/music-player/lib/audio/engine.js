import { Howl, Howler } from 'howler';

const TIME_UPDATE_INTERVAL_MS = 250;

class AudioEngine {
  constructor() {
    this.howl = null;
    this.status = 'idle';
    this.isLive = false;
    this.volume = 1;
    this.muted = false;
    this.currentId = null;
    this.error = null;
    this.retryUnlock = false;
    this.timeInterval = null;
    this.listeners = new Map();

    if (Howler) {
      Howler.autoUnlock = true;
    }
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
  }

  off(event, handler) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  emit(event, detail) {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    handlers.forEach(handler => handler(detail));
  }

  setStatus(nextStatus, detail = {}) {
    this.status = nextStatus;
    if (nextStatus !== 'error') {
      this.error = null;
    }
    this.emit('state', { status: this.status, ...detail });
  }

  clearTimeInterval() {
    if (this.timeInterval) {
      window.clearInterval(this.timeInterval);
      this.timeInterval = null;
    }
  }

  startTimeInterval() {
    if (this.timeInterval) return;
    this.timeInterval = window.setInterval(() => {
      if (!this.howl || this.status !== 'playing') return;
      this.emit('time', {
        seek: this.seek(),
        duration: this.getDuration(),
      });
    }, TIME_UPDATE_INTERVAL_MS);
  }

  teardownHowl() {
    this.clearTimeInterval();
    if (!this.howl) return;
    try {
      this.howl.stop();
    } catch (error) {
      console.warn('[audio-engine] stop failed', error);
    }
    try {
      this.howl.unload();
    } catch (error) {
      console.warn('[audio-engine] unload failed', error);
    }
    this.howl = null;
  }

  buildHowl({ url, preload }) {
    this.teardownHowl();
    this.retryUnlock = false;

    this.howl = new Howl({
      src: [url],
      html5: true,
      preload,
      volume: this.volume,
      mute: this.muted,
      onload: () => {
        if (this.status === 'loading') {
          this.setStatus('paused');
        }
        this.emit('time', { seek: this.seek(), duration: this.getDuration() });
      },
      onplay: () => {
        this.setStatus('playing');
        this.startTimeInterval();
      },
      onpause: () => {
        this.setStatus('paused');
        this.clearTimeInterval();
      },
      onstop: () => {
        this.setStatus('paused');
        this.clearTimeInterval();
      },
      onend: () => {
        this.setStatus('idle');
        this.clearTimeInterval();
        this.emit('end');
      },
      onloaderror: (_id, error) => {
        this.error = error;
        this.setStatus('error', { error });
        this.emit('error', { type: 'load', error });
      },
      onplayerror: (_id, error) => {
        this.error = error;
        this.setStatus('error', { error });
        this.emit('error', { type: 'play', error });
        if (this.retryUnlock) return;
        this.retryUnlock = true;
        this.howl.once('unlock', () => {
          this.play();
        });
      },
    });
  }

  loadTrack({ id, url, title, artist, artwork }) {
    if (!url) return;
    this.isLive = false;
    this.currentId = id ?? null;
    this.setStatus('loading', { id, title, artist, artwork });
    this.emit('sourcechange', { id, url, title, artist, artwork, type: 'track' });
    this.buildHowl({ url, preload: true });
  }

  loadStream({ id, url, title, region, artwork }) {
    if (!url) return;
    this.isLive = true;
    this.currentId = id ?? null;
    this.setStatus('loading', { id, title, region, artwork });
    this.emit('sourcechange', { id, url, title, region, artwork, type: 'stream' });
    this.buildHowl({ url, preload: false });
  }

  play() {
    if (!this.howl) {
      console.warn('[audio-engine] play requested without a source');
      return;
    }
    try {
      this.howl.play();
    } catch (error) {
      this.error = error;
      this.setStatus('error', { error });
      this.emit('error', { type: 'play', error });
    }
  }

  pause() {
    if (!this.howl) return;
    try {
      this.howl.pause();
    } catch (error) {
      this.error = error;
      this.setStatus('error', { error });
      this.emit('error', { type: 'pause', error });
    }
  }

  stop() {
    if (this.howl) {
      try {
        this.howl.stop();
      } catch (error) {
        console.warn('[audio-engine] stop failed', error);
      }
    }
    this.setStatus('idle');
    this.clearTimeInterval();
  }

  seek(seconds) {
    if (!this.howl) return 0;
    if (this.isLive) return 0;
    if (typeof seconds === 'number' && Number.isFinite(seconds)) {
      try {
        this.howl.seek(seconds);
      } catch (error) {
        console.warn('[audio-engine] seek failed', error);
      }
      return seconds;
    }
    const position = this.howl.seek();
    return typeof position === 'number' ? position : 0;
  }

  setVolume(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) return;
    this.volume = Math.min(1, Math.max(0, value));
    if (this.howl) {
      this.howl.volume(this.volume);
    }
  }

  mute(value) {
    this.muted = Boolean(value);
    if (this.howl) {
      this.howl.mute(this.muted);
    }
  }

  getDuration() {
    if (this.isLive) return null;
    if (!this.howl) return null;
    const duration = this.howl.duration();
    return Number.isFinite(duration) ? duration : null;
  }

  getSnapshot() {
    return {
      status: this.status,
      isLive: this.isLive,
      seek: this.isLive ? 0 : this.seek(),
      duration: this.getDuration(),
      volume: this.volume,
      muted: this.muted,
      currentId: this.currentId,
      error: this.error ? String(this.error) : undefined,
    };
  }
}

export const audioEngine = new AudioEngine();
