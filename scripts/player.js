/* MUSIC PLAYER LOGIC */
    const resolveSunoAudioSrc = window.resolveSunoAudioSrc || (async src => src);
    const existingAudioElement = document.getElementById('audioPlayer');
    const sharedAudioElement = window.__ariyoAudioElement;
    const audioPlayer = sharedAudioElement || existingAudioElement || document.createElement('audio');
    if (!window.__ariyoAudioElement) {
      window.__ariyoAudioElement = audioPlayer;
    }
    const DEBUG_AUDIO = new URLSearchParams(window.location.search).get('debug') === '1';

    function deriveTrackArtist(baseArtist, trackTitle) {
        const artistName = baseArtist || 'Omoluabi';
        if (!trackTitle) return artistName;

        const match = trackTitle.match(/ft\.?\s+(.+)/i);
        if (match && match[1]) {
            return `${artistName} ft. ${match[1].trim()}`;
        }

        return artistName;
    }

    function slugifyLabel(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    function prefersReducedMotion() {
      return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    const vinylStateUtils = window.AriyoVinylStateUtils || {
      shouldVinylSpin: ({
        paused,
        ended,
        waiting,
        readyState,
        reducedMotion
      } = {}) => {
        const minimumReadyState = typeof HTMLMediaElement !== 'undefined'
          ? HTMLMediaElement.HAVE_CURRENT_DATA
          : 2;
        if (reducedMotion) return false;
        if (paused || ended) return false;
        if (waiting) return false;
        if (Number.isFinite(readyState) && readyState < minimumReadyState) return false;
        return true;
      }
    };

    /**
     * @typedef {Object} RecommendationReason
     * @property {'RECENT_PLAY'|'TEMPO_MATCH'|'SIMILAR_ARTIST'|'ALBUM_CONTINUATION'|'USER_ACTION'} type
     * @property {string} label
     * @property {Object} [data]
     */
    function setCrossOrigin(element, url) {
      try {
        const target = new URL(url, window.location.origin);
        const sameOrigin = target.origin === window.location.origin;
        const allowList = [
          /\.suno\.ai$/i,
          /\.suno\.com$/i,
          /raw\.githubusercontent\.com$/i,
          /githubusercontent\.com$/i,
          /github\.io$/i,
          /cloudfront\.net$/i
        ];
        const isAllowListed = allowList.some(pattern => pattern.test(target.hostname));

        // Only set crossOrigin when we are confident the host supplies CORS headers; otherwise
        // avoid sending the attribute to prevent silent CORS blocks that leave the player stuck
        // in a buffering state.
        const shouldEnableCors = sameOrigin || isAllowListed;
        if (shouldEnableCors) {
          element.crossOrigin = 'anonymous';
          element._corsEnabled = true;
        } else {
          element.removeAttribute('crossorigin');
          element._corsEnabled = false;
        }
      } catch (e) {
        element.removeAttribute('crossorigin');
        element._corsEnabled = false;
      }
    }

    function normalizeMediaSrc(src) {
      if (!src) return '';
      const trimmed = src.trim();
      if (/^\/\//.test(trimmed)) {
        return `https:${trimmed}`;
      }

      return trimmed;
    }

    function safeParseJson(value) {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch (error) {
        return null;
      }
    }

    function readStorageItem(storage, key) {
      try {
        return storage.getItem(key);
      } catch (error) {
        return null;
      }
    }

    function writeStorageItem(storage, key, value) {
      try {
        storage.setItem(key, value);
        return true;
      } catch (error) {
        return false;
      }
    }

    function inferPlaybackMode({ stationId, srcUrl, sourceType } = {}) {
      if (stationId) return 'radio';
      if (sourceType === 'radio') return 'radio';
      const normalizedSrc = normalizeMediaSrc(srcUrl || '');
      if (currentRadioIndex >= 0) return 'radio';
      if (normalizedSrc && Array.isArray(radioStations)) {
        const match = radioStations.some(station => normalizeMediaSrc(station.url) === normalizedSrc);
        if (match) return 'radio';
      }
      return 'track';
    }

    function syncLiveRadioBadge(mode) {
      if (!liveRadioBadge) return;
      liveRadioBadge.hidden = mode !== 'radio';
    }

    function setPlaybackContext({ mode, source } = {}) {
      const nextMode = mode || inferPlaybackMode({
        stationId: source?.stationId,
        srcUrl: source?.src,
        sourceType: source?.sourceType || source?.type
      });
      playbackContext.mode = nextMode;
      playbackContext.currentSource = source ? { ...source, type: nextMode } : playbackContext.currentSource;
      syncLiveRadioBadge(nextMode);
    }

    function updateLastPlayedContext(payload) {
      if (!payload) return;
      playbackContext.lastPlayed = payload;
      window.AriyoPlaybackContext = playbackContext;
    }

    function ensurePreconnect(url) {
      if (!url) return;
      try {
        const origin = new URL(url, window.location.href).origin;
        if (preconnectedHosts.has(origin)) return;
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = origin;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
        preconnectedHosts.add(origin);
      } catch (error) {
        // Ignore invalid URLs.
      }
    }

    function isInsecureMediaSrc(src) {
      if (!/^http:\/\//i.test(src || '')) {
        return false;
      }
      return !canProxyMediaSrc(src);
    }

    function reportInsecureSource(title, src) {
      const label = title || 'This stream';
      const message = `${label} uses HTTP and is blocked on HTTPS. Choose another source.`;
      console.warn('[security] Blocked insecure media URL:', src);
      debugLog('insecure-source', { src, title: label });
      setPlaybackStatus(PlaybackStatus.failed, { message });
      showRetryButton('Choose another source');
      if (trackInfo) {
        trackInfo.textContent = message;
      }
    }

    function ensureAudiblePlayback() {
      if (audioPlayer.dataset.userMuted === 'true') {
        return;
      }
      audioPlayer.muted = false;
      if (audioPlayer.volume === 0) {
        audioPlayer.volume = 1;
      }
    }
    let audioContext = window.__ariyoAudioContext || null;
    let isAudioContextResumed = audioContext ? audioContext.state === 'running' : false;
    let audioWarmupRan = false;
    let hasUserGesture = false;

    // Only create the AudioContext after a user gesture to comply with autoplay rules.
    function getOrCreateAudioContext() {
      if (audioContext) return audioContext;
      if (!hasUserGesture) {
        return null;
      }
      const ContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!ContextCtor) return null;
      audioContext = new ContextCtor();
      window.__ariyoAudioContext = audioContext;
      isAudioContextResumed = audioContext.state === 'running';
      if (audioContext) {
        audioContext.addEventListener('statechange', () => {
          console.info('[audio] AudioContext statechange:', audioContext.state);
        });
      }
      return audioContext;
    }

    async function resumeAudioContext() {
        const context = getOrCreateAudioContext();
        if (!context) {
          console.info('[audio] AudioContext not created yet (awaiting user gesture).');
          return null;
        }
        if (context.state === 'suspended' && !isAudioContextResumed) {
            try {
                await context.resume();
                isAudioContextResumed = true;
                console.info('[audio] AudioContext resumed successfully.', context.state);
            } catch (err) {
                console.error('[audio] AudioContext resume failed:', err);
            }
        }
        return context.state;
    }

    async function warmupAudioOutput() {
      if (audioWarmupRan) return;
      if (!hasUserGesture) {
        return;
      }
      const context = getOrCreateAudioContext();
      if (!context) return;
      audioWarmupRan = true;

      try {
        await resumeAudioContext();

        if (context.state === 'running') {
          const buffer = context.createBuffer(1, 1, 22050);
          const source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(context.destination);
          source.start(0);
        }

        ensureAudiblePlayback();
      } catch (error) {
        console.warn('Audio warmup failed; will retry on next interaction.', error);
        audioWarmupRan = false;
      }
    }

    const unlockHandler = () => {
      hasUserGesture = true;
      resumeAudioContext();
      document.removeEventListener('click', unlockHandler);
      document.removeEventListener('touchstart', unlockHandler);
      document.removeEventListener('keydown', unlockHandler);
    };
    document.addEventListener('click', unlockHandler, { passive: true });
    document.addEventListener('touchstart', unlockHandler, { passive: true });
    document.addEventListener('keydown', unlockHandler);
    primeInitialBuffer();

    if (!existingAudioElement && !audioPlayer.isConnected) {
        audioPlayer.id = 'audioPlayer';
    }
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isSlowConnection = Boolean(connection && (connection.saveData || /2g/.test(connection.effectiveType || '')));
    audioPlayer.preload = 'metadata';
    audioPlayer.volume = 1;
    audioPlayer.muted = false;
    audioPlayer.setAttribute('playsinline', '');
    audioPlayer.setAttribute('webkit-playsinline', '');
    audioPlayer.setAttribute('controlsList', 'nodownload');
    audioPlayer.addEventListener('contextmenu', e => e.preventDefault());
    audioPlayer.addEventListener('volumechange', () => {
      audioPlayer.dataset.userMuted = audioPlayer.muted ? 'true' : 'false';
    });
    audioPlayer.addEventListener('canplaythrough', hidePlaySpinner, { once: false });
    audioPlayer.addEventListener('playing', () => {
      clearBufferingHedge();
      hidePlaySpinner();
      vinylWaiting = false;
    });
    audioPlayer.addEventListener('waiting', () => {
      showPlaySpinner();
      setPlaybackStatus(PlaybackStatus.buffering, { message: 'Buffering…' });
      scheduleBufferingHedgeFromSource();
      vinylWaiting = true;
      manageVinylRotation();
    });
    audioPlayer.addEventListener('stalled', () => {
      showPlaySpinner();
      vinylWaiting = true;
      if (!stallRetryTimer) {
        stallRetryTimer = setTimeout(() => attemptPlay(), 3000);
      }
    });
    if (!existingAudioElement && !audioPlayer.isConnected) {
        document.body.appendChild(audioPlayer);
    }
    const albumCover = document.getElementById('albumCover');
    const turntableDisc = document.querySelector('.turntable-disc');
    const turntableGrooves = document.querySelector('.turntable-grooves');
    const turntableSheen = document.querySelector('.turntable-sheen');
    const albumGrooveOverlay = document.querySelector('.album-groove-overlay');
    const trackInfo = document.getElementById('trackInfo');
    const trackArtist = document.getElementById('trackArtist');
    const trackYear = document.getElementById('trackYear');
    const trackAlbum = document.getElementById('trackAlbum'); // Added for album display
    const trackDuration = document.getElementById('trackDuration');
    const liveRadioBadge = document.getElementById('liveRadioBadge');
    const asaNote = document.getElementById('asaNote');
    const asaNoteYo = document.getElementById('asaNoteYo');
    const asaNoteEn = document.getElementById('asaNoteEn');
    let asaNoteAttribution = document.getElementById('asaNoteAttribution');
    if (asaNote && !asaNoteAttribution) {
      asaNoteAttribution = document.createElement('div');
      asaNoteAttribution.id = 'asaNoteAttribution';
      asaNoteAttribution.style.fontSize = '0.75rem';
      asaNoteAttribution.style.opacity = '0.8';
      asaNote.appendChild(asaNoteAttribution);
    }
    const playbackStatusBanner = document.getElementById('playbackStatusBanner');
    const playbackStatusMessage = document.getElementById('playbackStatusMessage');
    const playbackRetryButton = document.getElementById('playbackRetryButton');
    const seekBar = document.getElementById('seekBar');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const bufferingOverlay = document.getElementById('bufferingOverlay');
    const bufferingMessage = document.getElementById('bufferingMessage');
    const retryButton = document.getElementById('retryButton');
    if (retryButton) {
      retryButton.style.display = 'none';
      retryButton.inert = true;
    }
    if (playbackRetryButton) {
      playbackRetryButton.hidden = true;
      playbackRetryButton.addEventListener('click', () => retryTrack());
    }
    const playButtonEl = document.getElementById('playButton');
    const progressBar = document.getElementById('progressBarFill');
const lyricsContainer = document.getElementById('lyrics');
let lyricLines = [];
let shuffleMode = false; // True if any shuffle is active
let shuffleScope = 'off'; // 'off', 'album', 'all', 'repeat'
let isFirstPlay = true;
let lastTrackSrc = '';
let lastTrackTitle = '';
let lastTrackIndex = 0;
let firstPlayGuardTimeoutId = null;
const silentStartGuard = {
  timerId: null,
  timeoutMs: 4000
};
const quickStartDeadline = {
  timerId: null,
  timeoutMs: 2000
};
const asaRotationRangeMs = {
  min: 6000,
  max: 10000
};
let asaRotationTimer = null;
let asaRotationIndex = 0;
let asaRotationLines = [];
let asaNoteLastResponse = null;
let asaNoteLastSeed = null;
let asaNoteRequestId = 0;
let lastSaveStatusAt = 0;
const PLAYER_STATE_STORAGE_KEY = 'ariyoPlayerState';
const LAST_PLAYED_STORAGE_KEY = 'ariyoLastPlayed';

const playbackContext = {
  mode: null,
  currentSource: null,
  lastPlayed: null
};

window.AriyoPlaybackContext = playbackContext;

const offlineFallbackTrack = {
  src: 'offline-audio.mp3',
  title: 'Offline Vibes',
  artist: 'Àríyò AI'
};

let offlineFallbackActive = false;
const SLOW_FETCH_TIMEOUT_MS = 8000;
const preconnectedHosts = new Set();
const TRACKS_PAGE_SIZE = isSlowConnection ? 20 : 50;
const trackDisplayState = new Map();

let currentAlbumIndex = 0;
let currentTrackIndex = 0;
let currentRadioIndex = -1;
let pendingRadioSelection = null;
let shuffleQueue = [];
let pendingAlbumIndex = null; // Album selected from the modal but not yet playing
let userInitiatedPause = false;
let lastKnownFiniteDuration = null;

const networkRecoveryState = {
  active: false,
  timerId: null,
  attemptFn: null,
  retryCount: 0,
  maxRetries: 4,
  baseDelayMs: 2000,
  maxDelayMs: 15000,
  cooldownMs: 20000,
  wasPlaying: false,
  resumeTime: 0,
  source: null,
  lastAttemptAt: 0
};

let networkRecoveryTimer = null;

const playbackWatchdog = {
  intervalId: null,
  lastTime: 0,
  lastProgressAt: 0,
  stallGraceMs: 6000
};

const bufferingHedge = {
  timerId: null,
  deadlineMs: 1500
};

const TRACK_TIME_THROTTLE_MS = 250;
let lastTrackTimeUiUpdateAt = 0;

const AUDIO_URL_CACHE_KEY = 'ariyoAudioUrlCache';
const AUDIO_URL_TTL_MS = 24 * 60 * 60 * 1000;

const audioHealer = createSelfHealAudio(audioPlayer);

const captureBufferedRanges = (audioEl) => {
  try {
    const ranges = [];
    for (let i = 0; i < audioEl.buffered.length; i += 1) {
      ranges.push([audioEl.buffered.start(i), audioEl.buffered.end(i)]);
    }
    return ranges;
  } catch (error) {
    return [];
  }
};

const captureAudioState = () => ({
  readyState: audioPlayer.readyState,
  networkState: audioPlayer.networkState,
  currentTime: Number.isFinite(audioPlayer.currentTime) ? Number(audioPlayer.currentTime.toFixed(3)) : audioPlayer.currentTime,
  duration: Number.isFinite(audioPlayer.duration) ? Number(audioPlayer.duration.toFixed(3)) : audioPlayer.duration,
  buffered: captureBufferedRanges(audioPlayer),
  src: audioPlayer.currentSrc || audioPlayer.src,
  preload: audioPlayer.preload,
  crossOrigin: audioPlayer.getAttribute('crossorigin'),
  volume: audioPlayer.volume,
  muted: audioPlayer.muted,
  paused: audioPlayer.paused,
  error: audioPlayer.error ? { code: audioPlayer.error.code, message: audioPlayer.error.message } : null,
  playbackStatus,
  visibility: document.visibilityState,
  online: navigator.onLine,
  audioContext: window.__ariyoAudioContext ? window.__ariyoAudioContext.state : null
});

const debugState = {
  panel: null,
  logList: null
};

const debugLog = (eventName, detail = {}) => {
  if (!DEBUG_AUDIO) return;
  const payload = { event: eventName, ...detail, state: captureAudioState() };
  console.log('[audio-debug]', payload);
  if (debugState.logList) {
    const item = document.createElement('li');
    item.textContent = `${new Date().toLocaleTimeString()} ${eventName}`;
    debugState.logList.prepend(item);
    while (debugState.logList.children.length > 30) {
      debugState.logList.removeChild(debugState.logList.lastChild);
    }
  }
  if (debugState.panel) {
    const stateEl = debugState.panel.querySelector('[data-audio-debug-state]');
    if (stateEl) {
      stateEl.textContent = JSON.stringify(captureAudioState(), null, 2);
    }
  }
};

const logAudioEvent = (label, detail = {}) => {
  const payload = {
    label,
    readyState: audioPlayer.readyState,
    networkState: audioPlayer.networkState,
    currentTime: Number.isFinite(audioPlayer.currentTime) ? Number(audioPlayer.currentTime.toFixed(3)) : audioPlayer.currentTime,
    src: audioPlayer.currentSrc || audioPlayer.src,
    audioContext: audioContext ? audioContext.state : null,
    muted: audioPlayer.muted,
    volume: audioPlayer.volume,
    ...detail
  };
  console.info('[audio]', payload);
};

let lastSpinState = false;
let vinylWaiting = false;

const initDebugPanel = () => {
  if (!DEBUG_AUDIO) return;
  if (debugState.panel) return;
  const panel = document.createElement('section');
  panel.id = 'audioDebugPanel';
  panel.innerHTML = `
    <style>
      #audioDebugPanel {
        position: fixed;
        bottom: 12px;
        right: 12px;
        width: min(420px, 90vw);
        max-height: 70vh;
        background: rgba(10, 10, 20, 0.9);
        color: #f7f7f7;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 11px;
        border-radius: 12px;
        padding: 12px;
        z-index: 9999;
        overflow: hidden;
      }
      #audioDebugPanel h3 {
        margin: 0 0 8px;
        font-size: 12px;
        letter-spacing: 0.02em;
      }
      #audioDebugPanel pre {
        margin: 0;
        max-height: 220px;
        overflow: auto;
        white-space: pre-wrap;
        background: rgba(255, 255, 255, 0.08);
        padding: 8px;
        border-radius: 8px;
      }
      #audioDebugPanel ul {
        margin: 8px 0 0;
        padding-left: 16px;
        max-height: 140px;
        overflow: auto;
      }
    </style>
    <h3>Audio Debug Panel (?debug=1)</h3>
    <pre data-audio-debug-state></pre>
    <ul data-audio-debug-log></ul>
  `;
  document.body.appendChild(panel);
  debugState.panel = panel;
  debugState.logList = panel.querySelector('[data-audio-debug-log]');
  debugLog('debug-panel-init');
};

const PlaybackStatus = {
  idle: 'idle',
  preparing: 'preparing',
  buffering: 'buffering',
  playing: 'playing',
  paused: 'paused',
  stopped: 'stopped',
  failed: 'failed'
};

let playbackStatus = PlaybackStatus.idle;

if (DEBUG_AUDIO) {
  initDebugPanel();
  const audioDebugEvents = [
    'play', 'playing', 'pause', 'waiting', 'stalled', 'error', 'ended',
    'timeupdate', 'canplay', 'canplaythrough', 'loadedmetadata',
    'abort', 'emptied', 'seeking', 'seeked'
  ];
  audioDebugEvents.forEach(eventName => {
    audioPlayer.addEventListener(eventName, () => {
      debugLog(eventName, {
        errorCode: audioPlayer.error ? audioPlayer.error.code : null
      });
    });
  });
  document.addEventListener('visibilitychange', () => {
    debugLog('visibilitychange', { visibility: document.visibilityState });
  });
  window.addEventListener('popstate', () => {
    debugLog('route-popstate', { url: window.location.href });
  });
  window.addEventListener('hashchange', () => {
    debugLog('route-hashchange', { url: window.location.href });
  });
  if (window.__ariyoAudioContext) {
    window.__ariyoAudioContext.addEventListener('statechange', () => {
      debugLog('audiocontext-state', { state: window.__ariyoAudioContext.state });
    });
  }
}
['canplay', 'playing', 'stalled', 'error', 'waiting', 'pause', 'ended', 'loadedmetadata'].forEach(eventName => {
  audioPlayer.addEventListener(eventName, () => {
    logAudioEvent(eventName, {
      errorCode: audioPlayer.error ? audioPlayer.error.code : null
    });
  });
});
const neutralFailureMessage = 'Playback paused—tap retry to keep the vibe going.';
let stallRetryTimer = null;

function showPlaySpinner() {
  if (playButtonEl) {
    playButtonEl.classList.add('loading');
  }
}

function hidePlaySpinner() {
  if (playButtonEl) {
    playButtonEl.classList.remove('loading');
  }
  if (stallRetryTimer) {
    clearTimeout(stallRetryTimer);
    stallRetryTimer = null;
  }
}

const slowBufferRescue = {
  timerId: null,
  inFlight: null,
  attempts: 0,
  maxAttempts: 2
};

function clearFirstPlayGuard() {
  if (firstPlayGuardTimeoutId) {
    clearTimeout(firstPlayGuardTimeoutId);
    firstPlayGuardTimeoutId = null;
  }
}

function clearSilentStartGuard() {
  if (silentStartGuard.timerId) {
    clearTimeout(silentStartGuard.timerId);
    silentStartGuard.timerId = null;
  }
}

function clearQuickStartDeadline() {
  if (quickStartDeadline.timerId) {
    clearTimeout(quickStartDeadline.timerId);
    quickStartDeadline.timerId = null;
  }
}

function scheduleQuickStartDeadline(src, title, resumeTime = null) {
  clearQuickStartDeadline();

  if (!src) return;

  quickStartDeadline.timerId = setTimeout(() => {
    const noAudibleProgress = audioPlayer.paused || (audioPlayer.currentTime || 0) === 0;

    if (!noAudibleProgress) {
      clearQuickStartDeadline();
      return;
    }

    console.warn(`[quick-start] ${title || 'Track'} still silent after ${quickStartDeadline.timeoutMs}ms, retrying source.`);
    const resumePoint = resumeTime != null && !isNaN(resumeTime)
      ? resumeTime
      : (audioPlayer.currentTime || 0);
    startSlowBufferRescue(src, title, resumePoint, true);
    attemptPlay();
  }, quickStartDeadline.timeoutMs);
}

function scheduleSilentStartGuard() {
  clearSilentStartGuard();

  if (!audioPlayer.src) return;

  silentStartGuard.timerId = setTimeout(() => {
    silentStartGuard.timerId = null;

    const stuckAtStart = (audioPlayer.currentTime || 0) === 0;
    const isBuffering = playbackStatus === PlaybackStatus.preparing || playbackStatus === PlaybackStatus.buffering;
    if (!stuckAtStart || !isBuffering) return;

    const source = captureCurrentSource();
    const targetSrc = source?.src || audioPlayer.currentSrc || audioPlayer.src;
    const title = source?.title || lastTrackTitle || trackInfo?.textContent || 'Track';

    console.warn('[silent-start-guard] No audible progress detected; forcing recovery.');
    startSlowBufferRescue(targetSrc, title, 0, true);
    if (!networkRecoveryState.active) {
      startNetworkRecovery('silent-start');
    }
  }, silentStartGuard.timeoutMs);
}

  function scheduleFirstPlayGuard() {
    clearFirstPlayGuard();

    // If playback never transitions to "playing" after the user hits play,
    // reload the current source and try again so the UI never appears frozen.
    firstPlayGuardTimeoutId = setTimeout(() => {
      if (isTrackModalOpen()) {
        console.log('[firstPlayGuard] Track list is open; deferring auto-recovery to avoid interrupting the user.');
        return;
      }

      if (playbackStatus === PlaybackStatus.playing || audioPlayer.currentTime > 0) {
        clearFirstPlayGuard();
        return;
      }

    console.warn('[firstPlayGuard] Playback did not start, retrying source load.');
    showBufferingState('Reconnecting your audio...');

    const source = captureCurrentSource();
    if (source && source.type === 'track') {
      const album = albums[source.albumIndex];
      const track = album && album.tracks ? album.tracks[source.trackIndex] : null;
      if (track) {
        selectTrack(track.src, track.title, source.trackIndex, false);
        attemptPlay();
      }
    } else if (source && source.type === 'radio' && radioStations[source.index]) {
      selectRadio(source.src, source.title, source.index, radioStations[source.index].logo);
      attemptPlay();
    } else {
      ensureInitialTrackLoaded(false);
      attemptPlay();
    }
  }, 2500);
}

function showBufferingState(message = 'Lining up your track...') {
  setPlaybackStatus(
    playbackStatus === PlaybackStatus.playing ? PlaybackStatus.buffering : PlaybackStatus.preparing,
    { message }
  );
}

  function getDefaultTrack() {
    const fallbackAlbum = albums && albums.length ? albums[0] : null;
  const fallbackTrack = fallbackAlbum && fallbackAlbum.tracks && fallbackAlbum.tracks.length
    ? fallbackAlbum.tracks[0]
    : null;

  if (!fallbackAlbum || !fallbackTrack) {
    return null;
  }

    return { albumIndex: 0, trackIndex: 0, track: fallbackTrack, album: fallbackAlbum };
  }

  function isTrackModalOpen() {
    const trackModal = document.getElementById('trackModal');
    return Boolean(trackModal && getComputedStyle(trackModal).display !== 'none');
  }

function ensureInitialTrackLoaded(silent = true, { primeSource = true } = {}) {
  if (audioPlayer.src) {
    return true;
  }

  resetOfflineFallback();

  const defaultSelection = getDefaultTrack();
  if (!defaultSelection) {
    reportLibraryIssue('Music catalog unavailable. Please refresh the page.');
    return false;
  }

  const { albumIndex, trackIndex, track, album } = defaultSelection;
  applyTrackUiState(albumIndex, trackIndex);
  if (isInsecureMediaSrc(track.src)) {
    reportInsecureSource(track.title, track.src);
    return false;
  }
  const normalizedSrc = normalizeMediaSrc(track.src);
  if (!normalizedSrc) {
    return false;
  }
  if (!primeSource) {
    return true;
  }

  const streamUrl = buildTrackFetchUrl(normalizedSrc, track);
  setCrossOrigin(audioPlayer, streamUrl);
  audioPlayer.src = streamUrl;
  audioHealer.trackSource(streamUrl, track.title, { live: false });
  handleAudioLoad(streamUrl, track.title, false, {
    autoPlay: false,
    silent,
    onReady: () => {
      trackAlbum.textContent = `Album: ${album.name}`;
      manageVinylRotation();
    },
    onError: () => {
      audioPlayer.src = streamUrl;
    }
  });

  return true;
}

function primeInitialBuffer() {
  if (audioPlayer.src) return;

  const kickoff = () => {
    warmupAudioOutput().finally(() => ensureInitialTrackLoaded(true, { primeSource: false }));
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(kickoff, { timeout: 1500 });
  } else {
    setTimeout(kickoff, 500);
  }
}

function hideBufferingState() {
  clearBufferingHedge();
  if (bufferingOverlay) {
    bufferingOverlay.classList.remove('visible');
  }
  if (loadingSpinner) {
    loadingSpinner.style.display = 'none';
    loadingSpinner.removeAttribute('aria-label');
  }
}

function updateInlineStatus(message, { showRetry = false } = {}) {
  if (!playbackStatusBanner || !playbackStatusMessage) return;
  const hasMessage = Boolean(message);
  playbackStatusBanner.hidden = !hasMessage;
  playbackStatusMessage.textContent = message || '';
  if (playbackRetryButton) {
    playbackRetryButton.hidden = !showRetry;
  }
}

function reportLibraryIssue(message) {
  console.error(`[library] ${message}`);
  updateInlineStatus(message, { showRetry: false });
}

function clearAsaRotation() {
  if (asaRotationTimer) {
    clearTimeout(asaRotationTimer);
    asaRotationTimer = null;
  }
}

function scheduleAsaRotation() {
  clearAsaRotation();
  if (!asaRotationLines.length || prefersReducedMotion() || document.hidden) {
    return;
  }
  const interval = asaRotationRangeMs.min
    + Math.floor(Math.random() * (asaRotationRangeMs.max - asaRotationRangeMs.min));
  asaRotationTimer = setTimeout(() => {
    asaRotationIndex = (asaRotationIndex + 1) % asaRotationLines.length;
    const [yo, en] = asaRotationLines;
    const nextLine = asaRotationIndex === 0 ? yo : en;
    if (asaNoteYo) {
      asaNoteYo.textContent = nextLine || '';
    }
    if (asaNoteEn) {
      asaNoteEn.textContent = '';
    }
    scheduleAsaRotation();
  }, interval);
}

/*
type AsaNoteResponse = {
  proverb_text: string;
  author: string;
  source: "ZenQuotes" | "Local";
  attribution_html: string;
};

async function loadAsaNote(seed?: string): Promise<AsaNoteResponse> {
  const qs = new URLSearchParams({ mode: "random" });
  if (seed) qs.set("seed", seed);
  const r = await fetch(`/api/asa-note?${qs.toString()}`);
  if (!r.ok) throw new Error("asa-note fetch failed");
  return (await r.json()) as AsaNoteResponse;
}
*/
/**
 * @typedef {Object} AsaNoteResponse
 * @property {string} proverb_text
 * @property {string} author
 * @property {"ZenQuotes"|"Local"} source
 * @property {string} attribution_html
 */

async function loadAsaNote(seed) {
  const qs = new URLSearchParams({ mode: 'random' });
  if (seed) qs.set('seed', seed);
  const r = await fetch(`/api/asa-note?${qs.toString()}`);
  if (!r.ok) throw new Error('asa-note fetch failed');
  return await r.json();
}

/*
<div>{asaNote.proverb_text}</div>
<div>{asaNote.author}</div>

{asaNote.source === "ZenQuotes" && asaNote.attribution_html ? (
  <div
    style={{ fontSize: "0.75rem", opacity: 0.8 }}
    dangerouslySetInnerHTML={{ __html: asaNote.attribution_html }}
  />
) : null}
*/
function renderAsaNote(asaNoteData) {
  if (!asaNote || !asaNoteYo || !asaNoteEn) return;
  asaNote.hidden = false;
  asaRotationLines = [];
  clearAsaRotation();
  asaNoteYo.textContent = asaNoteData.proverb_text;
  asaNoteEn.textContent = asaNoteData.author;
  if (asaNoteAttribution) {
    const showAttribution = asaNoteData.source === 'ZenQuotes' && asaNoteData.attribution_html;
    if (showAttribution) {
      asaNoteAttribution.innerHTML = asaNoteData.attribution_html;
      asaNoteAttribution.style.display = 'block';
    } else {
      asaNoteAttribution.innerHTML = '';
      asaNoteAttribution.style.display = 'none';
    }
  }
}

function updateAsaNote(seed) {
  if (!asaNote || !asaNoteYo || !asaNoteEn) return;
  const normalizedSeed = typeof seed === 'string' && seed.trim() ? seed : undefined;

  if (asaNoteLastResponse) {
    renderAsaNote(asaNoteLastResponse);
  } else {
    asaNote.hidden = false;
    asaNoteYo.textContent = 'Loading Àṣà Note...';
    asaNoteEn.textContent = '';
    if (asaNoteAttribution) {
      asaNoteAttribution.innerHTML = '';
      asaNoteAttribution.style.display = 'none';
    }
  }

  if (asaNoteLastSeed === normalizedSeed && asaNoteLastResponse) {
    return;
  }
  asaNoteLastSeed = normalizedSeed;
  const requestId = ++asaNoteRequestId;

  loadAsaNote(normalizedSeed)
    .then(value => {
      if (requestId !== asaNoteRequestId) return;
      asaNoteLastResponse = value;
      renderAsaNote(value);
    })
    .catch(() => {
      if (requestId !== asaNoteRequestId) return;
      if (asaNoteLastResponse) {
        renderAsaNote(asaNoteLastResponse);
        return;
      }
      renderAsaNote({
        proverb_text: 'Stay ready so you never have to get ready.',
        author: 'Proverb',
        source: 'Local',
        attribution_html: ''
      });
    });
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearAsaRotation();
  } else {
    scheduleAsaRotation();
  }
});

function setPlaybackStatus(status, options = {}) {
  const { message } = options;
  playbackStatus = status;

  if (status === PlaybackStatus.preparing || status === PlaybackStatus.buffering) {
    const messageText = message || 'Lining up your track...';
    const inlineMessage = /reconnecting|saving your place/i.test(messageText) ? messageText : '';
    updateInlineStatus(inlineMessage, { showRetry: false });
    if (bufferingMessage) {
      bufferingMessage.textContent = messageText;
    }
    if (bufferingOverlay) {
      bufferingOverlay.classList.add('visible');
    }
    if (loadingSpinner) {
      loadingSpinner.style.display = 'flex';
      loadingSpinner.setAttribute('aria-label', messageText);
    }
    if (retryButton) {
      retryButton.style.display = 'none';
      retryButton.inert = true;
    }
    return;
  }

  hideBufferingState();

  if (status === PlaybackStatus.failed) {
    trackInfo.textContent = message || neutralFailureMessage;
    updateInlineStatus(message || neutralFailureMessage, { showRetry: true });
    if (retryButton) {
      retryButton.style.display = 'block';
      retryButton.textContent = 'Retry';
      retryButton.inert = false;
    }
    return;
  }

  if (status === PlaybackStatus.playing) {
    hideRetryButton();
    updateInlineStatus('', { showRetry: false });
  }

  if (status === PlaybackStatus.paused) {
    updateInlineStatus('', { showRetry: false });
  }

  if ('mediaSession' in navigator) {
    const state = status === PlaybackStatus.playing
      ? 'playing'
      : status === PlaybackStatus.paused
        ? 'paused'
        : 'none';
    navigator.mediaSession.playbackState = state;
  }
}

function syncMediaSessionPlaybackState() {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = audioPlayer.paused ? 'paused' : 'playing';
  }
}

function ensureBackgroundPlayback(reason = 'hidden') {
  if (userInitiatedPause || playbackStatus !== PlaybackStatus.playing) {
    return;
  }

  const haveCurrentData = typeof HTMLMediaElement !== 'undefined'
    ? HTMLMediaElement.HAVE_CURRENT_DATA
    : 2;

  if (document.visibilityState === 'hidden') {
    resumeAudioContext().catch(error => {
      console.warn(`[background] Audio context resume failed during ${reason}:`, error);
    });
    ensureInitialTrackLoaded(true);
  }

  if (audioPlayer.paused || audioPlayer.ended || audioPlayer.readyState < haveCurrentData) {
    audioPlayer.play().then(() => {
      syncMediaSessionPlaybackState();
    }).catch(error => {
      console.warn(`[background] Playback prevented during ${reason}:`, error);
    });
  } else {
    syncMediaSessionPlaybackState();
  }
}

function clearSlowBufferRescue() {
  if (slowBufferRescue.timerId) {
    clearTimeout(slowBufferRescue.timerId);
    slowBufferRescue.timerId = null;
  }
  if (slowBufferRescue.inFlight) {
    slowBufferRescue.inFlight.abort();
    slowBufferRescue.inFlight = null;
  }
  slowBufferRescue.attempts = 0;
}

function resetOfflineFallback() {
  offlineFallbackActive = false;
}

function activateOfflineFallback(reason = 'network') {
  if (offlineFallbackActive) return;

  offlineFallbackActive = true;
  console.warn(`[offline-fallback] Activating fallback because: ${reason}`);
  const { src, title, artist } = offlineFallbackTrack;

  showBufferingState('Network is slow — playing offline vibes.');
  if (trackInfo) {
    trackInfo.textContent = title;
  }
  if (trackArtist) {
    trackArtist.textContent = artist;
  }
  if (trackAlbum) {
    trackAlbum.textContent = 'Album: Offline queue';
  }

  setCrossOrigin(audioPlayer, src);
  audioPlayer.src = src;
  audioHealer.trackSource(src, title, { live: false });

  handleAudioLoad(src, title, false, {
    silent: false,
    autoPlay: true,
    resumeTime: 0,
    disableSlowGuard: true,
    onReady: () => {
      hideBufferingState();
    },
    onError: () => {
      setPlaybackStatus(PlaybackStatus.failed, { message: 'Network is too slow right now.' });
      showRetryButton('Retry playback');
    }
  });
}

function clearBufferingHedge() {
  if (bufferingHedge.timerId) {
    clearTimeout(bufferingHedge.timerId);
    bufferingHedge.timerId = null;
  }
}

function scheduleBufferingHedgeFromSource() {
  const source = captureCurrentSource();
  if (!source || !source.src) return;

  const resumePoint = audioPlayer.currentTime || 0;
  const title = source.title || lastTrackTitle || 'Track';

  clearBufferingHedge();
  bufferingHedge.timerId = setTimeout(() => {
    bufferingHedge.timerId = null;
    startSlowBufferRescue(source.src, title, Math.max(resumePoint - 0.5, 0), true, {
      onReady: () => setPlaybackStatus(PlaybackStatus.buffering, { message: 'Catching up faster...' })
    });
  }, bufferingHedge.deadlineMs);
}

async function startSlowBufferRescue(src, title, resumeTime = null, autoPlay = true, callbacks = {}) {
  if (!src || slowBufferRescue.inFlight || slowBufferRescue.attempts >= slowBufferRescue.maxAttempts) {
    return;
  }

  slowBufferRescue.attempts += 1;
  const controller = new AbortController();
  slowBufferRescue.inFlight = controller;
  const rescueTimeout = setTimeout(() => controller.abort('timeout'), SLOW_FETCH_TIMEOUT_MS);

  try {
    const resolvedSrc = await resolveSunoAudioSrc(src);
    const fetchUrl = buildTrackFetchUrl(resolvedSrc);
    console.warn(`[slow-buffer] Attempt ${slowBufferRescue.attempts} fetching ${title} for slow network users.`);
    const response = await fetch(fetchUrl, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Slow buffer fetch failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const safeResume = resumeTime != null && !isNaN(resumeTime) ? resumeTime : (audioPlayer.currentTime || 0);

    handleAudioLoad(objectUrl, title, false, {
      silent: true,
      autoPlay,
      resumeTime: Math.max(safeResume - 1, 0),
      disableSlowGuard: true,
      onReady: callbacks.onReady,
      onError: callbacks.onError
    });
  } catch (error) {
    console.warn('[slow-buffer] Rescue fetch failed:', error);
    if (isLikelyCorsBlock(error)) {
      const fallbackSrc = appendCacheBuster(src);
      console.warn('[slow-buffer] Falling back to direct stream after CORS block.', { fallbackSrc });
      setCrossOrigin(audioPlayer, fallbackSrc);
      handleAudioLoad(fallbackSrc, title, false, {
        silent: true,
        autoPlay,
        resumeTime: Math.max((resumeTime != null ? resumeTime : audioPlayer.currentTime || 0) - 1, 0),
        disableSlowGuard: true,
        onReady: callbacks.onReady,
        onError: callbacks.onError
      });
    }
    const abortReason = controller.signal && 'reason' in controller.signal ? controller.signal.reason : null;
    const abortedByTimeout = controller.signal.aborted && abortReason === 'timeout';
    if (abortedByTimeout || slowBufferRescue.attempts >= slowBufferRescue.maxAttempts) {
      activateOfflineFallback(abortedByTimeout ? 'rescue-timeout' : 'rescue-failed');
    }
  } finally {
    clearTimeout(rescueTimeout);
    slowBufferRescue.inFlight = null;
  }
}

function recordPlaybackProgress(time) {
  playbackWatchdog.lastTime = typeof time === 'number' ? time : 0;
  playbackWatchdog.lastProgressAt = Date.now();
}

function stopPlaybackWatchdog(resetProgress = true) {
  if (playbackWatchdog.intervalId) {
    clearInterval(playbackWatchdog.intervalId);
    playbackWatchdog.intervalId = null;
  }
  if (resetProgress) {
    recordPlaybackProgress(audioPlayer.currentTime || 0);
  }
}

function checkPlaybackHealth() {
  if (audioPlayer.paused || audioPlayer.ended) {
    recordPlaybackProgress(audioPlayer.currentTime || 0);
    return;
  }

  if (networkRecoveryState.active) {
    return;
  }

  const currentTime = audioPlayer.currentTime || 0;
  if (currentTime > playbackWatchdog.lastTime + 0.25) {
    recordPlaybackProgress(currentTime);
    return;
  }

  const now = Date.now();
  if (now - playbackWatchdog.lastProgressAt < playbackWatchdog.stallGraceMs) {
    return;
  }

  const haveEnoughData = typeof HTMLMediaElement !== 'undefined'
    ? HTMLMediaElement.HAVE_ENOUGH_DATA
    : 4;

  if (audioPlayer.readyState >= haveEnoughData) {
    console.warn('Playback stalled despite sufficient buffer. Attempting recovery.');
  } else {
    console.warn('Playback has stalled. Attempting recovery.');
  }
  if (attemptSoftRecovery('watchdog')) {
    return;
  }
  startNetworkRecovery('playback-stall');
}

function startPlaybackWatchdog() {
  recordPlaybackProgress(audioPlayer.currentTime || 0);
  if (!playbackWatchdog.intervalId) {
    playbackWatchdog.intervalId = setInterval(checkPlaybackHealth, 5000);
  }
}

function cancelNetworkRecovery() {
  if (networkRecoveryState.timerId) {
    clearTimeout(networkRecoveryState.timerId);
    networkRecoveryState.timerId = null;
  }
  networkRecoveryState.active = false;
  networkRecoveryState.attemptFn = null;
  networkRecoveryState.retryCount = 0;
  networkRecoveryState.source = null;
  networkRecoveryState.wasPlaying = false;
  networkRecoveryState.resumeTime = 0;
  networkRecoveryState.lastAttemptAt = 0;
}

function captureCurrentSource() {
  if (playbackContext.currentSource) {
    return { ...playbackContext.currentSource };
  }
  if (!lastTrackSrc) return null;
  if (currentRadioIndex >= 0 && radioStations[currentRadioIndex]) {
    return {
      type: 'radio',
      index: currentRadioIndex,
      src: lastTrackSrc,
      title: lastTrackTitle
    };
  }
  if (
    currentAlbumIndex >= 0 &&
    albums[currentAlbumIndex] &&
    currentTrackIndex >= 0 &&
    albums[currentAlbumIndex].tracks[currentTrackIndex]
  ) {
    return {
      type: 'track',
      albumIndex: currentAlbumIndex,
      trackIndex: currentTrackIndex,
      src: lastTrackSrc,
      title: lastTrackTitle
    };
  }
  return null;
}

function finishNetworkRecovery() {
  if (networkRecoveryState.timerId) {
    clearTimeout(networkRecoveryState.timerId);
    networkRecoveryState.timerId = null;
  }
  networkRecoveryState.active = false;
  networkRecoveryState.attemptFn = null;
  networkRecoveryState.retryCount = 0;
  networkRecoveryState.source = null;
  networkRecoveryState.wasPlaying = false;
  networkRecoveryState.resumeTime = 0;
  networkRecoveryState.lastAttemptAt = 0;
}

function appendCacheBuster(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}reconnect=${Date.now()}`;
}

function isLikelyCorsBlock(error) {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  return error.name === 'TypeError' || message.includes('cors');
}

function computeRecoveryDelay(attempt) {
  const helper = window.AriyoAudioRecoveryUtils && window.AriyoAudioRecoveryUtils.computeBackoffDelay;
  if (typeof helper === 'function') {
    return helper(attempt, networkRecoveryState.baseDelayMs, networkRecoveryState.maxDelayMs, 0.2);
  }
  const base = networkRecoveryState.baseDelayMs;
  const max = networkRecoveryState.maxDelayMs;
  const exponential = Math.min(max, base * Math.pow(2, Math.max(attempt - 1, 0)));
  const jitter = exponential * 0.2 * Math.random();
  return Math.round(exponential + jitter);
}

function attemptSoftRecovery(reason = 'soft-recover') {
  if (!audioPlayer || audioPlayer.paused) return false;
  const buffered = audioPlayer.buffered;
  if (!buffered || buffered.length === 0) return false;
  const currentTime = audioPlayer.currentTime || 0;

  for (let i = 0; i < buffered.length; i += 1) {
    const start = buffered.start(i);
    const end = buffered.end(i);
    if (currentTime >= start && currentTime <= end) {
      const nudgeTarget = Math.min(end - 0.25, currentTime + 0.25);
      if (Number.isFinite(nudgeTarget) && nudgeTarget > currentTime) {
        audioPlayer.currentTime = nudgeTarget;
        const playPromise = audioPlayer.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
        debugLog('soft-recover-nudge', { reason, nudgeTarget });
        return true;
      }
    }
  }

  const firstStart = buffered.start(0);
  if (Number.isFinite(firstStart) && currentTime < firstStart) {
    audioPlayer.currentTime = Math.max(firstStart - 0.1, 0);
    debugLog('soft-recover-seek', { reason, target: audioPlayer.currentTime });
    return true;
  }

  return false;
}

function createSelfHealAudio(player) {
  const state = {
    recovering: false,
    lastKnownSrc: '',
    lastTitle: '',
    durationTimer: null,
    retryCount: 0,
    maxRetries: 3,
    isLive: false
  };

  const progressState = {
    lastTime: 0,
    lastAt: 0
  };

  function log(message, extra = {}) {
    console.log(`[self-heal] ${message}`, extra);
  }

  function clearDurationTimer() {
    if (state.durationTimer) {
      clearTimeout(state.durationTimer);
      state.durationTimer = null;
    }
  }

  function watchDuration(reason = 'duration-check') {
    if (state.isLive) return;
    clearDurationTimer();
    state.durationTimer = setTimeout(() => {
      const invalidDuration = !player.duration || !isFinite(player.duration);
      const recentlyProgressed = progressState.lastTime > 0 && (Date.now() - progressState.lastAt) < 8000;

      if (invalidDuration && recentlyProgressed) {
        log(`Duration invalid but playback is progressing; skipping heal.`, { reason });
        return;
      }

      if (invalidDuration) {
        log(`Duration invalid (${player.duration}). Triggering heal.`, { reason });
        heal(reason);
      }
    }, 2000);
  }

  function rebindMetadataHandlers() {
    const onLoadedMetadata = () => {
      if (state.isLive) return;
      clearDurationTimer();
      if (!player.duration || !isFinite(player.duration)) {
        watchDuration('loadedmetadata-invalid');
      }
    };

    const onDurationChange = () => {
      if (state.isLive) return;
      if (!player.duration || !isFinite(player.duration)) {
        watchDuration('durationchange-invalid');
      } else {
        clearDurationTimer();
      }
    };

    player.removeEventListener('loadedmetadata', player._selfHealMetaHandler);
    player.removeEventListener('durationchange', player._selfHealDurationHandler);

    player._selfHealMetaHandler = onLoadedMetadata;
    player._selfHealDurationHandler = onDurationChange;

    player.addEventListener('loadedmetadata', onLoadedMetadata);
    player.addEventListener('durationchange', onDurationChange);
  }

  function heal(reason = 'unknown') {
    if (state.recovering) return;
    state.recovering = true;

    const wasPlaying = !player.paused && !player.ended;
    const resumeTime = player.currentTime || 0;
    const targetSrc = appendCacheBuster(state.lastKnownSrc || player.currentSrc || player.src);

    log(`Healing audio due to ${reason}`, { src: targetSrc, wasPlaying, resumeTime });

    try {
      setCrossOrigin(player, targetSrc);
    } catch (error) {
      console.warn('Unable to set crossorigin during heal:', error);
    }

    player.src = targetSrc;
    rebindMetadataHandlers();

    player.addEventListener('loadedmetadata', () => {
      try {
        if (resumeTime && isFinite(resumeTime)) {
          player.currentTime = Math.max(resumeTime - 1, 0);
        }
      } catch (error) {
        console.warn('Failed to restore time after heal:', error);
      }
    }, { once: true });

    player.addEventListener('canplay', () => {
      if (wasPlaying) {
        const playAttempt = player.play();
        if (playAttempt && typeof playAttempt.catch === 'function') {
          playAttempt.catch(err => console.warn('Autoplay blocked during heal:', err));
        }
      }
      state.recovering = false;
      state.retryCount = 0;
    }, { once: true });

    player.load();
  }

  function handleError(event) {
    state.retryCount += 1;
    log('Audio error detected', { eventType: event.type, code: player.error && player.error.code, retry: state.retryCount });
    if (state.retryCount <= state.maxRetries) {
      heal(event.type || 'error');
    }
  }

  function handleStall(event) {
    if (player.paused || state.recovering || state.isLive) return;
    watchDuration(event.type);
  }

  function attach() {
    rebindMetadataHandlers();
    ['error', 'stalled', 'suspend', 'waiting'].forEach(evt => {
      player.removeEventListener(evt, player._selfHealErrorHandler);
    });

    player._selfHealErrorHandler = (e) => {
      if (e.type === 'error') {
        handleError(e);
      } else {
        handleStall(e);
      }
    };

    ['error', 'stalled', 'suspend', 'waiting'].forEach(evt => {
      player.addEventListener(evt, player._selfHealErrorHandler);
    });
  }

  function trackSource(src, title, options = {}) {
    state.isLive = Boolean(options.live);
    state.lastKnownSrc = src || state.lastKnownSrc;
    state.lastTitle = title || state.lastTitle;
    progressState.lastTime = 0;
    progressState.lastAt = Date.now();
    if (state.isLive) {
      clearDurationTimer();
      return;
    }
    watchDuration('source-change');
  }

  player.addEventListener('timeupdate', () => {
    progressState.lastTime = player.currentTime || 0;
    progressState.lastAt = Date.now();
  });

  attach();

  return {
    heal,
    trackSource,
    rebindMetadataHandlers,
    clearDurationTimer
  };
}

function loadAudioUrlCache() {
  try {
    const raw = localStorage.getItem(AUDIO_URL_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    return Object.fromEntries(
      Object.entries(parsed).filter(([, entry]) => entry && (now - entry.timestamp) < AUDIO_URL_TTL_MS)
    );
  } catch (error) {
    return {};
  }
}

function cacheResolvedAudioUrl(original, resolved) {
  try {
    const cache = loadAudioUrlCache();
    cache[original] = { resolved, timestamp: Date.now() };
    localStorage.setItem(AUDIO_URL_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Unable to cache audio URL', error);
  }
}

function getCachedAudioUrl(original) {
  const cache = loadAudioUrlCache();
  return cache[original]?.resolved || null;
}

window.cacheResolvedAudioUrl = cacheResolvedAudioUrl;
window.getCachedAudioUrl = getCachedAudioUrl;

const AUDIO_PROXY_PATH = '/api/proxy-audio';
const RADIO_PROXY_PATH = '/api/radio/proxy';
const DIRECT_MEDIA_HOSTS = [
  /\.suno\.(?:ai|com)$/i,
  /cdn\d*\.suno\.(?:ai|com)$/i,
  /cloudfront\.net$/i,
  /raw\.githubusercontent\.com$/i,
  /githubusercontent\.com$/i,
  /github\.io$/i
];
const PROXY_ALLOWED_HOSTS = [
  /\.suno\.(?:ai|com)$/i,
  /cdn\d*\.suno\.(?:ai|com)$/i,
  /raw\.githubusercontent\.com$/i,
  /githubusercontent\.com$/i,
  /github\.io$/i,
  /streamguys1\.com$/i,
  /streamtheworld\.com$/i,
  /zeno\.fm$/i,
  /radio\.co$/i,
  /akamaized\.net$/i,
  /mystreaming\.net$/i,
  /securenetsystems\.net$/i,
  /asurahosting\.com$/i,
  /agidigbostream\.com\.ng$/i,
  /anchor\.fm$/i,
  /instainternet\.com$/i,
  /cloudfront\.net$/i,
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
  /galcom\.org$/i
];

function isProxyAllowedHost(url) {
  return PROXY_ALLOWED_HOSTS.some(pattern => pattern.test(url.hostname));
}

function shouldProxyMediaUrl(url, trackMeta = null) {
  if (url.origin === window.location.origin) return false;
  if (!isProxyAllowedHost(url)) return false;
  if (url.protocol === 'http:') return true;
  const isDirect = DIRECT_MEDIA_HOSTS.some(pattern => pattern.test(url.hostname));
  if (isDirect && !trackMeta?.forceProxy) return false;
  return true;
}

function buildProxyUrl(src) {
  return `${AUDIO_PROXY_PATH}?url=${encodeURIComponent(src)}`;
}

function buildRadioProxyUrl(src) {
  return `${RADIO_PROXY_PATH}?url=${encodeURIComponent(src)}`;
}

function canProxyMediaSrc(src) {
  try {
    const target = new URL(src, window.location.origin);
    return isProxyAllowedHost(target);
  } catch (error) {
    return false;
  }
}

function buildTrackFetchUrl(src, trackMeta = null) {
  const normalizedSrc = normalizeMediaSrc(src);

  const cachedUrl = getCachedAudioUrl(normalizedSrc);
  const effectiveSrc = cachedUrl || normalizedSrc;
  let targetUrl;
  try {
    targetUrl = new URL(effectiveSrc, window.location.origin);
  } catch (error) {
    targetUrl = null;
  }

  if (targetUrl && trackMeta?.sourceType === 'stream') {
    if (targetUrl.protocol === 'http:' || (trackMeta.forceProxy && isProxyAllowedHost(targetUrl))) {
      return buildRadioProxyUrl(effectiveSrc);
    }
  }

  // Route cross-origin streams through the proxy to avoid CORS/mixed-content stalls.
  if (targetUrl && shouldProxyMediaUrl(targetUrl, trackMeta)) {
    return buildProxyUrl(effectiveSrc);
  }

  if (cachedUrl) {
    return cachedUrl;
  }

  if (trackMeta && trackMeta.sourceType === 'rss') {
    cacheResolvedAudioUrl(normalizedSrc, normalizedSrc);
    return normalizedSrc;
  }

  try {
    const hostname = new URL(effectiveSrc, window.location.origin).hostname;
    const cacheSafeHosts = [
      /cdn\d+\.[^.]+\.ai$/i, // Suno
      /anchor\.fm$/i,
      /cloudfront\.net$/i
    ];
    if (cacheSafeHosts.some(pattern => pattern.test(hostname))) {
      return effectiveSrc;
    }
  } catch (error) {
    console.warn('Unable to analyze track URL for cache busting:', error);
  }

  const separator = effectiveSrc.includes('?') ? '&' : '?';
  return `${effectiveSrc}${separator}t=${Date.now()}`;
}

async function attemptNetworkResume() {
  const source = networkRecoveryState.source;
  if (!source) return false;
  debugLog('network-resume-attempt', { sourceType: source.type, src: source.src });

  return new Promise(async resolve => {
    let resolved = false;
    const resolveOnce = value => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    let track = null;
    let originalSrc = source.src;
    let trackTitle = source.title;

  if (source.type === 'radio') {
      if (isInsecureMediaSrc(source.src)) {
        reportInsecureSource(source.title, source.src);
        return resolveOnce(false);
      }
      const normalizedSrc = normalizeMediaSrc(source.src);
      const reloadSrc = appendCacheBuster(buildTrackFetchUrl(normalizedSrc, { sourceType: 'stream', forceProxy: true }));
      setCrossOrigin(audioPlayer, reloadSrc);
      audioPlayer.src = reloadSrc;
      audioPlayer.currentTime = 0;
      handleAudioLoad(reloadSrc, source.title, true, {
        silent: true,
        autoPlay: networkRecoveryState.wasPlaying,
        disableSlowGuard: true,
        resumeTime: 0,
        onReady: () => resolveOnce(true),
        onError: () => resolveOnce(false)
      });
      return;
    }

    try {
      const album = albums[source.albumIndex];
      if (!album) return resolveOnce(false);
      track = album.tracks[source.trackIndex];
      if (!track) return resolveOnce(false);
      trackTitle = track.title || source.title;
      originalSrc = track.src;

      const resolvedSrc = await resolveSunoAudioSrc(track.src);
      const fetchUrl = buildTrackFetchUrl(resolvedSrc, track);
      const response = await fetch(fetchUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      audioPlayer.src = objectUrl;
      handleAudioLoad(objectUrl, track.title, false, {
        silent: true,
        autoPlay: networkRecoveryState.wasPlaying,
        resumeTime: networkRecoveryState.resumeTime,
        disableSlowGuard: true,
        onReady: () => resolveOnce(true),
        onError: () => resolveOnce(false)
      });
    } catch (error) {
      console.error('Failed to fetch track during recovery:', error);
      debugLog('network-resume-error', { message: error?.message || String(error) });
      if (isLikelyCorsBlock(error) && originalSrc) {
        const fallbackSrc = appendCacheBuster(buildTrackFetchUrl(originalSrc, track));
        console.warn('[network-recovery] Direct stream fallback after CORS block.', { fallbackSrc });
        setCrossOrigin(audioPlayer, fallbackSrc);
        audioPlayer.src = fallbackSrc;
        handleAudioLoad(fallbackSrc, trackTitle || source.title, false, {
          silent: true,
          autoPlay: networkRecoveryState.wasPlaying,
          resumeTime: networkRecoveryState.resumeTime,
          disableSlowGuard: true,
          onReady: () => resolveOnce(true),
          onError: () => resolveOnce(false)
        });
        return;
      }
      resolveOnce(false);
    }
  });
}

function startNetworkRecovery(reason = 'network') {
  if (networkRecoveryState.active) return;

  const source = captureCurrentSource();
  if (!source) return;

  stopPlaybackWatchdog(false);
  networkRecoveryState.active = true;
  networkRecoveryState.retryCount = 0;
  networkRecoveryState.wasPlaying = !audioPlayer.paused && !audioPlayer.ended;
  const currentTime = audioPlayer.currentTime || 0;
  networkRecoveryState.resumeTime = currentRadioIndex === -1
    ? Math.max(currentTime - 3, 0)
    : 0;
  networkRecoveryState.source = source;
  hideRetryButton();
  setPlaybackStatus(PlaybackStatus.buffering, { message: 'Reconnecting...' });
  document.getElementById('progressBar').style.display = 'none';
  console.log(`Starting network recovery due to: ${reason}`);
  debugLog('network-recovery-start', { reason });

  const attemptReconnect = async () => {
    if (!networkRecoveryState.active) return;
    if (networkRecoveryState.timerId) {
      clearTimeout(networkRecoveryState.timerId);
      networkRecoveryState.timerId = null;
    }
    if (!navigator.onLine) {
      console.log('Waiting for network connection to return...');
      return;
    }

    if (attemptSoftRecovery(`recovery-${reason}`)) {
      finishNetworkRecovery();
      return;
    }

    networkRecoveryState.lastAttemptAt = Date.now();
    const success = await attemptNetworkResume();
    if (success) {
      console.log('Network recovery successful.');
      debugLog('network-recovery-success', { reason });
      finishNetworkRecovery();
      if (!audioPlayer.paused) {
        startPlaybackWatchdog();
      }
    } else {
      networkRecoveryState.retryCount += 1;
      debugLog('network-recovery-failure', { reason, attempt: networkRecoveryState.retryCount });
      if (networkRecoveryState.retryCount > networkRecoveryState.maxRetries) {
        console.warn('Network recovery exhausted. Please retry manually.');
        setPlaybackStatus(PlaybackStatus.failed, { message: 'Playback needs a tap to retry.' });
        showRetryButton('Retry playback');
        cancelNetworkRecovery();
        return;
      }
      console.log('Network recovery attempt failed, will retry.');
      const delay = computeRecoveryDelay(networkRecoveryState.retryCount);
      networkRecoveryState.timerId = setTimeout(attemptReconnect, delay);
    }
  };

  networkRecoveryState.attemptFn = attemptReconnect;
  attemptReconnect();
}

function savePlaylist() {
  localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(albums[playlistAlbumIndex].tracks));
}

function addTrackToPlaylistByIndex(albumIndex, trackIndex) {
  if (albumIndex === playlistAlbumIndex || trackIndex < 0) return;
  const track = albums[albumIndex].tracks[trackIndex];
  const playlist = albums[playlistAlbumIndex].tracks;
  if (!playlist.some(t => t.src === track.src)) {
    const trackToAdd = { ...track };
    if (!trackToAdd.lrc) {
      trackToAdd.lrc = trackToAdd.src.replace(/\.mp3$/, '.lrc');
    }
    playlist.push(trackToAdd);
    savePlaylist();
    alert('Track added to playlist!');
    if (pendingAlbumIndex === playlistAlbumIndex) {
      updateTrackListModal();
    }
  }
}

function addCurrentTrackToPlaylist() {
  addTrackToPlaylistByIndex(currentAlbumIndex, currentTrackIndex);
}

function removeTrackFromPlaylist(index) {
  const playlist = albums[playlistAlbumIndex].tracks;
  if (index >= 0 && index < playlist.length) {
    playlist.splice(index, 1);
    savePlaylist();
    if (currentAlbumIndex === playlistAlbumIndex) {
      if (index < currentTrackIndex) {
        currentTrackIndex--;
      } else if (index === currentTrackIndex) {
        stopMusic();
        currentTrackIndex = -1;
      }
    }
    updateTrackListModal();
  }
}

    function getAlbumTrackOrder(album) {
      if (!album || !Array.isArray(album.tracks)) return [];
      return album.tracks
        .map((track, index) => {
          const order = Number.isFinite(track?.trackNumber)
            ? track.trackNumber
            : (Number.isFinite(track?.index) ? track.index : index);
          return { track, index, order };
        })
        .sort((a, b) => a.order - b.order || a.index - b.index);
    }

    function resolveAlbumContinuationTrack(direction = 1) {
      const album = albums[currentAlbumIndex];
      if (!album || !Array.isArray(album.tracks)) return null;
      const ordered = getAlbumTrackOrder(album);
      if (!ordered.length) return null;
      const currentOrderIndex = ordered.findIndex(item => item.index === currentTrackIndex);
      if (currentOrderIndex === -1) return null;
      const nextIndex = (currentOrderIndex + direction + ordered.length) % ordered.length;
      const nextItem = ordered[nextIndex];
      return nextItem ? { ...nextItem, albumIndex: currentAlbumIndex } : null;
    }

    function updateNextTrackInfo() {
      const nextInfo = document.getElementById('nextTrackInfo');
      if (!nextInfo || playbackContext.mode === 'radio' || currentRadioIndex !== -1) {
        if (nextInfo) nextInfo.textContent = '';
        return;
      }

      const album = albums[currentAlbumIndex];
      const sequentialNext = resolveAlbumContinuationTrack(1);
      const nextTrack = shuffleMode && shuffleQueue.length > 0
        ? shuffleQueue[0]
        : (sequentialNext ? sequentialNext.track : null);

      if (!nextTrack) {
        nextInfo.textContent = '';
        return;
      }

      nextInfo.textContent = `Next: ${nextTrack.title || 'Up next'}`;
    }

    function buildShuffleQueue() {
      shuffleQueue = [];
      if (!shuffleMode) {
        updateNextTrackInfo();
        return;
      }
      if (shuffleScope === 'all') {
        albums.forEach((album, albumIdx) => {
          album.tracks.forEach((track, trackIdx) => {
            if (!(albumIdx === currentAlbumIndex && trackIdx === currentTrackIndex)) {
              shuffleQueue.push({
                albumIndex: albumIdx,
                trackIndex: trackIdx,
                title: track.title,
                src: track.src
              });
            }
          });
        });
      } else if (shuffleScope === 'album') {
        albums[currentAlbumIndex].tracks.forEach((track, idx) => {
          if (idx !== currentTrackIndex) {
            shuffleQueue.push({
              albumIndex: currentAlbumIndex,
              trackIndex: idx,
              title: track.title,
              src: track.src
            });
          }
        });
      }
      for (let i = shuffleQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffleQueue[i], shuffleQueue[j]] = [shuffleQueue[j], shuffleQueue[i]];
      }
      updateNextTrackInfo();
    }

    const saveStateConfig = {
      timerId: null,
      intervalMs: 4000
    };

    function getActiveTrackInfo() {
      const album = albums[currentAlbumIndex];
      const track = album && Array.isArray(album.tracks) ? album.tracks[currentTrackIndex] : null;
      if (!album || !track) return null;
      return { album, track };
    }

    function resolveTrackId(track, fallbackTitle) {
      if (track && track.id) return String(track.id);
      const title = track?.title || fallbackTitle || '';
      return title ? slugifyLabel(title) : '';
    }

    function resolveStationId(station) {
      const name = station?.name ? String(station.name) : '';
      return name ? slugifyLabel(name) : '';
    }

    function buildLastPlayedPayload({ positionSeconds = 0, timestamp = Date.now() } = {}) {
      const fallbackTitle = lastTrackTitle || '';
      const mode = playbackContext.mode || inferPlaybackMode({
        stationId: playbackContext.currentSource?.stationId,
        srcUrl: playbackContext.currentSource?.src,
        sourceType: playbackContext.currentSource?.type
      });

      if (mode === 'radio') {
        const station = currentRadioIndex >= 0 ? radioStations[currentRadioIndex] : null;
        const srcUrl = normalizeMediaSrc(
          station?.url || playbackContext.currentSource?.src || lastTrackSrc || ''
        );
        return {
          mode: 'radio',
          stationId: resolveStationId(station) || playbackContext.currentSource?.stationId,
          srcUrl,
          positionSeconds: 0,
          timestamp
        };
      }

      const trackInfo = getActiveTrackInfo();
      const track = trackInfo?.track;
      const srcUrl = normalizeMediaSrc(track?.src || playbackContext.currentSource?.src || lastTrackSrc || '');
      return {
        mode: 'track',
        trackId: resolveTrackId(track, fallbackTitle),
        srcUrl,
        positionSeconds: Number.isFinite(positionSeconds) && positionSeconds >= 0 ? positionSeconds : 0,
        timestamp
      };
    }

    function persistLastPlayed(payload) {
      if (!payload || !payload.srcUrl) return;
      updateLastPlayedContext(payload);
      writeStorageItem(localStorage, LAST_PLAYED_STORAGE_KEY, JSON.stringify(payload));
    }

    function savePlayerState() {
      const trackInfo = getActiveTrackInfo();
      const track = trackInfo?.track || null;
      const title = track?.title ? track.title : lastTrackTitle;
      const trackId = resolveTrackId(track, title);
      const position = Number.isFinite(audioPlayer.currentTime) ? audioPlayer.currentTime : 0;
      const lastPlayedPayload = buildLastPlayedPayload({ positionSeconds: position });
      const playerState = {
        albumIndex: currentAlbumIndex,
        trackIndex: currentTrackIndex,
        radioIndex: currentRadioIndex,
        playbackPosition: position,
        position,
        title,
        trackId,
        shuffleMode: shuffleMode,
        shuffleScope: shuffleScope, // Save shuffleScope
        timestamp: new Date().getTime()
      };
      persistLastPlayed(lastPlayedPayload);
      writeStorageItem(localStorage, PLAYER_STATE_STORAGE_KEY, JSON.stringify(playerState));
      console.log('Player state saved:', playerState);
    }

    function schedulePlayerStateSave(immediate = false) {
      if (immediate) {
        if (saveStateConfig.timerId) {
          clearTimeout(saveStateConfig.timerId);
          saveStateConfig.timerId = null;
        }
        savePlayerState();
        return;
      }

      if (saveStateConfig.timerId) return;

      saveStateConfig.timerId = setTimeout(() => {
        saveStateConfig.timerId = null;
        savePlayerState();
        const now = Date.now();
        if (playbackStatus !== PlaybackStatus.failed && now - lastSaveStatusAt > 15000) {
          lastSaveStatusAt = now;
          updateInlineStatus('Saving your place...', { showRetry: false });
          setTimeout(() => {
            if (playbackStatus === PlaybackStatus.playing) {
              updateInlineStatus('', { showRetry: false });
            }
          }, 1600);
        }
      }, saveStateConfig.intervalMs);
    }

    window.addEventListener('beforeunload', () => schedulePlayerStateSave(true));

    function loadLyrics(url) {
      lyricLines = [];

      if (!lyricsContainer) {
        console.warn('Lyrics container not found; skipping lyric rendering.');
        return;
      }

      lyricsContainer.innerHTML = '';
      if (!url) return;

      if (typeof Lyric !== 'function') {
        console.warn('Lyric parser unavailable; skipping lyric rendering.');
        return;
      }

      const loadLyricsContent = () => {
        fetch(url)
          .then(res => res.text())
          .then(text => {
            try {
              const parser = new Lyric(text);
              lyricLines = parser.lines || [];
              lyricsContainer.innerHTML = lyricLines.map(l => `<p>${l.txt}</p>`).join('');
            } catch (e) {
              console.error('Lyric parse error:', e);
            }
          })
          .catch(() => {
            lyricsContainer.innerHTML = '';
          });
      };

      if (lyricsContainer.style.display === 'block') {
        loadLyricsContent();
      } else if (typeof window.runWhenIdle === 'function') {
        window.runWhenIdle(loadLyricsContent, 1200);
      } else {
        setTimeout(loadLyricsContent, 800);
      }
    }

    function highlightLyric(currentTime) {
      if (!lyricLines.length) return;
      const currentMs = currentTime * 1000;
      let active = 0;
      for (let i = 0; i < lyricLines.length; i++) {
        if (currentMs >= lyricLines[i].time) {
          active = i;
        } else {
          break;
        }
      }
      const lines = lyricsContainer.getElementsByTagName('p');
      for (let i = 0; i < lines.length; i++) {
        lines[i].classList.toggle('active', i === active);
      }
    }

    function toggleLyrics() {
      if (lyricsContainer.style.display === 'none' || !lyricsContainer.style.display) {
        lyricsContainer.style.display = 'block';
      } else {
        lyricsContainer.style.display = 'none';
      }
    }

    function renderStorylinerPanel(container, album) {
      if (!container || !album || !album.storyliner) return;
      const { origin, inspiration, whyItMatters } = album.storyliner;
      const entries = [
        { label: 'Origin', value: origin },
        { label: 'Inspiration', value: inspiration },
        { label: 'Why it matters', value: whyItMatters }
      ].filter(item => typeof item.value === 'string' && item.value.trim());

      if (!entries.length) return;

      const panel = document.createElement('div');
      panel.className = 'storyliner-panel';

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'storyliner-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      const panelId = `storyliner-${slugifyLabel(album.name)}-${Date.now()}`;
      toggle.setAttribute('aria-controls', panelId);
      toggle.textContent = 'Storyliner';

      const cards = document.createElement('div');
      cards.className = 'storyliner-cards';
      cards.id = panelId;
      cards.hidden = true;

      const renderCards = () => {
        if (cards.childElementCount) return;
        entries.forEach(entry => {
          const card = document.createElement('div');
          card.className = 'storyliner-card';
          const title = document.createElement('h4');
          title.textContent = entry.label;
          const body = document.createElement('p');
          body.textContent = entry.value;
          card.appendChild(title);
          card.appendChild(body);
          cards.appendChild(card);
        });
      };

      toggle.addEventListener('click', () => {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        const nextState = !isExpanded;
        toggle.setAttribute('aria-expanded', String(nextState));
        if (nextState) {
          renderCards();
        }
        cards.hidden = !nextState;
      });

      if (typeof window.runWhenIdle === 'function') {
        window.runWhenIdle(renderCards, 1600);
      }

      panel.appendChild(toggle);
      panel.appendChild(cards);
      container.appendChild(panel);
    }

    function updateTrackListModal(prefetchDurations = false) {
      const modal = document.getElementById('trackModal');
      const modalVisible = modal && getComputedStyle(modal).display !== 'none';
      const shouldPrefetchDurations = (prefetchDurations || modalVisible) && !isSlowConnection;
      const albumCatalog = Array.isArray(window.albums)
        ? window.albums
        : (typeof albums !== 'undefined' && Array.isArray(albums) ? albums : []);
      const trackListContainer = document.querySelector('.track-list');
      const trackModalTitle = document.getElementById('trackModalTitle');
      if (!trackListContainer || !trackModalTitle) {
        console.warn('[player] Track modal elements are missing.');
        return;
      }

      const renderTrackModalState = (message, { status = 'loading', showRetry = false, onRetry } = {}) => {
        trackListContainer.innerHTML = '';
        const placeholder = document.createElement('div');
        placeholder.className = `track-placeholder track-placeholder-${status}`;
        const copy = document.createElement('p');
        copy.textContent = message;
        placeholder.appendChild(copy);

        if (showRetry) {
          const retryBtn = document.createElement('button');
          retryBtn.type = 'button';
          retryBtn.className = 'status-retry-button';
          retryBtn.textContent = 'Retry';
          retryBtn.addEventListener('click', () => {
            if (typeof onRetry === 'function') {
              onRetry();
              return;
            }
            if (typeof window.loadFullLibraryData === 'function') {
              window.loadFullLibraryData({ reason: 'track-modal-retry', immediate: true })
                .finally(() => updateTrackListModal(true));
              return;
            }
            updateTrackListModal(true);
          });
          placeholder.appendChild(retryBtn);
        }

        trackListContainer.appendChild(placeholder);
      };

      if (!albumCatalog.length) {
        renderTrackModalState('Track not available.', { status: 'empty', showRetry: true });
        reportLibraryIssue('Tracks are unavailable. Please refresh the page.');
        return;
      }

      const resolver = window.trackModalUtils?.resolveModalAlbum;
      const describer = window.trackModalUtils?.describeTrackAvailability;
      const resolved = typeof resolver === 'function'
        ? resolver({ albums: albumCatalog, pendingAlbumIndex, currentAlbumIndex })
        : {
            album: albumCatalog[pendingAlbumIndex ?? currentAlbumIndex] || albumCatalog[0],
            albumIndex: pendingAlbumIndex ?? currentAlbumIndex ?? 0,
            usedFallback: false,
            reason: null
          };

      let albumIndex = resolved.albumIndex;
      let album = resolved.album;

      if (!album || albumIndex < 0 || albumIndex >= albumCatalog.length) {
        albumIndex = 0;
        album = albumCatalog[albumIndex] || null;
      }

      if (pendingAlbumIndex !== null && pendingAlbumIndex !== albumIndex) {
        pendingAlbumIndex = albumIndex;
      }
      if (currentAlbumIndex !== albumIndex) {
        currentAlbumIndex = albumIndex;
      }

      const trackModalMeta = document.getElementById('trackModalMeta');
      if (trackModalMeta) {
        trackModalMeta.innerHTML = '';
      }

      const availability = typeof describer === 'function'
        ? describer(album)
        : { status: album && Array.isArray(album.tracks) && album.tracks.length ? 'ready' : 'loading', message: 'Loading tracks…' };

      if (availability.status !== 'ready') {
        renderTrackModalState(availability.message || 'Loading tracks…', {
          status: availability.status,
          showRetry: availability.status !== 'loading',
          onRetry: availability.status === 'empty'
            ? () => {
                if (album?.rssFeed && typeof window.requestRssIngestion === 'function') {
                  window.requestRssIngestion({ reason: 'track-modal-empty', immediate: true })
                    .finally(() => updateTrackListModal(true));
                  return;
                }
                if (typeof window.loadFullLibraryData === 'function') {
                  window.loadFullLibraryData({ reason: 'track-modal-empty', immediate: true })
                    .finally(() => updateTrackListModal(true));
                  return;
                }
                updateTrackListModal(true);
              }
            : undefined
        });
        if (availability.status === 'loading' && typeof window.loadFullLibraryData === 'function') {
          window.loadFullLibraryData({ reason: 'track-modal-loading', immediate: true })
            .then(() => updateTrackListModal(true));
        }
        return;
      }

      trackModalTitle.textContent = album.name;

      if (trackModalMeta) {
        if (album.detailsUrl) {
          const docsLink = document.createElement('a');
          docsLink.href = album.detailsUrl;
          docsLink.target = '_blank';
          docsLink.rel = 'noopener';
          docsLink.className = 'track-meta-link';
          docsLink.textContent = 'Open album markdown';
          trackModalMeta.appendChild(docsLink);
        }

        if (album.rssFeed) {
          const feedNote = document.createElement('p');
          feedNote.className = 'track-meta-note';
          feedNote.textContent = 'Tracks refresh automatically from the RSS feed.';
          trackModalMeta.appendChild(feedNote);
        }

        renderStorylinerPanel(trackModalMeta, album);
      }
      trackListContainer.innerHTML = '';

      if (album.rssFeed && typeof window.requestRssIngestion === 'function') {
        window.requestRssIngestion({ reason: 'rss-track-list', immediate: false });
      }

      const banner = document.getElementById('latestTracksBanner');
      const bannerCopy = document.getElementById('latestTracksCopy');
      const bannerActions = document.getElementById('latestTracksActions');
      if (banner && bannerCopy && bannerActions) {
        bannerActions.innerHTML = '';
        if (Array.isArray(latestTracks) && latestTracks.length) {
          const albumName = albumCatalog[albumIndex].name;
          const albumHighlights = latestTracks.filter(track => track.albumName === albumName);
          const displayTracks = albumHighlights.length ? albumHighlights : latestTracks;
          const formatList = items => {
            if (items.length <= 1) {
              return items[0] || '';
            }
            if (items.length === 2) {
              return `${items[0]} and ${items[1]}`;
            }
            return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
          };
          const trackMentions = displayTracks.map(track => {
            if (albumHighlights.length) {
              return `“${track.title}”`;
            }
            return `“${track.title}” from ${track.albumName}`;
          });
          const hasFreshDrops = displayTracks.some(track => track.isFreshDrop);
          const intro = albumHighlights.length
            ? hasFreshDrops
              ? `Fresh Drops in ${albumName}`
              : `New in ${albumName}`
            : hasFreshDrops
              ? 'Fresh Drops'
              : trackMentions.length === 1
                ? 'Latest arrival on Àríyò AI'
                : 'Latest arrivals across Àríyò AI';
          const landingVerb = trackMentions.length === 1 ? 'just landed' : 'have just landed';
          const actionPrompt = trackMentions.length === 1
            ? 'Tap the button below to play instantly.'
            : 'Tap a button below to play instantly.';
          const announcementCopy = trackMentions.length
            ? `${intro}: ${formatList(trackMentions)} ${landingVerb}. ${actionPrompt}`
            : '';
          bannerCopy.textContent = announcementCopy.trim();
          latestTracks.forEach(track => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'latest-track-button';
            button.textContent = `▶ Play “${track.title}”`;
            button.setAttribute('aria-label', `Play the latest track ${track.title}`);
            button.addEventListener('click', () => {
              const albumIdx = albumCatalog.findIndex(album => album.name === track.albumName);
              if (albumIdx === -1) {
                return;
              }
              const trackIdx = albumCatalog[albumIdx].tracks.findIndex(albumTrack => albumTrack.title === track.title && albumTrack.src === track.src);
              if (trackIdx === -1) {
                pendingAlbumIndex = albumIdx;
                currentAlbumIndex = albumIdx;
                updateTrackListModal();
                return;
              }
              currentAlbumIndex = albumIdx;
              pendingAlbumIndex = null;
              closeTrackList(true);
              selectTrack(albumCatalog[albumIdx].tracks[trackIdx].src, albumCatalog[albumIdx].tracks[trackIdx].title, trackIdx);
            });
            bannerActions.appendChild(button);
          });
          banner.hidden = false;
        } else {
          banner.hidden = true;
          bannerCopy.textContent = '';
          bannerActions.innerHTML = '';
        }
      }

      // Build an array of track indices and shuffle them (except for playlist)
      let trackIndices = albumCatalog[albumIndex].tracks.map((_, i) => i);
      if (albumIndex !== playlistAlbumIndex) {
        for (let i = trackIndices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [trackIndices[i], trackIndices[j]] = [trackIndices[j], trackIndices[i]];
        }
      }

      // Only render the first page so slow networks don't parse the full library at once.
      const totalTracks = trackIndices.length;
      const defaultLimit = albumIndex === playlistAlbumIndex ? totalTracks : TRACKS_PAGE_SIZE;
      const currentLimit = trackDisplayState.get(albumIndex) || defaultLimit;
      const visibleIndices = trackIndices.slice(0, currentLimit);

      visibleIndices.forEach(index => {
        const track = albumCatalog[albumIndex].tracks[index];
        // Use cached duration if available, otherwise fetch it
        const displayDuration = track.duration
          ? formatTime(track.duration)
          : track.isLive
            ? 'Live'
            : '';

        const item = document.createElement('div');
        item.className = 'track-item';
        const externalUrl = track.shareUrl || track.sourceUrl || track.externalUrl;
        const hasPlayableSrc = Boolean(track.src);
        if (hasPlayableSrc) {
          item.addEventListener('click', () => {
            currentAlbumIndex = albumIndex;
            pendingAlbumIndex = null;
            closeTrackList(true);
            selectTrack(track.src, track.title, index);
          });
        } else {
          item.classList.add('track-item-disabled');
          item.setAttribute('aria-disabled', 'true');
        }

        const textWrapper = document.createElement('div');
        textWrapper.className = 'track-text';

        const titleRow = document.createElement('div');
        titleRow.className = 'track-title-row';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'track-title';
        titleSpan.textContent = track.title;
        titleRow.appendChild(titleSpan);

        let durationBadge = null;
        if (displayDuration) {
          durationBadge = document.createElement('span');
          durationBadge.className = 'track-duration';
          durationBadge.textContent = displayDuration;
          titleRow.appendChild(durationBadge);
        }

        textWrapper.appendChild(titleRow);

        const subtitleText = track.subtitle || track.rssSource;
        if (subtitleText) {
          const subtitle = document.createElement('div');
          subtitle.className = 'track-subtitle';
          subtitle.textContent = subtitleText;
          textWrapper.appendChild(subtitle);
        }

        item.appendChild(textWrapper);
        if (!hasPlayableSrc && externalUrl) {
          const externalCta = document.createElement('a');
          externalCta.className = 'track-external-link';
          externalCta.href = externalUrl;
          externalCta.target = '_blank';
          externalCta.rel = 'noopener noreferrer';
          externalCta.textContent = 'Listen on Suno';
          externalCta.addEventListener('click', event => event.stopPropagation());
          item.appendChild(externalCta);
        }

        const actions = document.createElement('div');
        actions.className = 'track-actions';

        if (albumIndex === playlistAlbumIndex) {
          const removeBtn = document.createElement('button');
          removeBtn.textContent = '✖';
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeTrackFromPlaylist(index);
          });
          actions.appendChild(removeBtn);
        } else {
          const addBtn = document.createElement('button');
          addBtn.textContent = '➕';
          addBtn.setAttribute('aria-label', 'Add to playlist');
          addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addTrackToPlaylistByIndex(albumIndex, index);
          });
          actions.appendChild(addBtn);
        }

        item.appendChild(actions);
        trackListContainer.appendChild(item);

        if (shouldPrefetchDurations && !track.duration && !track.isLive) {
          const tempAudio = new Audio();
          tempAudio.preload = 'metadata';
          const previewSrc = buildTrackFetchUrl(normalizeMediaSrc(track.src), track);
          setCrossOrigin(tempAudio, previewSrc);
          tempAudio.src = previewSrc;
          tempAudio.addEventListener('loadedmetadata', () => {
            track.duration = tempAudio.duration;
            if (albumIndex === playlistAlbumIndex) {
              updateTrackListModal();
            } else if (durationBadge) {
              durationBadge.textContent = formatTime(track.duration);
            }
          });
          tempAudio.addEventListener('error', () => {
            track.duration = 0;
            if (albumIndex === playlistAlbumIndex) {
              updateTrackListModal();
            } else if (durationBadge) {
              durationBadge.textContent = 'N/A';
            }
          });
        }
      });

      if (totalTracks > currentLimit) {
        const loadMore = document.createElement('button');
        loadMore.type = 'button';
        loadMore.className = 'track-load-more';
        loadMore.textContent = 'Load more tracks';
        loadMore.addEventListener('click', () => {
          trackDisplayState.set(albumIndex, currentLimit + TRACKS_PAGE_SIZE);
          updateTrackListModal();
        });
        trackListContainer.appendChild(loadMore);
      }
      console.log(`Track list updated for album: ${albumCatalog[albumIndex].name}`);
    }

    const stationsPerPage = 6;
let stationDisplayCounts = { nigeria: 0, westAfrica: 0, international: 0 };
const STREAM_STATUS_TTL_MS = 3 * 60 * 1000;
const STREAM_STATUS_TIMEOUT_MS = 9000;
const STREAM_STATUS_RETRY_DELAY_MS = 600;
const STREAM_STATUS_MAX_RETRIES = 1;
const streamStatusCache = new Map();
const streamStatusInFlight = new Map();
const streamProbeDetails = new Map();

// Region Classifier
function classifyStation(station) {
  const nigeriaLocations = ["Nigeria", "Lagos", "Ibadan", "Abuja", "Abeokuta", "Uyo", "Jos", "Kaduna", "Nassarawa", "Abia", "Ondo", "Calabar", "Aba"];
  const westAfricaLocations = ["Accra", "Ghana", "West Africa"];

  if (nigeriaLocations.includes(station.location)) return "nigeria";
  if (westAfricaLocations.includes(station.location)) return "westAfrica";
  return "international";
}

function isNonProductionEnv() {
  if (typeof process !== 'undefined' && process.env && typeof process.env.NODE_ENV === 'string') {
    return process.env.NODE_ENV !== 'production';
  }
  if (typeof window !== 'undefined') {
    return ['localhost', '127.0.0.1'].includes(window.location.hostname);
  }
  return false;
}

function isRadioDebugEnabled() {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('radioDebug') === '1') return true;
  try {
    return localStorage.getItem('radioDebug') === '1';
  } catch (error) {
    return false;
  }
}

const STREAM_PROBE_LOGGING = isNonProductionEnv();
const RADIO_AUDIO_LOGGING = STREAM_PROBE_LOGGING || isRadioDebugEnabled();

function logStreamProbe(eventName, payload) {
  if (!STREAM_PROBE_LOGGING) return;
  console.debug('[radio-probe]', eventName, payload);
}

function getAudioDebugState(audioElement) {
  const error = audioElement?.error;
  return {
    paused: audioElement?.paused,
    currentTime: audioElement?.currentTime,
    readyState: audioElement?.readyState,
    networkState: audioElement?.networkState,
    muted: audioElement?.muted,
    volume: audioElement?.volume,
    src: audioElement?.src,
    currentSrc: audioElement?.currentSrc,
    error: error
      ? { code: error.code, message: error.message || error.toString?.() }
      : null
  };
}

function logRadioAudioEvent(eventName, detail = {}) {
  if (!RADIO_AUDIO_LOGGING) return;
  console.debug('[radio-audio]', eventName, {
    ...detail,
    audio: getAudioDebugState(audioPlayer)
  });
}

if (RADIO_AUDIO_LOGGING) {
  [
    'loadstart',
    'loadedmetadata',
    'canplay',
    'playing',
    'waiting',
    'stalled',
    'error',
    'ended',
    'pause'
  ].forEach(eventName => {
    audioPlayer.addEventListener(eventName, () => {
      logRadioAudioEvent(`audio-${eventName}`, {
        mode: currentRadioIndex >= 0 ? 'radio' : 'track'
      });
    });
  });
}

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function getCachedStreamStatus(url) {
  const cached = streamStatusCache.get(url);
  if (!cached) return null;
  if ((Date.now() - cached.timestamp) < STREAM_STATUS_TTL_MS) {
    return cached;
  }
  streamStatusCache.delete(url);
  return null;
}

function setCachedStreamStatus(url, status, detail) {
  streamStatusCache.set(url, { status, timestamp: Date.now() });
  if (detail) {
    streamProbeDetails.set(url, detail);
  }
}

function updateRadioDebugPanel() {
  if (!isRadioDebugEnabled()) return;
  const panel = document.getElementById('radioDebugPanel');
  if (!panel) return;
  panel.hidden = false;
  const list = panel.querySelector('tbody');
  if (!list) return;
  list.innerHTML = '';
  streamProbeDetails.forEach(detail => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${detail.name || 'Unknown'}</td>
      <td>${detail.status}</td>
      <td>${detail.via || '-'}</td>
      <td>${detail.timingMs ? `${Math.round(detail.timingMs)}ms` : '-'}</td>
      <td class="debug-url">${detail.resolvedUrl || detail.url || '-'}</td>
      <td>${detail.errorType || '-'}</td>
    `;
    list.appendChild(row);
  });
}

function ensureRadioDebugPanel() {
  if (!isRadioDebugEnabled()) return;
  const modalContent = document.querySelector('#radioModal .modal-content');
  if (!modalContent || document.getElementById('radioDebugPanel')) return;

  const panel = document.createElement('div');
  panel.id = 'radioDebugPanel';
  panel.className = 'radio-debug-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <h4>Radio probe diagnostics</h4>
    <p class="radio-debug-note">Dev-only view of stream checks (enable with ?radioDebug=1).</p>
    <div class="radio-debug-table">
      <table>
        <thead>
          <tr>
            <th>Station</th>
            <th>Status</th>
            <th>Probe</th>
            <th>Timing</th>
            <th>Resolved URL</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;
  modalContent.appendChild(panel);
}

// Grouped Stations
let groupedStations = { nigeria: [], westAfrica: [], international: [] };
function buildGroupedStations() {
  groupedStations = { nigeria: [], westAfrica: [], international: [] };
  const stationList = Array.isArray(window.radioStations)
    ? window.radioStations
    : (typeof radioStations !== 'undefined' && Array.isArray(radioStations) ? radioStations : []);
  if (!stationList.length) {
    reportLibraryIssue('Radio stations are unavailable. Please refresh the page.');
    return;
  }
  stationList.forEach(station => {
    const region = classifyStation(station);
    groupedStations[region].push(station);
  });
}
buildGroupedStations();

async function checkStreamStatus(url, stationName = '') {
      if (isSlowConnection) {
        return { status: 'unavailable', reason: 'slow-network' };
      }

      const cached = getCachedStreamStatus(url);
      if (cached) {
        return { status: cached.status, reason: 'cache' };
      }

      if (streamStatusInFlight.has(url)) {
        return streamStatusInFlight.get(url);
      }

      const probePromise = (async () => {
        ensureRadioDebugPanel();
        let attempt = 0;
        let lastResult = null;
        while (attempt <= STREAM_STATUS_MAX_RETRIES) {
          attempt += 1;
          lastResult = await probeStreamUrl(url, stationName);
          if (lastResult.status === 'online') break;
          if (lastResult.status === 'offline') break;
          if (attempt <= STREAM_STATUS_MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, STREAM_STATUS_RETRY_DELAY_MS));
          }
        }
        setCachedStreamStatus(url, lastResult.status, lastResult);
        streamStatusInFlight.delete(url);
        updateRadioDebugPanel();
        return { status: lastResult.status, reason: lastResult.reason || lastResult.errorType || 'probe' };
      })();

      streamStatusInFlight.set(url, probePromise);
      return probePromise;
    }

function classifyAudioError(audioElement) {
  const code = audioElement?.error?.code;
  const mediaError = typeof MediaError !== 'undefined' ? MediaError : {};
  if (code && code === mediaError.MEDIA_ERR_NETWORK) {
    return { status: 'offline', errorType: 'network' };
  }
  if (code && code === mediaError.MEDIA_ERR_DECODE) {
    return { status: 'unavailable', errorType: 'decode' };
  }
  if (code && code === mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
    return { status: 'unavailable', errorType: 'not-supported' };
  }
  if (code && code === mediaError.MEDIA_ERR_ABORTED) {
    return { status: 'unavailable', errorType: 'aborted' };
  }
  return { status: 'offline', errorType: 'unknown-error' };
}

function looksLikePlaylist(url) {
  return /\.(pls|m3u)(\?|$)/i.test(url) && !/\.m3u8(\?|$)/i.test(url);
}

function extractPlaylistStreamUrl(text, baseUrl) {
  if (!text) return null;
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const plsLine = lines.find(line => /^file\d+=/i.test(line));
  if (plsLine) {
    return plsLine.split('=').slice(1).join('=').trim();
  }
  const m3uLine = lines.find(line => !line.startsWith('#'));
  if (m3uLine) {
    return m3uLine;
  }
  return null;
}

async function resolveRadioStreamUrl(rawUrl, stationName) {
  const normalized = normalizeMediaSrc(rawUrl);
  if (!normalized) {
    return { url: '', resolvedUrl: '', reason: 'invalid-url' };
  }
  if (!looksLikePlaylist(normalized)) {
    return { url: normalized, resolvedUrl: normalized };
  }

  const playlistUrl = buildRadioProxyUrl(normalized);
  const start = nowMs();
  try {
    const response = await fetch(playlistUrl, { cache: 'no-store' });
    const timingMs = nowMs() - start;
    if (!response.ok) {
      logStreamProbe('playlist-fetch-failed', {
        station: stationName,
        url: normalized,
        status: response.status,
        timingMs
      });
      return { url: normalized, resolvedUrl: normalized, reason: `playlist-status-${response.status}` };
    }
    const text = await response.text();
    const candidate = extractPlaylistStreamUrl(text, normalized);
    if (!candidate) {
      return { url: normalized, resolvedUrl: normalized, reason: 'playlist-empty' };
    }
    const resolved = new URL(candidate, normalized).toString();
    logStreamProbe('playlist-resolved', {
      station: stationName,
      url: normalized,
      resolved,
      timingMs
    });
    return { url: normalized, resolvedUrl: resolved, playlist: true };
  } catch (error) {
    logStreamProbe('playlist-fetch-error', {
      station: stationName,
      url: normalized,
      error: error?.message || String(error)
    });
    return { url: normalized, resolvedUrl: normalized, reason: 'playlist-fetch-error' };
  }
}

async function probeWithAudio(url, stationName) {
  return new Promise(resolve => {
    const audio = new Audio();
    let settled = false;
    const start = nowMs();
    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onReady);
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('error', onError);
      audio.src = '';
    };

    const onReady = () => {
      if (settled) return;
      settled = true;
      const timingMs = nowMs() - start;
      const resolvedUrl = audio.currentSrc || audio.src;
      cleanup();
      resolve({
        status: 'online',
        via: 'audio',
        timingMs,
        resolvedUrl
      });
    };

    const onError = () => {
      if (settled) return;
      settled = true;
      const timingMs = nowMs() - start;
      const classification = classifyAudioError(audio);
      const resolvedUrl = audio.currentSrc || audio.src;
      cleanup();
      resolve({
        status: classification.status,
        via: 'audio',
        timingMs,
        resolvedUrl,
        errorType: classification.errorType
      });
    };

    setCrossOrigin(audio, url);
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', onReady, { once: true });
    audio.addEventListener('canplay', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.src = url;
    audio.load();

    setTimeout(() => {
      if (settled) return;
      settled = true;
      const timingMs = nowMs() - start;
      cleanup();
      resolve({
        status: 'unavailable',
        via: 'audio',
        timingMs,
        errorType: 'timeout'
      });
    }, STREAM_STATUS_TIMEOUT_MS);
  });
}

async function probeWithFetch(url, stationName) {
  if (typeof fetch === 'undefined') {
    return { status: 'unavailable', via: 'fetch', errorType: 'no-fetch' };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STREAM_STATUS_TIMEOUT_MS);
  const start = nowMs();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-1' },
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timer);
    const timingMs = nowMs() - start;
    const isProxyBlock = response.status === 400 || response.status === 403;
    const status = response.ok || response.status === 206
      ? 'online'
      : isProxyBlock
        ? 'unavailable'
        : 'offline';
    const detail = {
      status,
      via: 'fetch',
      timingMs,
      httpStatus: response.status,
      contentType: response.headers.get('content-type') || '',
      resolvedUrl: response.headers.get('x-proxy-upstream') || response.url,
      errorType: response.ok || response.status === 206 ? null : (isProxyBlock ? 'proxy-blocked' : 'http-error')
    };
    return detail;
  } catch (error) {
    clearTimeout(timer);
    const timingMs = nowMs() - start;
    const isCors = isLikelyCorsBlock(error);
    return {
      status: isCors ? 'unavailable' : 'offline',
      via: 'fetch',
      timingMs,
      errorType: isCors ? 'cors' : (error?.name || 'fetch-error')
    };
  }
}

async function probeStreamUrl(rawUrl, stationName) {
  const start = nowMs();
  const resolved = await resolveRadioStreamUrl(rawUrl, stationName);
  if (!resolved.resolvedUrl) {
    return {
      name: stationName,
      url: rawUrl,
      resolvedUrl: '',
      status: 'unavailable',
      via: 'resolver',
      timingMs: Math.round(nowMs() - start),
      errorType: resolved.reason || 'invalid-url'
    };
  }
  const resolvedUrl = resolved.resolvedUrl || resolved.url;
  let probeUrl = resolvedUrl;
  try {
    const probeTarget = new URL(resolvedUrl, window.location.origin);
    if (probeTarget.protocol === 'http:') {
      probeUrl = buildRadioProxyUrl(resolvedUrl);
    }
  } catch (error) {
    probeUrl = resolvedUrl;
  }

  logStreamProbe('probe-start', {
    station: stationName,
    url: rawUrl,
    resolvedUrl: probeUrl,
    serviceWorkerActive: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller)
  });

  const audioResult = await probeWithAudio(probeUrl, stationName);
  if (audioResult.status === 'online') {
    const detail = {
      name: stationName,
      url: rawUrl,
      resolvedUrl: audioResult.resolvedUrl || probeUrl,
      status: 'online',
      via: audioResult.via,
      timingMs: audioResult.timingMs
    };
    logStreamProbe('probe-audio-success', detail);
    return detail;
  }

  const fetchResult = await probeWithFetch(buildRadioProxyUrl(resolved.resolvedUrl || resolved.url), stationName);
  const finalStatus = fetchResult.status === 'online'
    ? 'online'
    : audioResult.status === 'offline'
      ? 'offline'
      : fetchResult.status;

  const detail = {
    name: stationName,
    url: rawUrl,
    resolvedUrl: audioResult.resolvedUrl || fetchResult.resolvedUrl || probeUrl,
    status: finalStatus,
    via: audioResult.status === 'offline' ? audioResult.via : fetchResult.via,
    timingMs: Math.round(nowMs() - start),
    httpStatus: fetchResult.httpStatus,
    contentType: fetchResult.contentType,
    errorType: audioResult.errorType || fetchResult.errorType || resolved.reason || null
  };

  if (finalStatus === 'offline') {
    logStreamProbe('probe-offline', detail);
  } else {
    logStreamProbe('probe-unavailable', detail);
  }
  return detail;
}

    function updateRadioListModal() {
      stationDisplayCounts = { nigeria: 0, westAfrica: 0, international: 0 };
      if (!Array.isArray(window.radioStations) || window.radioStations.length === 0) {
        reportLibraryIssue('Radio stations are unavailable. Please refresh the page.');
        return;
      }
      buildGroupedStations();

      ["nigeria", "westAfrica", "international"].forEach(region => {
        const container = document.getElementById(`${region}-stations`);
        if (container) {
          container.innerHTML = '';
        }
        const loadMoreButton = document.querySelector(`button[onclick="loadMoreStations('${region}')"]`);
        if (loadMoreButton) {
          loadMoreButton.style.display = 'inline-block';
        }
        loadMoreStations(region);
      });

      console.log("Grouped and displayed radio stations by region");
    }

function syncAlbumIndexToCurrentTrack() {
  if (!lastTrackSrc) return;
  for (let albumIdx = 0; albumIdx < albums.length; albumIdx += 1) {
    const trackIdx = albums[albumIdx].tracks.findIndex(track => track.src === lastTrackSrc);
    if (trackIdx >= 0) {
      currentAlbumIndex = albumIdx;
      currentTrackIndex = trackIdx;
      return;
    }
  }
}

function loadMoreStations(region) {
  const container = document.getElementById(`${region}-stations`);
  const stations = groupedStations[region] || [];
  if (!container || !stations.length) {
    const loadMoreButton = document.querySelector(`button[onclick="loadMoreStations('${region}')"]`);
    if (loadMoreButton) {
      loadMoreButton.style.display = 'none';
    }
    return;
  }
  const start = stationDisplayCounts[region];
  const end = start + stationsPerPage;

  stations.slice(start, end).forEach((station, index) => {
    const stationLink = document.createElement("a");
    stationLink.href = "#";
    const globalIndex = radioStations.indexOf(station);
    stationLink.onclick = () => selectRadio(station.url, `${station.name} - ${station.location}`, globalIndex, station.logo);

    const statusSpan = document.createElement('span');
    statusSpan.style.marginLeft = '10px';
    statusSpan.textContent = ' (Checking...)';

    checkStreamStatus(station.url, station.name).then(result => {
        const status = result.status;
        if (status === 'checking') {
            statusSpan.textContent = ' (Checking...)';
            statusSpan.style.color = '';
            return;
        }
        if (status === 'unavailable') {
            statusSpan.textContent = ' (Unavailable)';
            statusSpan.style.color = 'gold';
            return;
        }
        statusSpan.textContent = status === 'online' ? ' (Online)' : ' (Offline)';
        statusSpan.style.color = status === 'online' ? 'lightgreen' : 'red';
        if (status === 'offline') {
            stationLink.style.textDecoration = 'line-through';
        }
    });

    stationLink.textContent = `${station.name} (${station.location})`;
    stationLink.appendChild(statusSpan);
    container.appendChild(stationLink);
  });

  stationDisplayCounts[region] = end;

  if (stationDisplayCounts[region] >= stations.length) {
    document.querySelector(`button[onclick="loadMoreStations('${region}')"]`).style.display = 'none';
  }
}

    function selectAlbum(albumIndex) {
      console.log("selectAlbum called with index: ", albumIndex);
      const album = albums[albumIndex];
      if (!album || !Array.isArray(album.tracks)) {
        console.warn('[player] Album selection failed: tracks are unavailable.', { albumIndex });
        return;
      }
      console.log(`Selecting album: ${album.name}`);
      pendingAlbumIndex = albumIndex;
      currentRadioIndex = -1;
      updateTrackListModal();
      openTrackList();
    }

function applyTrackUiState(albumIndex, trackIndex) {
    const album = albums[albumIndex];
    if (!album || !album.tracks || !album.tracks[trackIndex]) return null;

    const track = album.tracks[trackIndex];
    currentAlbumIndex = albumIndex;
    currentTrackIndex = trackIndex;
    currentRadioIndex = -1;

    const params = new URLSearchParams(window.location.search);
    params.delete('station');
    params.set('album', slugify(album.name));
    params.set('track', slugify(track.title));
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);

    lastTrackSrc = track.src;
    lastTrackTitle = track.title;
    lastTrackIndex = trackIndex;

    trackInfo.textContent = track.title;
    const displayArtist = deriveTrackArtist(album.artist, track.title);
    trackArtist.textContent = `Artist: ${displayArtist}`;
    const year = track.releaseYear ?? album.releaseYear ?? null;
    trackYear.textContent = `Release Year: ${year || 'Unknown'}`;
    trackAlbum.textContent = `Album: ${album.name}`;
    const asaNoteSeed = track.id ? track.id : (track.title ? slugifyLabel(track.title) : undefined);
    updateAsaNote(asaNoteSeed);
    setPlaybackContext({
      mode: 'track',
      source: {
        type: 'track',
        albumIndex,
        trackIndex,
        src: track.src,
        title: track.title,
        sourceType: track.sourceType,
        isLive: track.isLive,
        trackId: resolveTrackId(track, track.title)
      }
    });
    albumCover.src = album.cover;
    loadLyrics(track.lrc);
    document.getElementById('progressBar').style.display = 'block';
    progressBar.style.width = '0%';
    updateNextTrackInfo();
    updateMediaSession();
    if (window.AriyoSeo) {
      window.AriyoSeo.updateStructuredDataForPlayback({ type: 'track', track, album });
    }
    return track;
}

function resolveTrackForDirection(direction) {
    if (currentRadioIndex !== -1) return null;
    if (shuffleMode) {
        if (shuffleQueue.length === 0) {
            buildShuffleQueue();
        }
        const next = shuffleQueue.shift();
        return next ? { ...next } : null;
    }
    const next = resolveAlbumContinuationTrack(direction);
    if (!next || !next.track) return null;
    return {
        src: next.track.src,
        title: next.track.title,
        albumIndex: next.albumIndex,
        trackIndex: next.index
    };
}

function updateNeutralBufferMessage(message = 'Hunting for the best connection...') {
  const modalStatus = document.getElementById('statusMessage');
  if (modalStatus) {
    modalStatus.textContent = message;
  }
  showBufferingState(message);
}

function createPlaybackErrorHandler(trackMeta, normalizedSrc) {
  let retried = false;

  return () => {
    updateNeutralBufferMessage();
    if (retried) {
      return;
    }

    retried = true;
    const retryUrl = appendCacheBuster(buildTrackFetchUrl(normalizedSrc, trackMeta));
    setCrossOrigin(audioPlayer, retryUrl);
    audioPlayer.src = retryUrl;
    audioHealer.trackSource(retryUrl, trackMeta.title, { live: Boolean(trackMeta.isLive) });
    handleAudioLoad(retryUrl, trackMeta.title, false, {
      live: Boolean(trackMeta.isLive),
      silent: true,
      onReady: hideBufferingState,
      onError: () => updateNeutralBufferMessage('Still buffering…')
    });
  };
}

function primePlaybackSource({
  normalizedSrc,
  title,
  trackMeta,
  live = false,
  isInitialLoad = false,
  onReady = null,
  onError = null,
  resumeTime = null
}) {
  const selectionToken = Symbol('playback-selection');
  audioPlayer._selectionToken = selectionToken;

  const immediateUrl = buildTrackFetchUrl(normalizedSrc, trackMeta);
  setCrossOrigin(audioPlayer, immediateUrl);
  audioPlayer.src = immediateUrl;
  audioHealer.trackSource(immediateUrl, title, { live });
  audioPlayer.currentTime = 0;
  handleAudioLoad(immediateUrl, title, isInitialLoad, {
    live,
    onReady,
    onError,
    resumeTime
  });

  resolveSunoAudioSrc(normalizedSrc)
    .then(resolved => {
      if (audioPlayer._selectionToken !== selectionToken) return;
      if (!resolved || resolved === normalizedSrc) return;

      const resolvedUrl = buildTrackFetchUrl(resolved, trackMeta);
      const readyThreshold = typeof HTMLMediaElement !== 'undefined'
        ? HTMLMediaElement.HAVE_CURRENT_DATA
        : 2;
      const isBuffering = playbackStatus === PlaybackStatus.preparing
        || playbackStatus === PlaybackStatus.buffering;

      if (audioPlayer.src !== immediateUrl || !isBuffering || audioPlayer.readyState >= readyThreshold) {
        return;
      }

      setCrossOrigin(audioPlayer, resolvedUrl);
      audioPlayer.src = resolvedUrl;
      audioHealer.trackSource(resolvedUrl, title, { live });
      audioPlayer.currentTime = 0;
      handleAudioLoad(resolvedUrl, title, isInitialLoad, {
        live,
        onReady,
        onError,
        resumeTime,
        disableSlowGuard: true,
        allowCorsRetry: false
      });
      attemptPlay();
    })
    .catch(error => {
      console.warn('[player] Suno resolve skipped:', error);
    });

  if (trackMeta?.sourceType === 'stream') {
    resolveRadioStreamUrl(normalizedSrc, title)
      .then(resolved => {
        if (audioPlayer._selectionToken !== selectionToken) return;
        if (!resolved || !resolved.resolvedUrl || resolved.resolvedUrl === normalizedSrc) return;

        const resolvedUrl = buildTrackFetchUrl(resolved.resolvedUrl, trackMeta);
        const readyThreshold = typeof HTMLMediaElement !== 'undefined'
          ? HTMLMediaElement.HAVE_CURRENT_DATA
          : 2;
        const isPlaying = playbackStatus === PlaybackStatus.playing;

        if (audioPlayer.src !== immediateUrl || isPlaying || audioPlayer.readyState >= readyThreshold) {
          return;
        }

        logRadioAudioEvent('stream-resolved', {
          station: title,
          resolvedUrl,
          originalUrl: normalizedSrc
        });

        setCrossOrigin(audioPlayer, resolvedUrl);
        audioPlayer.src = resolvedUrl;
        audioHealer.trackSource(resolvedUrl, title, { live });
        audioPlayer.currentTime = 0;
        handleAudioLoad(resolvedUrl, title, isInitialLoad, {
          live,
          onReady,
          onError,
          resumeTime,
          disableSlowGuard: true,
          allowCorsRetry: false
        });
        attemptPlay();
      })
      .catch(error => {
        console.warn('[player] Radio resolve skipped:', error);
      });
  }
}

function setPendingRadioSelection({ index, title, src }) {
  pendingRadioSelection = {
    index,
    title,
    src,
    requestedAt: Date.now()
  };
  logRadioAudioEvent('station-selected', {
    stationIndex: index,
    station: title,
    url: src
  });
}

function confirmPendingRadioSelection(reason, detail = {}) {
  if (!pendingRadioSelection) return;
  if (currentRadioIndex !== pendingRadioSelection.index) return;
  const payload = {
    stationIndex: pendingRadioSelection.index,
    station: pendingRadioSelection.title,
    url: pendingRadioSelection.src,
    ...detail
  };
  pendingRadioSelection = null;
  if (typeof window !== 'undefined' && typeof window.requestCloseRadioList === 'function') {
    window.requestCloseRadioList(reason, payload);
  }
}


function selectTrack(src, title, index, rebuildQueue = true, resumeTime = null) {
      console.log(`[selectTrack] called with: src=${src}, title=${title}, index=${index}`);
      pendingRadioSelection = null;
      resetOfflineFallback();
      cancelNetworkRecovery();
      clearSlowBufferRescue();
      void warmupAudioOutput();
      void resumeAudioContext();
      audioPlayer.autoplay = true;
      ensureAudiblePlayback();
      if (isTrackModalOpen()) {
        closeTrackList(true);
      }
      console.log(`[selectTrack] Selecting track: ${title} from album: ${albums[currentAlbumIndex].name}`);
      pendingAlbumIndex = null;
      currentTrackIndex = index;
      currentRadioIndex = -1;
      lastKnownFiniteDuration = null;
      const track = applyTrackUiState(currentAlbumIndex, currentTrackIndex);
      const safeTrack = track || {};
      const trackMeta = {
        ...safeTrack,
        title: safeTrack.title || title,
        sourceType: safeTrack.sourceType || albums[currentAlbumIndex]?.sourceType || 'local'
      };
      persistLastPlayed(buildLastPlayedPayload({ positionSeconds: 0 }));
      const isLiveTrack = Boolean(trackMeta && trackMeta.isLive);
      showBufferingState('Loading your track...');
      albumCover.style.display = 'none';
      hideRetryButton();
      setTurntableSpin(false);

      const rawSrc = trackMeta?.src || src;
      if (isInsecureMediaSrc(rawSrc)) {
        reportInsecureSource(title, rawSrc);
        return;
      }
      const normalizedSrc = normalizeMediaSrc(rawSrc);
      if (!normalizedSrc) {
        setPlaybackStatus(PlaybackStatus.failed, { message: 'This track is unavailable right now.' });
        return;
      }
      audioPlayer.preload = isSlowConnection ? 'metadata' : 'auto';
      ensurePreconnect(normalizedSrc);
      const handlePlaybackError = createPlaybackErrorHandler(trackMeta, normalizedSrc);
      primePlaybackSource({
        normalizedSrc,
        title,
        trackMeta,
        live: isLiveTrack,
        isInitialLoad: false,
        resumeTime,
        onReady: () => {
          // Keep the track list open for non-user-initiated loads to avoid fighting the UI.
          // The modal is explicitly closed by the track selection UI when needed.
        },
        onError: () => handlePlaybackError()
      });

      // Begin playback immediately after the user selects a track instead of waiting for
      // metadata events. The autoplay safeguards in handleAudioLoad will keep the state
      // consistent if the play promise settles later.
      attemptPlay();

      updateMediaSession();
      showNowPlayingToast(title);
      if (shuffleMode && rebuildQueue) {
        buildShuffleQueue();
      }
    }

function selectRadio(src, title, index, logo) {
      console.log(`[selectRadio] called with: src=${src}, title=${title}, index=${index}`);
      resetOfflineFallback();
      cancelNetworkRecovery();
      clearSlowBufferRescue();
      void warmupAudioOutput();
      void resumeAudioContext();
      audioPlayer.autoplay = true;
      ensureAudiblePlayback();
      console.log(`[selectRadio] Selecting radio: ${title}`);
      setPendingRadioSelection({ index, title, src });
      const station = radioStations[index];
      currentRadioIndex = index;
      updateAsaNote();
      setPlaybackContext({
        mode: 'radio',
        source: {
          type: 'radio',
          index,
          src,
          title,
          stationId: resolveStationId(station)
        }
      });
      persistLastPlayed(buildLastPlayedPayload({ positionSeconds: 0 }));
      if (window.AriyoSeo) {
        window.AriyoSeo.updateStructuredDataForPlayback({ type: 'radio', station });
      }
      currentTrackIndex = -1;
      lastKnownFiniteDuration = null;
      shuffleQueue = [];
      updateNextTrackInfo();
      const params = new URLSearchParams(window.location.search);
      params.delete('album');
      params.delete('track');
      if (station) {
        params.set('station', slugify(station.name));
      } else {
        params.delete('station');
      }
      const newQuery = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${newQuery ? '?' + newQuery : ''}`);
      if (isInsecureMediaSrc(src)) {
        reportInsecureSource(title, src);
        return;
      }
      const normalizedSrc = normalizeMediaSrc(src);
      if (!normalizedSrc) {
        setPlaybackStatus(PlaybackStatus.failed, { message: 'This station is unavailable right now.' });
        return;
      }
      const initialStreamUrl = buildTrackFetchUrl(normalizedSrc, { sourceType: 'stream', forceProxy: true });
      logRadioAudioEvent('stream-initial-url', {
        stationIndex: index,
        station: title,
        originalUrl: normalizedSrc,
        resolvedUrl: initialStreamUrl
      });
      audioPlayer.preload = isSlowConnection ? 'metadata' : 'auto';
      ensurePreconnect(normalizedSrc);
      lastTrackSrc = normalizedSrc;
      lastTrackTitle = title;
      lastTrackIndex = index;
      trackInfo.textContent = title;
      trackArtist.textContent = '';
      trackYear.textContent = '';
      trackAlbum.textContent = 'Radio Stream'; // Clear album for radio
      albumCover.src = logo;
      lyricsContainer.innerHTML = '';
      lyricLines = [];
      stopMusic();
      showBufferingState('Connecting to the station...');
      albumCover.style.display = 'none';
      hideRetryButton();
      document.getElementById('progressBar').style.display = 'block';
      progressBar.style.width = '0%';
      setTurntableSpin(false);
      primePlaybackSource({
        normalizedSrc,
        title,
        trackMeta: { sourceType: 'stream', forceProxy: true },
        live: true,
        isInitialLoad: true
      });
      attemptPlay();
      updateMediaSession();
      showNowPlayingToast(title);
    }

    function retryTrack() {
      if (currentRadioIndex >= 0) {
        selectRadio(lastTrackSrc, lastTrackTitle, lastTrackIndex, radioStations[currentRadioIndex].logo);
      } else {
        selectTrack(lastTrackSrc, lastTrackTitle, lastTrackIndex, false);
      }
    }

    function retryTrackWithDelay() {
      trackInfo.textContent = 'Retrying...';
      showBufferingState('Retrying playback...');
      albumCover.style.display = 'none';
      document.getElementById('progressBar').style.display = 'none';
      hideRetryButton();
      setTurntableSpin(false);
      setTimeout(retryTrack, 3000);
    }

    function hideRetryButton() {
      if (!retryButton) return;
      retryButton.style.display = 'none';
      retryButton.inert = true;
    }

    function showRetryButton(label = 'Retry') {
      if (!retryButton) return;
      retryButton.style.display = 'block';
      retryButton.textContent = label;
      retryButton.inert = false;
    }

    function handleAudioLoad(src, title, isInitialLoad = true, options = {}) {
      const {
        silent = false,
        autoPlay = true,
        resumeTime = null,
        onReady = null,
        onError: onErrorCallback = null,
        disableSlowGuard = false,
        live = currentRadioIndex >= 0,
        allowCorsRetry = true
      } = options;

      audioHealer.trackSource(src, title, { live });
      audioHealer.rebindMetadataHandlers();

      if (disableSlowGuard) {
        clearSlowBufferRescue();
      }

      const previousHandlers = audioPlayer._loadHandlers;
      if (previousHandlers) {
        const {
          onProgress: prevProgress,
          onCanPlayThrough: prevCanPlayThrough,
          onCanPlay: prevCanPlay,
          onLoadedData: prevLoadedData,
          onError: prevError,
          quickStartId: prevQuickStartId,
          playTimeout: prevPlayTimeout
        } = previousHandlers;
        if (prevProgress) {
          audioPlayer.removeEventListener('progress', prevProgress);
        }
        if (prevCanPlayThrough) {
          audioPlayer.removeEventListener('canplaythrough', prevCanPlayThrough);
        }
        if (prevCanPlay) {
          audioPlayer.removeEventListener('canplay', prevCanPlay);
        }
        if (prevLoadedData) {
          audioPlayer.removeEventListener('loadeddata', prevLoadedData);
        }
        if (prevError) {
          audioPlayer.removeEventListener('error', prevError);
        }
        if (prevPlayTimeout) {
          clearTimeout(prevPlayTimeout);
        }
        if (prevQuickStartId && typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(prevQuickStartId);
        }
      }

      const handlerState = { corsRetried: false };
      audioPlayer._loadHandlers = handlerState;

      let playTimeout = null;
      if (!silent) {
        playTimeout = setTimeout(() => {
          console.warn(`Timeout: ${title} is taking a while to buffer, retrying...`);
          startSlowBufferRescue(src, title, resumeTime, autoPlay, { onReady, onError: onErrorCallback });
        }, 5000);
      }
      handlerState.playTimeout = playTimeout;

      const clearPlayTimeout = () => {
        if (playTimeout) {
          clearTimeout(playTimeout);
          playTimeout = null;
        }
        handlerState.playTimeout = null;
      };

      function onProgress() {
        if (audioPlayer.buffered.length > 0 && audioPlayer.duration) {
          const bufferedEnd = audioPlayer.buffered.end(0);
          const duration = audioPlayer.duration;
          progressBar.style.width = `${(bufferedEnd / duration) * 100}%`;
        }
      }
      handlerState.onProgress = onProgress;

      let readyHandled = false;

      const revealPlaybackUi = () => {
        if (!silent) {
          albumCover.style.display = 'block';
          document.getElementById('progressBar').style.display = 'none';
        }
        hideRetryButton();
        clearSlowBufferRescue();
      };

      const handleReady = () => {
        if (readyHandled) return;
        readyHandled = true;
        clearPlayTimeout();
        clearQuickStartDeadline();
        clearBufferingHedge();
        if (handlerState.quickStartId && typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(handlerState.quickStartId);
          handlerState.quickStartId = null;
        }
        revealPlaybackUi();
        if (resumeTime != null && !isNaN(resumeTime)) {
          try {
            audioPlayer.currentTime = resumeTime;
          } catch (err) {
            console.warn('Failed to restore playback position:', err);
          }
        }
        updateMediaSession();
        if (!silent) {
          setPlaybackStatus(PlaybackStatus.buffering, { message: bufferingMessage?.textContent });
          scheduleQuickStartDeadline(src, title, resumeTime);
        }
        if (autoPlay && audioPlayer.paused) {
          attemptPlay();
        } else {
          manageVinylRotation();
        }
        if (typeof onReady === 'function') {
          onReady();
        }
      };

      function onLoadedData() {
        console.log('onLoadedData called');
        handleReady();
      }
      handlerState.onLoadedData = onLoadedData;

      function onPlaying() {
        console.log('onPlaying called');
        handleReady();
      }
      handlerState.onPlaying = onPlaying;

      function onCanPlayThrough() {
        console.log("onCanPlayThrough called");
        console.log(`Stream ${title} can play through`);
        handleReady();
      }
      handlerState.onCanPlayThrough = onCanPlayThrough;

      function onCanPlay() {
        console.log("onCanPlay called");
        console.log(`Stream ${title} can play`);
        handleReady();
      }
      handlerState.onCanPlay = onCanPlay;

      function onError() {
        clearPlayTimeout();
        console.error(`Audio error for ${title}:`, audioPlayer.error);
        if (audioPlayer.error) {
          console.error(`Error code: ${audioPlayer.error.code}, Message: ${audioPlayer.error.message}`);
        }
        console.error(`Album cover src: ${albumCover.src}`);

        const corsBlocked = allowCorsRetry
          && audioPlayer._corsEnabled
          && (isLikelyCorsBlock(audioPlayer.error)
            || (audioPlayer.error && audioPlayer.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED));

        if (corsBlocked && !handlerState.corsRetried) {
          handlerState.corsRetried = true;
          const retryUrl = appendCacheBuster(src);
          console.warn('[cors] Retrying audio without CORS headers.', { retryUrl, title });
          audioPlayer.removeAttribute('crossorigin');
          audioPlayer.src = retryUrl;
          handleAudioLoad(retryUrl, title, false, {
            silent: false,
            autoPlay,
            resumeTime,
            onReady,
            onError: onErrorCallback,
            disableSlowGuard: true,
            live,
            allowCorsRetry: false
          });
          attemptPlay();
          return;
        }

        if (!navigator.onLine || (audioPlayer.error && audioPlayer.error.code === MediaError.MEDIA_ERR_NETWORK)) {
          startNetworkRecovery('load-error');
          if (typeof onErrorCallback === 'function') {
            onErrorCallback();
          }
          return;
        }

        if (!silent) {
          startSlowBufferRescue(src, title, resumeTime, autoPlay, { onReady, onError: onErrorCallback });
        } else if (typeof onErrorCallback === 'function') {
          onErrorCallback();
        }
        if (handlerState.quickStartId && typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(handlerState.quickStartId);
          handlerState.quickStartId = null;
        }
      }
      handlerState.onError = onError;

      audioPlayer.addEventListener('progress', onProgress);
      audioPlayer.addEventListener('loadedmetadata', onCanPlay, { once: true });
      audioPlayer.addEventListener('loadeddata', onLoadedData, { once: true });
      audioPlayer.addEventListener('playing', onPlaying, { once: true });
      audioPlayer.addEventListener('canplaythrough', onCanPlayThrough, { once: true });
      audioPlayer.addEventListener('canplay', onCanPlay, { once: true });
      audioPlayer.addEventListener('error', onError, { once: true });

      if (!disableSlowGuard) {
        clearTimeout(slowBufferRescue.timerId);
        slowBufferRescue.timerId = setTimeout(() => {
          if (readyHandled || audioPlayer.readyState >= (HTMLMediaElement?.HAVE_CURRENT_DATA || 2)) {
            return;
          }
          startSlowBufferRescue(src, title, resumeTime, autoPlay, { onReady, onError: onErrorCallback });
        }, 4000);
      }

      if (typeof requestAnimationFrame === 'function') {
        let quickStartAttempts = 0;
        const quickStartCheck = () => {
          if (readyHandled) {
            handlerState.quickStartId = null;
            return;
          }
          const readyState = audioPlayer.readyState;
          const readyThreshold = typeof HTMLMediaElement !== 'undefined'
            ? HTMLMediaElement.HAVE_CURRENT_DATA
            : 2;
          if (readyState >= readyThreshold) {
            onCanPlay();
          } else if (quickStartAttempts < 120) {
            quickStartAttempts += 1;
            handlerState.quickStartId = requestAnimationFrame(quickStartCheck);
          } else {
            handlerState.quickStartId = null;
          }
        };
        handlerState.quickStartId = requestAnimationFrame(quickStartCheck);
      }

      audioPlayer.load(); // Force load

      if (autoPlay && audioPlayer.paused) {
        attemptPlay();
      }
    }

    function setTurntableSpin(isSpinning) {
      [turntableDisc, turntableGrooves, turntableSheen, albumGrooveOverlay, albumCover].forEach(element => {
        if (!element) return;
        element.classList.toggle('is-spinning', isSpinning);
      });
    }

    function shouldSpinVinyl() {
      return vinylStateUtils.shouldVinylSpin({
        paused: audioPlayer.paused,
        ended: audioPlayer.ended,
        waiting: vinylWaiting,
        readyState: audioPlayer.readyState,
        reducedMotion: prefersReducedMotion()
      });
    }

    function manageVinylRotation() {
      const shouldSpin = shouldSpinVinyl();
      setTurntableSpin(shouldSpin);
      if (lastSpinState !== shouldSpin) {
        lastSpinState = shouldSpin;
        console.info('[vinyl] spin', { active: shouldSpin });
      }
    }

    function playMusic() {
        attemptPlay();
    }

    function attemptPlay() {
      console.log('[attemptPlay] called');
      logAudioEvent('play-attempt');
      debugLog('attempt-play');
      userInitiatedPause = false;
      showPlaySpinner();
      hasUserGesture = true;
      void warmupAudioOutput();
      void resumeAudioContext();
      audioPlayer.preload = isSlowConnection ? 'metadata' : 'auto';
      ensureAudiblePlayback();
      if (!ensureInitialTrackLoaded()) {
        hidePlaySpinner();
        if (trackInfo) {
          trackInfo.textContent = 'Choose a track to start playback.';
        }
        setPlaybackStatus(PlaybackStatus.idle);
        manageVinylRotation();
        return;
      }
      const hasBufferedAudio = audioPlayer.readyState >= (HTMLMediaElement?.HAVE_CURRENT_DATA || 2);
      if (hasBufferedAudio) {
        hideBufferingState();
      } else if (playbackStatus !== PlaybackStatus.playing && playbackStatus !== PlaybackStatus.paused) {
        setPlaybackStatus(PlaybackStatus.preparing, { message: 'Starting playback...' });
      }
      scheduleFirstPlayGuard();
      scheduleSilentStartGuard();
      albumCover.style.display = 'block';
      if (typeof window !== 'undefined' && typeof window.stopYouTubePlayback === 'function') {
        try {
          window.stopYouTubePlayback();
        } catch (error) {
          console.warn('Unable to stop YouTube playback before starting media player:', error);
        }
      }
      // Avoid reloading when buffered audio is already present to keep playback instant
      if (!hasBufferedAudio) {
        try { audioPlayer.load(); } catch (_) {}
      }
      const playPromise = audioPlayer.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('[attemptPlay] Playback started successfully.');
          debugLog('playback-started');
          clearQuickStartDeadline();
          hidePlaySpinner();
          const progressBarElement = document.getElementById('progressBar');
          if (progressBarElement) {
            progressBarElement.style.display = 'block';
          }
          if (lastTrackTitle) {
            trackInfo.textContent = lastTrackTitle;
          }
          audioPlayer.removeEventListener('timeupdate', updateTrackTime);
          audioPlayer.addEventListener('timeupdate', updateTrackTime);
          recordPlaybackProgress(audioPlayer.currentTime || 0);
          console.log(`Playing: ${trackInfo.textContent}`);
          schedulePlayerStateSave();
          if (isFirstPlay) {
            gsap.fromTo(albumCover,
              { scale: 1 },
              { scale: 1.1, yoyo: true, repeat: 1, duration: 0.3, ease: "bounce.out" }
            );
            isFirstPlay = false;
          }
        }).catch(error => {
          console.error(`[attemptPlay] Autoplay was prevented for: ${trackInfo.textContent}. Error: ${error}`);
          debugLog('playback-error', { error: error?.name || error?.message });
          handlePlayError(error, trackInfo.textContent);
        });
      }
    }

    function handlePlayError(error, title) {
      clearQuickStartDeadline();
      const isAutoplayBlocked = error && (error.name === 'NotAllowedError' || error.name === 'AbortError');
      if (!audioPlayer.src) {
        trackInfo.textContent = 'Choose a track to start playback.';
        hideRetryButton();
        setPlaybackStatus(PlaybackStatus.idle);
        return;
      }

      setPlaybackStatus(
        PlaybackStatus.failed,
        { message: isAutoplayBlocked ? 'Tap play to enable audio.' : 'Playback was interrupted. Tap play to resume.' }
      );
      albumCover.style.display = 'block';
      document.getElementById('progressBar').style.display = 'none';
      vinylWaiting = false;
      setTurntableSpin(false);
      console.error(`Error playing ${title}:`, error);

      if (!navigator.onLine || (error && error.code === MediaError.MEDIA_ERR_NETWORK)) {
        startNetworkRecovery('play-error');
        return;
      }

      // Surface retry control immediately to keep listeners in control
      hidePlaySpinner();
      showRetryButton(isAutoplayBlocked ? 'Tap to enable audio' : 'Retry playback');
    }

function pauseMusic() {
    cancelNetworkRecovery();
    userInitiatedPause = true;
    clearQuickStartDeadline();
    clearSilentStartGuard();
    audioPlayer.pause();
    vinylWaiting = false;
    manageVinylRotation();
        audioPlayer.removeEventListener('timeupdate', updateTrackTime);
        stopPlaybackWatchdog();
        console.log('Paused');
        schedulePlayerStateSave(true);
        setPlaybackStatus(PlaybackStatus.paused);
    syncMediaSessionPlaybackState();
    }

function stopMusic() {
    cancelNetworkRecovery();
    userInitiatedPause = true;
    clearQuickStartDeadline();
    clearSilentStartGuard();
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    vinylWaiting = false;
    manageVinylRotation();
        audioPlayer.removeEventListener('timeupdate', updateTrackTime);
        stopPlaybackWatchdog();
        seekBar.value = 0;
        trackDuration.textContent = '0:00 / 0:00';
        console.log('Stopped');
        schedulePlayerStateSave(true);
        setPlaybackStatus(PlaybackStatus.stopped);
    syncMediaSessionPlaybackState();
}

function updateTrackTime() {
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration;
    const hasFiniteDuration = Number.isFinite(duration) && duration > 0;
    const now = Date.now();
    if (currentTime > 0 && now - lastTrackTimeUiUpdateAt < TRACK_TIME_THROTTLE_MS) {
      return;
    }
    lastTrackTimeUiUpdateAt = now;

  if (currentTime > 0) {
    clearSilentStartGuard();
  }

    manageVinylRotation();

    if (hasFiniteDuration) {
      lastKnownFiniteDuration = duration;
    }

    // 🔒 If it's a radio stream, don't format duration
    const isRadioMode = playbackContext.mode === 'radio' || currentRadioIndex >= 0;
    if (isRadioMode) {
      trackDuration.textContent = `${formatTime(currentTime)} / Live`;
      seekBar.style.display = 'none'; // hide seekbar for radio
      schedulePlayerStateSave();
      recordPlaybackProgress(currentTime);
      return;
    }

    const effectiveDuration = hasFiniteDuration
      ? duration
      : lastKnownFiniteDuration;

    if (effectiveDuration && effectiveDuration > 0) {
      trackDuration.textContent = `${formatTime(currentTime)} / ${formatTime(effectiveDuration)}`;
      seekBar.value = Math.min((currentTime / effectiveDuration) * 100, 100);
      seekBar.style.display = 'block';
      schedulePlayerStateSave();
      recordPlaybackProgress(currentTime);
    } else {
      trackDuration.textContent = `${formatTime(currentTime)} / Loading...`;
      seekBar.style.display = 'block';
    }
  highlightLyric(currentTime);
  if (isNaN(duration) || duration <= 0) {
      recordPlaybackProgress(currentTime);
  }
}

    function formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs < 10 ? '0' + secs : secs}`;
    }

    function seekAudio(value) {
      if (audioPlayer.duration && currentRadioIndex === -1) {
        const newTime = (value / 100) * audioPlayer.duration;
        audioPlayer.currentTime = newTime;
        updateTrackTime();
      }
    }

    seekBar.addEventListener('input', () => seekAudio(seekBar.value));
    seekBar.addEventListener('touchstart', () => {
      audioPlayer.pause();
    }, { passive: true });
    seekBar.addEventListener('touchend', () => {
      seekAudio(seekBar.value);
      if (!audioPlayer.paused) audioPlayer.play();
    });

    audioPlayer.addEventListener('loadedmetadata', updateTrackTime);
    ['canplay', 'canplaythrough'].forEach(eventName => {
      audioPlayer.addEventListener(eventName, () => {
        vinylWaiting = false;
        manageVinylRotation();
      });
    });

    function handleTrackEnded() {
      console.log("Track ended, selecting next track...");
      audioPlayer.removeEventListener('timeupdate', updateTrackTime);
      manageVinylRotation();
      stopPlaybackWatchdog(false);
      setPlaybackStatus(PlaybackStatus.stopped);

      if (playbackContext.mode === 'radio' || currentRadioIndex !== -1) return; // Only advance albums/podcasts, not live radio

      if (shuffleScope === 'repeat') {
        selectTrack(
          albums[currentAlbumIndex].tracks[currentTrackIndex].src,
          albums[currentAlbumIndex].tracks[currentTrackIndex].title,
          currentTrackIndex,
          false
        );
        return;
      }

      // Use the shared switchTrack helper so shuffle/all albums stay in sync
      // and the UI reflects the upcoming selection.
      switchTrack(1, true);
    }

    audioPlayer.addEventListener('ended', handleTrackEnded);

    audioPlayer.addEventListener('pause', event => {
      vinylWaiting = false;
      setPlaybackStatus(PlaybackStatus.paused);
      manageVinylRotation();
      if (event && event.target && event.target.paused) {
        stopPlaybackWatchdog();
      }

      if (document.visibilityState === 'hidden') {
        ensureBackgroundPlayback('hidden-pause');
      } else {
        syncMediaSessionPlaybackState();
      }
    });
    audioPlayer.addEventListener('ended', () => {
      vinylWaiting = false;
      manageVinylRotation();
    });

    audioPlayer.addEventListener('playing', () => {
      audioPlayer.removeEventListener('timeupdate', updateTrackTime); // clear old listener
      audioPlayer.addEventListener('timeupdate', updateTrackTime);    // reattach freshly
      updateTrackTime();  // update UI instantly
      recordPlaybackProgress(audioPlayer.currentTime || 0);
      startPlaybackWatchdog();
      console.log(`🎧 Time tracking active: ${trackInfo.textContent}`);
      syncMediaSessionPlaybackState();
      clearFirstPlayGuard();
      hideBufferingState();
      hidePlaySpinner();
      vinylWaiting = false;
      setPlaybackStatus(PlaybackStatus.playing);
      manageVinylRotation(); // spin the turntable if needed
      ensureAudiblePlayback();
      if (currentRadioIndex >= 0) {
        confirmPendingRadioSelection('station-playing', {
          resolvedUrl: audioPlayer.currentSrc || audioPlayer.src
        });
      }
    });

    audioPlayer.addEventListener('error', () => {
      clearFirstPlayGuard();
      hidePlaySpinner();
      setPlaybackStatus(PlaybackStatus.failed, { message: 'Playback failed. Tap retry to continue.' });
      vinylWaiting = false;
      manageVinylRotation();
      showRetryButton('Retry playback');
    });
    audioPlayer.addEventListener('stalled', () => {
      scheduleFirstPlayGuard();
      setPlaybackStatus(PlaybackStatus.buffering, { message: 'Buffering…' });
      manageVinylRotation();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        ensureBackgroundPlayback('visibilitychange');
      } else {
        syncMediaSessionPlaybackState();
      }
    });

    ['pagehide', 'freeze'].forEach(eventName => {
      window.addEventListener(eventName, () => ensureBackgroundPlayback(eventName));
    });

    const BACKGROUND_PING_MS = 8000;
    setInterval(() => {
      if (document.visibilityState !== 'hidden') return;
      ensureBackgroundPlayback('background-ping');
    }, BACKGROUND_PING_MS);

function handleNetworkEvent(event) {
  if (networkRecoveryState.active) return;
  if (audioPlayer.paused) return;
  debugLog('network-event', { type: event.type });
  if (!navigator.onLine) {
    startNetworkRecovery(event.type);
    return;
  }

  const haveFutureData = typeof HTMLMediaElement !== 'undefined'
    ? HTMLMediaElement.HAVE_FUTURE_DATA
    : 3;

  if (audioPlayer.readyState >= haveFutureData) {
    if (attemptSoftRecovery(event.type)) {
      return;
    }
  }

  if (audioPlayer.readyState < haveFutureData) {
    if (networkRecoveryTimer) {
      clearTimeout(networkRecoveryTimer);
    }

    networkRecoveryTimer = setTimeout(() => {
      networkRecoveryTimer = null;

      if (networkRecoveryState.active || audioPlayer.paused) return;
      if (!navigator.onLine) {
        startNetworkRecovery(`${event.type}-offline`);
        return;
      }

      if (audioPlayer.readyState < haveFutureData) {
        console.warn(`Playback reported ${event.type}. Initiating proactive recovery after grace period.`);
        startNetworkRecovery(event.type);
      }
    }, 1500);
  } else if (networkRecoveryTimer) {
    clearTimeout(networkRecoveryTimer);
    networkRecoveryTimer = null;
  }
}

window.addEventListener('offline', () => {
  if (!audioPlayer.paused) {
    startNetworkRecovery('offline-event');
  }
});
window.addEventListener('online', () => {
  if (networkRecoveryState.active && typeof networkRecoveryState.attemptFn === 'function') {
    networkRecoveryState.attemptFn();
  }
});

audioPlayer.addEventListener('stalled', handleNetworkEvent);
audioPlayer.addEventListener('suspend', handleNetworkEvent);
audioPlayer.addEventListener('waiting', handleNetworkEvent);

function switchTrack(direction, isAuto = false) {
  const shouldAutoPlay = isAuto || !audioPlayer.paused;

  const isRadioMode = playbackContext.mode === 'radio' || currentRadioIndex !== -1;
  if (isRadioMode) {
    if (currentRadioIndex === -1) {
      return;
    }
    const stationCount = radioStations.length;
    let newIndex;
    if (shuffleMode) {
      newIndex = Math.floor(Math.random() * stationCount);
    } else {
      newIndex = (currentRadioIndex + direction + stationCount) % stationCount;
    }
    const station = radioStations[newIndex];
    selectRadio(station.url, `${station.name} - ${station.location}`, newIndex, station.logo);
  } else {
    if (shuffleMode) {
      if (shuffleQueue.length === 0) {
        buildShuffleQueue();
      }
      const next = shuffleQueue.shift();
      if (next) {
        currentAlbumIndex = next.albumIndex;
        selectTrack(next.src, next.title, next.trackIndex, false);
        updateNextTrackInfo();
      }
    } else { // No shuffle
      const next = resolveAlbumContinuationTrack(direction);
      if (!next || !next.track) return;
      currentTrackIndex = next.index;
      selectTrack(
        next.track.src,
        next.track.title,
        currentTrackIndex
      );
    }
  }

  if (shouldAutoPlay) {
    const attemptAutoplay = () => {
      const playPromise = audioPlayer.play();
      if (playPromise) {
        playPromise.catch(err => console.warn('Autoplay failed:', err));
      }
      manageVinylRotation();
    };

    if (audioPlayer.readyState >= (typeof HTMLMediaElement !== 'undefined' ? HTMLMediaElement.HAVE_FUTURE_DATA : 3)) {
      attemptAutoplay();
    } else {
      audioPlayer.addEventListener('canplay', attemptAutoplay, { once: true });
    }
  }

  updateMediaSession();
}

function nextTrack() {
  switchTrack(1);
  showNowPlayingToast(trackInfo.textContent);
}

function previousTrack() {
  switchTrack(-1);
  showNowPlayingToast(trackInfo.textContent);
}

function isTypingTarget(target) {
  if (!target) return false;
  const tagName = target.tagName ? target.tagName.toLowerCase() : '';
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

function handleGlobalShortcuts(event) {
  if (event.defaultPrevented || isTypingTarget(event.target)) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  switch (event.code) {
    case 'Space':
    case 'KeyK':
      event.preventDefault();
      if (audioPlayer.paused) {
        playMusic();
      } else {
        pauseMusic();
      }
      break;
    case 'ArrowRight':
      event.preventDefault();
      audioPlayer.currentTime = Math.min((audioPlayer.currentTime || 0) + 5, audioPlayer.duration || audioPlayer.currentTime || 0);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      audioPlayer.currentTime = Math.max((audioPlayer.currentTime || 0) - 5, 0);
      break;
    case 'ArrowUp':
      event.preventDefault();
      audioPlayer.volume = Math.min(1, (audioPlayer.volume || 0) + 0.05);
      break;
    case 'ArrowDown':
      event.preventDefault();
      audioPlayer.volume = Math.max(0, (audioPlayer.volume || 0) - 0.05);
      break;
    case 'KeyN':
      event.preventDefault();
      nextTrack();
      break;
    case 'KeyP':
      event.preventDefault();
      previousTrack();
      break;
    case 'KeyL':
      event.preventDefault();
      addCurrentTrackToPlaylist();
      break;
    case 'KeyS':
      if (typeof window.openShareMenu === 'function') {
        event.preventDefault();
        window.openShareMenu();
      }
      break;
    case 'KeyQ':
      if (typeof window.openTrackList === 'function') {
        event.preventDefault();
        window.openTrackList();
      }
      break;
    default:
      break;
  }
}

document.addEventListener('keydown', handleGlobalShortcuts);

window.addEventListener('ariyo:library-ready', event => {
  if (event?.detail?.source !== 'full') return;
  syncAlbumIndexToCurrentTrack();
  buildGroupedStations();
  if (typeof populateAlbumList === 'function') {
    populateAlbumList();
  }
  if (isTrackModalOpen()) {
    updateTrackListModal();
  }
});

if (typeof window !== 'undefined') {
  Object.assign(window, {
    playMusic,
    pauseMusic,
    stopMusic,
    nextTrack,
    previousTrack,
    toggleShuffle,
    retryTrack,
    addCurrentTrackToPlaylist,
    toggleLyrics,
    loadMoreStations,
    selectAlbum,
    reportLibraryIssue
  });
}
