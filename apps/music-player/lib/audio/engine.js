(() => {
  const HowlConstructor = window.Howl;
  const HowlerGlobal = window.Howler;

  if (!HowlConstructor) {
    console.warn('[audio-engine] Howler.js not detected.');
    window.audioEngine = {
      loadTrack: () => {},
      loadStream: () => {},
      play: () => {},
      pause: () => {},
      stop: () => {},
      seek: () => 0,
      setVolume: () => {},
      mute: () => {},
      getState: () => 'error',
      isLive: () => false,
      teardown: () => {},
      getDuration: () => 0,
    };
    return;
  }

  if (HowlerGlobal) {
    HowlerGlobal.autoUnlock = true;
    HowlerGlobal.autoSuspend = false;
  }

  let howl = null;
  let state = 'idle';
  let isLiveSource = false;
  let volume = 1;
  let muted = false;
  let retriedPlayUnlock = false;

  const dispatch = (eventName, detail = {}) => {
    window.dispatchEvent(new CustomEvent(`audioengine:${eventName}`, { detail }));
  };

  const setState = (nextState, detail = {}) => {
    state = nextState;
    dispatch('state', { state, ...detail });
  };

  const teardownHowl = () => {
    if (!howl) return;
    try {
      howl.stop();
    } catch (_) {
      // Ignore stop failures for already unloaded Howl instances.
    }
    try {
      howl.unload();
    } catch (_) {
      // Ignore unload failures.
    }
    howl = null;
  };

  const buildHowl = ({ url, preload, useHtml5 }) => {
    teardownHowl();
    retriedPlayUnlock = false;

    howl = new HowlConstructor({
      src: [url],
      html5: Boolean(useHtml5),
      preload,
      volume,
      mute: muted,
      onload: () => {
        if (state === 'loading') {
          setState('paused');
        }
        dispatch('loaded', { duration: howl.duration() });
      },
      onplay: () => {
        setState('playing');
        dispatch('play');
      },
      onpause: () => {
        setState('paused');
        dispatch('pause');
      },
      onstop: () => {
        setState('paused');
        dispatch('stop');
      },
      onend: () => {
        setState('idle');
        dispatch('ended');
      },
      onloaderror: (_id, error) => {
        console.warn('[audio-engine] load error', error);
        setState('error', { error });
        dispatch('error', { type: 'load', error });
      },
      onplayerror: (_id, error) => {
        console.warn('[audio-engine] play error', error);
        setState('error', { error });
        dispatch('error', { type: 'play', error });
        if (retriedPlayUnlock) return;
        retriedPlayUnlock = true;
        howl.once('unlock', () => {
          console.info('[audio-engine] retrying play after unlock');
          howl.play();
        });
      },
    });
  };

  const audioEngine = {
    loadTrack: ({ id, url, title, artist, artwork }) => {
      if (!url) return;
      isLiveSource = false;
      setState('loading', { id, title, artist, artwork });
      dispatch('source', { id, url, title, artist, artwork, type: 'track' });
      buildHowl({ url, preload: true, useHtml5: true });
    },
    loadStream: ({ id, url, title, region }) => {
      if (!url) return;
      isLiveSource = true;
      setState('loading', { id, title, region });
      dispatch('source', { id, url, title, region, type: 'stream' });
      buildHowl({ url, preload: false, useHtml5: true });
    },
    play: () => {
      if (!howl) {
        console.warn('[audio-engine] play requested without a source');
        return;
      }
      try {
        howl.play();
      } catch (error) {
        console.warn('[audio-engine] play threw', error);
      }
    },
    pause: () => {
      if (!howl) return;
      try {
        howl.pause();
      } catch (error) {
        console.warn('[audio-engine] pause threw', error);
      }
    },
    stop: () => {
      if (!howl) return;
      try {
        howl.stop();
      } catch (error) {
        console.warn('[audio-engine] stop threw', error);
      }
      setState('idle');
    },
    seek: seconds => {
      if (!howl) return 0;
      if (typeof seconds === 'number' && Number.isFinite(seconds)) {
        try {
          howl.seek(seconds);
        } catch (error) {
          console.warn('[audio-engine] seek threw', error);
        }
        return seconds;
      }
      const position = howl.seek();
      return typeof position === 'number' ? position : 0;
    },
    setVolume: value => {
      if (typeof value !== 'number' || Number.isNaN(value)) return;
      volume = Math.min(1, Math.max(0, value));
      if (howl) {
        howl.volume(volume);
      }
    },
    mute: isMuted => {
      muted = Boolean(isMuted);
      if (howl) {
        howl.mute(muted);
      }
    },
    getState: () => state,
    isLive: () => isLiveSource,
    teardown: () => {
      teardownHowl();
      state = 'idle';
      isLiveSource = false;
      dispatch('state', { state });
    },
    getDuration: () => (howl ? howl.duration() : 0),
    getAudioElement: () => {
      if (!howl || !howl._sounds || !howl._sounds.length) return null;
      const soundNode = howl._sounds[0]._node;
      if (!soundNode) return null;
      if (typeof HTMLAudioElement !== 'undefined' && soundNode instanceof HTMLAudioElement) {
        return soundNode;
      }
      if (soundNode.nodeName === 'AUDIO') {
        return soundNode;
      }
      return null;
    },
  };

  window.audioEngine = audioEngine;
})();
