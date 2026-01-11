/**
 * Audio playback flow overview
 * -----------------------------
 * When the user taps play, we immediately:
 * 1) Update the UI to a lightweight "connecting" state so it never looks idle.
 * 2) Start playback and arm a timeout watchdog. If playback does not reach a
 *    playable state within PLAYBACK_START_TIMEOUT_MS, we treat it as a soft
 *    failure and retry automatically.
 * 3) Retry up to PLAYBACK_MAX_RETRIES before surfacing a calm, actionable
 *    error message to the listener. All technical details are logged to the
 *    console for developers but not shown to users.
 * 4) Success (canplay/playing) clears timers, removes the loading indicator,
 *    and keeps the rest of the UI responsive. Switching tracks cancels any
 *    pending attempts to avoid ghost timers or stuck loading states.
 */

(function () {
  const deckAudioA = document.getElementById('audioPlayer');
  const deckAudioB = document.getElementById('audioDeckB');
  const resolveSunoAudioSrc = window.resolveSunoAudioSrc || (async src => src);
  const albumCover = document.getElementById('albumCover');
  const turntableDisc = document.querySelector('.turntable-disc');
  const turntableGrooves = document.querySelector('.turntable-grooves');
  const turntableSheen = document.querySelector('.turntable-sheen');
  const albumGrooveOverlay = document.querySelector('.album-groove-overlay');
  const trackInfo = document.getElementById('trackInfo');
  const trackArtist = document.getElementById('trackArtist');
  const trackAlbum = document.getElementById('trackAlbum');
  const trackYear = document.getElementById('trackYear');
  const trackDuration = document.getElementById('trackDuration');
  const nextTrackInfo = document.getElementById('nextTrackInfo');
  const progressBarFill = document.getElementById('progressBarFill');
  const seekBar = document.getElementById('seekBar');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const statusMessage = document.getElementById('statusMessage');
  const playlistElement = document.getElementById('playlist');
  const playButton = document.getElementById('playButton');
  const pauseButton = document.getElementById('pauseButton');
  const stopButton = document.getElementById('stopButton');
  const prevButton = document.getElementById('prevButton');
  const nextButton = document.getElementById('nextButton');
  const shuffleButton = document.getElementById('shuffleButton');
  const refreshButton = document.getElementById('refreshButton');
  const volumeControl = document.getElementById('volumeControl');
  const djToggle = document.getElementById('djToggle');
  const crossfadeDurationSelect = document.getElementById('crossfadeDuration');
  const crossfadeStatus = document.getElementById('crossfadeStatus');
  const deckAVinyl = document.getElementById('deckA_vinyl');
  const deckBVinyl = document.getElementById('deckB_vinyl');
  const deckAMeta = document.getElementById('deckA_meta');
  const deckBMeta = document.getElementById('deckB_meta');
  const djCrossfader = document.getElementById('djCrossfader');

  // Playback start safeguards. Adjust these values to tune responsiveness.
  const PLAYBACK_START_TIMEOUT_MS = 5000;
  const PLAYBACK_MAX_RETRIES = 2;
  const PLAYBACK_RETRY_DELAY_MS = 600;
  const SOURCE_UPDATE_DEBOUNCE_MS = 75;
  const SOURCE_RESOLVE_TIMEOUT_MS = 1200;
  const DEBUG_AUDIO_ENABLED = new URLSearchParams(window.location.search).get('debugAudio') === '1';

  const deriveTrackArtist = (baseArtist, trackTitle) => {
    const artistName = baseArtist || 'Omoluabi';
    if (!trackTitle) return artistName;

    const match = trackTitle.match(/ft\.?\s+(.+)/i);
    if (match && match[1]) {
      return `${artistName} ft. ${match[1].trim()}`;
    }

    return artistName;
  };

  const hasAlbums = typeof albums !== 'undefined' && Array.isArray(albums) && albums.length;
  if (!hasAlbums) {
    statusMessage.textContent = 'No tracks available. Please refresh the page.';
    shuffleButton.disabled = true;
    refreshButton.disabled = true;
    [playButton, pauseButton, stopButton, prevButton, nextButton].forEach(btn => btn.disabled = true);
    return;
  }

  const albumTrackMap = new Map();
  const albumDurationLoaded = new Set();
  const trackDurationLabels = new Map();
  const allTracks = [];
  const fallbackCover = typeof NAIJA_HITS_COVER !== 'undefined' ? NAIJA_HITS_COVER : '../../Logo.jpg';

  albums.forEach((album, albumIndex) => {
    if (!album || !Array.isArray(album.tracks)) {
      return;
    }

    const artist = album.artist || 'Omoluabi';
    const releaseYear = typeof album.releaseYear !== 'undefined' ? album.releaseYear : null;
    const cover = album.cover || album.coverImage || fallbackCover;
    const albumName = album.name || album.title || `Album ${albumIndex + 1}`;
    const collectedTracks = [];

    album.tracks.forEach((track, trackIndex) => {
      if (!track) {
        return;
      }

      const trackSrc = track.src || track.url;
      if (!trackSrc) {
        return;
      }

      const title = track.title || `Track ${trackIndex + 1}`;
      const trackData = {
        title,
        src: trackSrc,
        cover,
        album: albumName,
        artist: deriveTrackArtist(track.artist || artist, title),
        releaseYear: typeof track.releaseYear !== 'undefined' ? track.releaseYear : releaseYear,
        albumIndex,
        albumTrackIndex: trackIndex,
        isLive: Boolean(track.isLive || track.sourceType === 'stream'),
        sourceType: track.sourceType || (track.isLive ? 'stream' : 'file'),
        duration: typeof track.duration === 'number' ? track.duration : null,
      };

      allTracks.push(trackData);
      collectedTracks.push(trackData);
    });

    if (collectedTracks.length) {
      albumTrackMap.set(albumIndex, collectedTracks);
    }
  });

  allTracks.forEach((track, index) => {
    track.globalIndex = index;
  });

  if (!allTracks.length) {
    statusMessage.textContent = 'No playable tracks were found.';
    return;
  }

  function isLiveStreamTrack(track) {
    return Boolean(track && (track.isLive || track.sourceType === 'stream'));
  }

  let playbackOrder = allTracks.map((_, index) => index);
  const baseOrder = [...playbackOrder];
  let currentOrderIndex = 0;
  let isShuffleEnabled = false;
  let userSeeking = false;

  const PREFETCH_AHEAD = 3;
  const PREFETCH_CACHE_LIMIT = 6;
  const prefetchCache = new Map();
  const prefetchOrder = [];
  const playbackLatencyMarks = new Map();
  const STALL_RECOVERY_DELAY_MS = 7000;
  const STALL_RECOVERY_ATTEMPTS = 2;
  const PLAYBACK_PROGRESS_CHECK_MS = 2000;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const DEFAULT_CROSSFADE_SECONDS = 6;
  const CROSSFADE_PRELOAD_SECONDS = 8;
  let crossfadeDurationSeconds = DEFAULT_CROSSFADE_SECONDS;
  let djAutoMixEnabled = djToggle ? djToggle.checked : true;
  let isCrossfading = false;
  let activeDeckKey = 'A';
  let fadingDeckKey = null;
  let standbyPreloadedIndex = null;
  let audioContext = null;
  let hasUserGesture = false;
  let lastSpinState = false;
  let crossfaderFrame = null;
  let playbackStartState = null;
  let stallRecoveryTimer = null;
  let stallRecoveryAttempts = 0;
  let lastProgressAt = Date.now();
  let playbackMonitorId = null;
  let lastObservedPosition = 0;
  let isBuffering = false;
  // FIX: event-driven playbackStatus
  let playbackStatus = 'idle';
  let lastError = null;
  let bufferingTimeoutId = null;
  let bufferingRecoveryAttempted = false;
  const preconnectedHosts = new Set();

  const audioController = {
    pendingSourceTimers: new Map(),
    lastResolvedByDeck: new Map(),
  };

  const playbackHealth = (() => {
    if (!DEBUG_AUDIO_ENABLED) {
      return {
        log: () => {},
        updateState: () => {},
      };
    }

    const panel = document.createElement('section');
    panel.id = 'playbackHealthPanel';
    panel.setAttribute('aria-label', 'Playback Health');
    panel.innerHTML = `
      <style>
        #playbackHealthPanel {
          position: fixed;
          bottom: 12px;
          right: 12px;
          width: min(420px, 90vw);
          max-height: 70vh;
          overflow: auto;
          background: rgba(12, 12, 12, 0.92);
          color: #f4f4f4;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 12px;
          font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
          font-size: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          z-index: 2147483647;
        }
        #playbackHealthPanel h3 {
          margin: 0 0 6px 0;
          font-size: 13px;
        }
        #playbackHealthPanel .health-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 6px;
        }
        #playbackHealthPanel .pill {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.08);
          margin-right: 4px;
        }
        #playbackHealthPanel ul {
          list-style: none;
          padding: 0;
          margin: 6px 0 0 0;
        }
        #playbackHealthPanel li {
          margin-bottom: 4px;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
          padding-bottom: 4px;
        }
        #playbackHealthPanel code {
          font-family: ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
        }
      </style>
      <h3>Playback Health (debug only)</h3>
      <div class="health-grid">
        <div><strong>Active deck:</strong> <span id="healthDeck">A</span></div>
        <div><strong>Src:</strong> <code id="healthSrc">-</code></div>
        <div><strong>Ready:</strong> <span id="healthReady">-</span></div>
        <div><strong>Network:</strong> <span id="healthNetwork">-</span></div>
        <div><strong>Time:</strong> <span id="healthTime">0 / 0</span></div>
        <div><strong>Buffered:</strong> <span id="healthBuffered">-</span></div>
      </div>
      <h4>Recent audio events</h4>
      <ul id="healthEvents"></ul>
    `;

    document.body.appendChild(panel);

    const eventList = panel.querySelector('#healthEvents');
    const deckLabel = panel.querySelector('#healthDeck');
    const srcLabel = panel.querySelector('#healthSrc');
    const readyLabel = panel.querySelector('#healthReady');
    const networkLabel = panel.querySelector('#healthNetwork');
    const timeLabel = panel.querySelector('#healthTime');
    const bufferedLabel = panel.querySelector('#healthBuffered');

    const maxEvents = 50;
    const readyStateText = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
    const networkStateText = ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'];

    function formatBuffered(audio) {
      try {
        if (!audio.buffered || audio.buffered.length === 0) return '—';
        const ranges = [];
        for (let i = 0; i < audio.buffered.length; i += 1) {
          ranges.push(`${audio.buffered.start(i).toFixed(2)}-${audio.buffered.end(i).toFixed(2)}`);
        }
        return ranges.join(', ');
      } catch (_) {
        return 'n/a';
      }
    }

    function updateState(audio) {
      if (!audio) return;
      deckLabel.textContent = activeDeckKey;
      srcLabel.textContent = audio.currentSrc || audio.src || 'none';
      readyLabel.textContent = readyStateText[audio.readyState] || audio.readyState;
      networkLabel.textContent = networkStateText[audio.networkState] || audio.networkState;
      const duration = Number.isFinite(audio.duration) ? audio.duration.toFixed(2) : '∞';
      timeLabel.textContent = `${audio.currentTime.toFixed(2)} / ${duration}`;
      bufferedLabel.textContent = formatBuffered(audio);
    }

    function log(eventName, detail = {}) {
      const item = document.createElement('li');
      const timestamp = new Date().toISOString().split('T')[1].replace('Z', '');
      const info = typeof detail === 'string' ? detail : JSON.stringify(detail);
      item.textContent = `${timestamp} • ${eventName}: ${info}`;
      eventList.prepend(item);
      while (eventList.children.length > maxEvents) {
        eventList.removeChild(eventList.lastChild);
      }
      updateState(getActiveAudio());
    }

    return { log, updateState };
  })();

  function getCrossfadeDurationForTrack(trackDurationSeconds) {
    if (!trackDurationSeconds || !Number.isFinite(trackDurationSeconds)) {
      return crossfadeDurationSeconds;
    }

    const maxFadeShare = 0.25;
    const minimumFadeSeconds = 2;
    const cappedByTrackLength = Math.max(minimumFadeSeconds, trackDurationSeconds * maxFadeShare);
    return Math.min(crossfadeDurationSeconds, cappedByTrackLength);
  }

  function initializeDeckAudio(audioElement) {
    if (!audioElement) return;
    // FIX: persistent audio instance
    audioElement.preload = 'metadata';
    audioElement.playsInline = true;
    audioElement.muted = false;
    audioElement.volume = 1;
  }

  function createDeck(audioElement) {
    initializeDeckAudio(audioElement);
    return {
      audio: audioElement,
      gainNode: null,
      sourceNode: null,
      volumeFrame: null,
    };
  }

  const decks = {
    A: createDeck(deckAudioA),
    B: createDeck(deckAudioB),
  };

  ensureInlinePlayback();

  function markUserGesture(reason = 'interaction') {
    if (hasUserGesture) return;
    hasUserGesture = true;
    console.info('[audio] user-gesture', { reason });
  }

  // iOS/Safari require AudioContext creation from a user gesture.
  function getOrCreateAudioContext() {
    if (!AudioContextClass) return null;
    if (audioContext) return audioContext;
    if (!hasUserGesture) return null;
    audioContext = new AudioContextClass();
    audioContext.addEventListener('statechange', () => {
      console.info('[audio] AudioContext statechange:', audioContext.state);
    });
    return audioContext;
  }

  async function resumeAudioContext() {
    const context = getOrCreateAudioContext();
    if (!context || typeof context.resume !== 'function') return;
    try {
      if (context.state === 'suspended') {
        await context.resume();
      }
    } catch (_) {
      // Ignore resume failures so playback attempts still proceed.
    }
  }

  function ensureAudioGraph(deck) {
    if (!AudioContextClass || deck.gainNode) return;
    const context = getOrCreateAudioContext();
    if (!context) return;
    try {
      deck.sourceNode = context.createMediaElementSource(deck.audio);
      deck.gainNode = context.createGain();
      deck.gainNode.gain.value = Number(volumeControl.value || 1);
      deck.sourceNode.connect(deck.gainNode).connect(context.destination);
    } catch (_) {
      deck.gainNode = null;
    }
  }

  function unlockAudio() {
    if (!AudioContextClass) return;
    markUserGesture('unlock');
    const context = getOrCreateAudioContext();
    if (!context) return;

    resumeAudioContext();

    if (context.state === 'running') return;

    try {
      const buffer = context.createBuffer(1, 1, 22050);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start();
    } catch (_) {
      // Ignore unlock failures; playback will retry on user gesture.
    }
  }

  function getActiveDeck() {
    return decks[activeDeckKey];
  }

  function getStandbyDeckKey() {
    return activeDeckKey === 'A' ? 'B' : 'A';
  }

  function getStandbyDeck() {
    return decks[getStandbyDeckKey()];
  }

  function ensureInlinePlayback() {
    Object.values(decks).forEach(deck => {
      if (!deck || !deck.audio) return;
      deck.audio.setAttribute('playsinline', '');
      deck.audio.setAttribute('webkit-playsinline', '');
      deck.audio.playsInline = true;
    });
  }

  function getAudioErrorMessage(audio) {
    if (!audio || !audio.error) return null;
    const { code, message } = audio.error;
    const fallback = typeof message === 'string' && message.trim() ? message : `Media error code ${code}`;
    return fallback;
  }

  function resetBufferingTimeout() {
    if (bufferingTimeoutId) {
      clearTimeout(bufferingTimeoutId);
      bufferingTimeoutId = null;
    }
  }

  // FIX: buffering timeout + recovery
  function startBufferingTimeout() {
    if (bufferingTimeoutId) return;
    bufferingTimeoutId = setTimeout(() => {
      if (playbackStatus !== 'loading') return;
      const activeAudio = getActiveAudio();
      if (!activeAudio) return;
      if (bufferingRecoveryAttempted) {
        const message = 'Playback stalled or stream unreachable.';
        console.error('[audio] buffer-timeout', { message });
        setPlaybackStatus('error', 'buffer-timeout', message);
        hideLoading();
        setStatus(message, 'error');
        postPanelStatus('error', trackInfo.textContent);
        return;
      }
      bufferingRecoveryAttempted = true;
      console.warn('[audio] buffer-timeout: recovery');
      (async () => {
        try {
          activeAudio.load();
          await resumeAudioContext();
          await activeAudio.play();
        } catch (error) {
          const message = 'Playback stalled or stream unreachable.';
          console.error('[audio] buffer-recovery-failed', { error });
          setPlaybackStatus('error', 'buffer-recovery', message);
          hideLoading();
          setStatus(message, 'error');
          postPanelStatus('error', trackInfo.textContent);
        }
      })();
    }, 8000);
  }

  function setPlaybackStatus(nextStatus, eventName = 'state', errorMessage = null) {
    if (playbackStatus === nextStatus && !errorMessage) return;
    playbackStatus = nextStatus;
    if (nextStatus === 'error') {
      lastError = errorMessage || lastError;
    } else {
      lastError = null;
    }
    console.info('[audio] transition', { event: eventName, status: playbackStatus, lastError });

    if (playbackStatus === 'loading') {
      startBufferingTimeout();
    } else {
      resetBufferingTimeout();
      bufferingRecoveryAttempted = false;
    }

    updateSpinState();
  }

  function captureAudioState(audio) {
    if (!audio) return {};
    const toFixed = value => (Number.isFinite(value) ? Number(value).toFixed(3) : value);
    return {
      currentSrc: audio.currentSrc || audio.src || '',
      currentTime: toFixed(audio.currentTime),
      duration: toFixed(audio.duration),
      readyState: audio.readyState,
      networkState: audio.networkState,
      paused: audio.paused,
      ended: audio.ended,
      seeking: audio.seeking,
      volume: audio.volume,
      muted: audio.muted,
      playbackRate: audio.playbackRate,
      buffered: (() => {
        try {
          if (!audio.buffered || audio.buffered.length === 0) return [];
          const ranges = [];
          for (let i = 0; i < audio.buffered.length; i += 1) {
            ranges.push({ start: audio.buffered.start(i), end: audio.buffered.end(i) });
          }
          return ranges;
        } catch (_) {
          return [];
        }
      })(),
      dataset: { ...audio.dataset },
    };
  }

  function logAudioEvent(label, audio, detail = {}) {
    if (!audio) return;
    console.info('[audio]', {
      label,
      readyState: audio.readyState,
      networkState: audio.networkState,
      currentTime: Number.isFinite(audio.currentTime) ? Number(audio.currentTime.toFixed(3)) : audio.currentTime,
      src: audio.currentSrc || audio.src,
      audioContext: audioContext ? audioContext.state : null,
      muted: audio.muted,
      volume: audio.volume,
      ...detail,
    });
  }

  function ensureAudibleDeck(deck) {
    if (!deck || !deck.audio) return;
    if (deck.audio.muted) {
      deck.audio.muted = false;
    }
    if (deck.audio.volume === 0) {
      deck.audio.volume = 1;
    }
  }

  function logDebug(eventName, detail = {}) {
    playbackHealth.log(eventName, detail);
    if (DEBUG_AUDIO_ENABLED) {
      console.debug('[player:debug]', eventName, detail);
    }
  }

  function resetStandbyDeck() {
    if (isCrossfading) return;
    const standbyDeck = getStandbyDeck();
    if (!standbyDeck) return;

    cancelVolumeAnimation(standbyDeck);
    try {
      standbyDeck.audio.pause();
    } catch (_) {
      // Ignore pause errors during deck resets.
    }
    standbyDeck.audio.currentTime = 0;

    if (standbyDeck.audio.dataset.trackSrc) {
      cleanupPrefetch(standbyDeck.audio.dataset.trackSrc);
      delete standbyDeck.audio.dataset.trackSrc;
    }

    standbyDeck.audio.removeAttribute('src');
    try {
      standbyDeck.audio.load();
    } catch (_) {
      // Ignore load errors when clearing the standby deck.
    }

    standbyPreloadedIndex = null;
  }

  function setDeckVolume(deck, volume) {
    if (deck.gainNode && audioContext) {
      const now = audioContext.currentTime;
      deck.gainNode.gain.cancelScheduledValues(now);
      deck.gainNode.gain.setValueAtTime(volume, now);
    } else {
      deck.audio.volume = volume;
    }
  }

  function cancelVolumeAnimation(deck) {
    if (deck.volumeFrame) {
      cancelAnimationFrame(deck.volumeFrame);
      deck.volumeFrame = null;
    }
  }

  function rampVolume(deck, from, to, durationSeconds, onComplete) {
    if (deck.gainNode && audioContext) {
      const now = audioContext.currentTime;
      deck.gainNode.gain.cancelScheduledValues(now);
      deck.gainNode.gain.setValueAtTime(from, now);
      deck.gainNode.gain.linearRampToValueAtTime(to, now + durationSeconds);
      if (typeof onComplete === 'function') {
        setTimeout(onComplete, durationSeconds * 1000);
      }
      return;
    }

    cancelVolumeAnimation(deck);
    const start = performance.now();
    const durationMs = durationSeconds * 1000;

    function step(nowTime) {
      const progress = Math.min((nowTime - start) / durationMs, 1);
      const value = from + (to - from) * progress;
      deck.audio.volume = value;
      if (progress < 1) {
        deck.volumeFrame = requestAnimationFrame(step);
      } else {
        deck.volumeFrame = null;
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }
    }

    deck.volumeFrame = requestAnimationFrame(step);
  }

  function getActiveAudio() {
    return getActiveDeck().audio;
  }

  function postPanelStatus(status, detail) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        source: 'edge-panel-app',
        panelId: 'musicPlayerContainer',
        status,
        detail: detail || null,
      }, '*');
    }
  }

  function formatTime(seconds) {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(seconds, 0) : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const secs = Math.floor(safeSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  }

  function formatAlbumDuration(seconds) {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(Math.floor(seconds), 0) : 0;
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;

    if (hours > 0) {
      const hourLabel = `${hours} hr${hours === 1 ? '' : 's'}`;
      const minuteLabel = `${minutes.toString().padStart(2, '0')} min`;
      return `${hourLabel} ${minuteLabel}`;
    }

    if (minutes > 0) {
      const minuteLabel = `${minutes} min`;
      return secs ? `${minuteLabel} ${secs} sec` : minuteLabel;
    }

    return `${secs} sec`;
  }

  const durationCache = new Map();
  const durationPromises = new Map();
  const durationProbeQueue = [];
  let activeDurationProbes = 0;
  const albumDurationState = new Map();
  const DURATION_PROBE_CONCURRENCY = 3;
  const DURATION_PROBE_TIMEOUT_MS = 8000;

  function drainDurationProbeQueue() {
    while (activeDurationProbes < DURATION_PROBE_CONCURRENCY && durationProbeQueue.length) {
      const { task, resolve, reject } = durationProbeQueue.shift();
      activeDurationProbes += 1;
      Promise.resolve()
        .then(task)
        .then(resolve)
        .catch(reject)
        .finally(() => {
          activeDurationProbes = Math.max(0, activeDurationProbes - 1);
          drainDurationProbeQueue();
        });
    }
  }

  function enqueueDurationProbe(task) {
    return new Promise((resolve, reject) => {
      durationProbeQueue.push({ task, resolve, reject });
      drainDurationProbeQueue();
    });
  }

  function requestTrackDuration(track, { disableCors = false } = {}) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'metadata';

      if (disableCors) {
        audio.removeAttribute('crossorigin');
      } else {
        setCrossOrigin(track.src, audio);
      }

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Metadata probe timed out'));
      }, DURATION_PROBE_TIMEOUT_MS);

      const cleanup = () => {
        clearTimeout(timeoutId);
        audio.removeEventListener('loadedmetadata', handleSuccess);
        audio.removeEventListener('error', handleError);
        audio.removeAttribute('src');
        audio.load();
      };

      const handleSuccess = () => {
        cleanup();
        resolve(Number.isFinite(audio.duration) ? audio.duration : null);
      };

      const handleError = () => {
        cleanup();
        reject(new Error('Metadata load failed'));
      };

      audio.addEventListener('loadedmetadata', handleSuccess, { once: true });
      audio.addEventListener('error', handleError, { once: true });

      try {
        resolveSunoAudioSrc(track.src)
          .then(resolved => {
            audio.src = resolved;
            audio.load();
          })
          .catch(error => {
            cleanup();
            reject(error);
          });
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  }

  async function loadTrackDuration(track) {
    if (durationCache.has(track.src)) {
      return durationCache.get(track.src);
    }

    if (durationPromises.has(track.src)) {
      return durationPromises.get(track.src);
    }

    const promise = enqueueDurationProbe(async () => {
      const attempts = [false, true];
      for (const disableCors of attempts) {
        try {
          const duration = await requestTrackDuration(track, { disableCors });
          if (Number.isFinite(duration)) {
            durationCache.set(track.src, duration);
          }
          return duration;
        } catch (_) {
          // Continue to the next attempt without CORS if the first try fails.
        }
      }
      return null;
    });

    durationPromises.set(track.src, promise);
    const result = await promise;
    durationPromises.delete(track.src);
    return result;
  }

  function updateAlbumDurationLabel(albumIndex, durationSeconds) {
    const state = albumDurationState.get(albumIndex);
    if (!state) return;

    if (arguments.length > 1) {
      state.requested = true;
      if (Number.isFinite(durationSeconds)) {
        state.totalSeconds += durationSeconds;
      }
      state.pending = Math.max(0, (state.pending || 0) - 1);
    }

    let label = ' • Unknown length';
    if (!state.requested) {
      label = ' • Open to calculate';
    } else if (state.totalSeconds > 0) {
      label = ` • ${formatAlbumDuration(state.totalSeconds)}${state.pending > 0 ? '…' : ''}`;
    } else if (state.pending > 0) {
      label = ' • Calculating…';
    }

    state.element.textContent = label;
  }

  function loadAlbumDurations(albumIndex, tracks) {
    if (!Number.isFinite(albumIndex) || !tracks || albumDurationLoaded.has(albumIndex)) {
      return;
    }

    albumDurationLoaded.add(albumIndex);

    const state = albumDurationState.get(albumIndex);
    if (state) {
      state.pending = tracks.filter(track => !isLiveStreamTrack(track)).length;
      state.totalSeconds = 0;
      state.requested = state.pending > 0;
      updateAlbumDurationLabel(albumIndex);
    }

    tracks.forEach(track => {
      if (isLiveStreamTrack(track)) return;
      const durationLabel = trackDurationLabels.get(track.src);
      if (durationLabel) {
        durationLabel.textContent = 'Loading…';
      }
      loadTrackDuration(track)
        .then(durationSeconds => {
          if (durationLabel) {
            durationLabel.textContent = Number.isFinite(durationSeconds)
              ? formatTime(durationSeconds)
              : 'Unknown length';
          }
          updateAlbumDurationLabel(albumIndex, durationSeconds);
        })
        .catch(() => {
          if (durationLabel) {
            durationLabel.textContent = 'Unknown length';
          }
          updateAlbumDurationLabel(albumIndex, null);
        });
    });
  }

  function setStatus(message, tone = 'info') {
    if (!statusMessage) return;
    statusMessage.textContent = message || '';
    statusMessage.dataset.tone = tone;
  }

  function showLoading(message = 'Connecting…', tone = 'info') {
    loadingSpinner.style.display = 'block';
    setStatus(message, tone);
  }

  function hideLoading() {
    loadingSpinner.style.display = 'none';
  }

  function stopPlaybackMonitor() {
    if (!playbackMonitorId) return;
    clearInterval(playbackMonitorId);
    playbackMonitorId = null;
  }

  function resetStallRecovery() {
    if (stallRecoveryTimer) {
      clearTimeout(stallRecoveryTimer);
    }
    stallRecoveryAttempts = 0;
    stallRecoveryTimer = null;
    lastProgressAt = Date.now();
    stopPlaybackMonitor();
  }

  function notePlaybackProgress() {
    lastProgressAt = Date.now();
    stallRecoveryAttempts = 0;
    if (stallRecoveryTimer) {
      clearTimeout(stallRecoveryTimer);
      stallRecoveryTimer = null;
    }
  }

  function scheduleStallRecovery({ immediate = false } = {}) {
    if (stallRecoveryTimer && !immediate) return;

    const attemptRecovery = async () => {
      stallRecoveryTimer = null;
      const activeAudio = getActiveAudio();
      if (!activeAudio) return;

      if (Date.now() - lastProgressAt < STALL_RECOVERY_DELAY_MS - 250 && !immediate) {
        return;
      }

      stallRecoveryAttempts += 1;
      showLoading('Reconnecting…', 'info');
      logDebug('stall-recovery', captureAudioState(activeAudio));

      try {
        await resumeAudioContext();
        if (activeAudio.paused) {
          await activeAudio.play();
        }
      } catch (_) {
        // Some browsers will require an explicit user gesture; we surface status below.
      }

      if (stallRecoveryAttempts < STALL_RECOVERY_ATTEMPTS) {
        scheduleStallRecovery();
      } else {
        setStatus('Trying to reconnect. Tap play if audio does not resume.', 'warning');
      }
    };

    if (immediate) {
      stallRecoveryTimer = setTimeout(attemptRecovery, 0);
      return;
    }

    stallRecoveryTimer = setTimeout(attemptRecovery, STALL_RECOVERY_DELAY_MS);
  }

  function ensurePreconnect(url) {
    try {
      const { origin } = new URL(url, window.location.href);
      if (preconnectedHosts.has(origin)) return;
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      preconnectedHosts.add(origin);
    } catch (_) {
      // Ignore malformed URLs or failures to create link tags.
    }
  }

  function startPlaybackMonitor() {
    stopPlaybackMonitor();
    const activeAudio = getActiveAudio();
    if (!activeAudio) return;

    lastObservedPosition = Number.isFinite(activeAudio.currentTime) ? activeAudio.currentTime : 0;
    playbackMonitorId = setInterval(() => {
      const audio = getActiveAudio();
      if (!audio || audio.paused || audio.ended || audio.seeking) {
        return;
      }

      const position = Number.isFinite(audio.currentTime) ? audio.currentTime : lastObservedPosition;
      if (position !== lastObservedPosition) {
        lastObservedPosition = position;
        notePlaybackProgress();
        return;
      }

      if (!stallRecoveryTimer && Date.now() - lastProgressAt >= STALL_RECOVERY_DELAY_MS) {
        scheduleStallRecovery({ immediate: true });
      }
    }, PLAYBACK_PROGRESS_CHECK_MS);
  }

  function resetPlaybackStartState() {
    if (!playbackStartState) return;
    if (playbackStartState.timeoutId) {
      clearTimeout(playbackStartState.timeoutId);
    }
    const { audioEl, onSuccess, onError } = playbackStartState;
    if (audioEl && onSuccess && onError) {
      audioEl.removeEventListener('playing', onSuccess);
      audioEl.removeEventListener('canplay', onSuccess);
      audioEl.removeEventListener('error', onError);
    }
    playbackStartState = null;
  }

  function isActivePlaybackState(state) {
    return playbackStartState && state && playbackStartState.id === state.id;
  }

  function retryOrFailPlayback(state, error) {
    if (!isActivePlaybackState(state)) return;
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }

    const audioEl = state.audioEl;
    if (!audioEl) return;

    if (state.retries < PLAYBACK_MAX_RETRIES) {
      state.retries += 1;
      console.warn('[player] Playback retry', { attempt: state.retries, error });
      try {
        audioEl.pause();
        if (typeof audioEl.fastSeek === 'function') {
          audioEl.fastSeek(0);
        }
        audioEl.currentTime = 0;
        audioEl.load();
      } catch (_) {
        // Ignore reset errors between retries.
      }
      showLoading('Reconnecting…');
      state.timeoutId = setTimeout(() => {
        retryOrFailPlayback(state, new Error('timeout'));
      }, PLAYBACK_START_TIMEOUT_MS + PLAYBACK_RETRY_DELAY_MS);
      setTimeout(() => {
        if (!isActivePlaybackState(state)) return;
        const playPromise = audioEl.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(err => retryOrFailPlayback(state, err));
        }
      }, PLAYBACK_RETRY_DELAY_MS);
      return;
    }

    resetPlaybackStartState();
    hideLoading();
    setPlaybackStatus('error', 'playback-failed', 'Playback stalled or stream unreachable.');
    // Update this message to change the user-facing playback failure copy.
    setStatus('We could not start playback right now. Please check your connection and try again.', 'error');
    postPanelStatus('error', state.trackTitle || '');
    console.error('[player] Playback failed after retries', { error });
  }

  function beginPlaybackStart(deckKey, track) {
    const deck = decks[deckKey];
    if (!deck || !deck.audio) return;

    resetPlaybackStartState();
    resetStallRecovery();
    logDebug('playback-start', { deckKey, track: track ? track.title : 'unknown', src: track?.src });
    logAudioEvent('play-attempt', deck.audio, { deckKey, track: track ? track.title : 'unknown' });
    const audioEl = deck.audio;
    const state = {
      id: Date.now(),
      audioEl,
      deckKey,
      retries: 0,
      timeoutId: null,
      trackTitle: track ? track.title : '',
      onSuccess: null,
      onError: null,
    };

    const handleSuccess = () => {
      if (!isActivePlaybackState(state)) return;
      if (state.timeoutId) {
        clearTimeout(state.timeoutId);
      }
      hideLoading();
      resetPlaybackStartState();
    };

    const handleError = event => {
      retryOrFailPlayback(state, event?.error || event);
    };

    state.onSuccess = handleSuccess;
    state.onError = handleError;

    audioEl.addEventListener('playing', handleSuccess);
    audioEl.addEventListener('canplay', handleSuccess);
    audioEl.addEventListener('error', handleError);

    playbackStartState = state;
    markPlaybackSelection(track?.src);
    showLoading('Connecting…');
    setPlaybackStatus('loading', 'play-attempt');

    const startAttempt = () => {
      if (!isActivePlaybackState(state)) return;
      state.timeoutId = setTimeout(() => {
        retryOrFailPlayback(state, new Error('playback timeout'));
      }, PLAYBACK_START_TIMEOUT_MS);

      ensureAudibleDeck(deck);
      resumeAudioContext().finally(() => {
        console.info('[audio] pre-play', {
          readyState: audioEl.readyState,
          networkState: audioEl.networkState,
          muted: audioEl.muted,
          volume: audioEl.volume,
          src: audioEl.currentSrc || audioEl.src,
        });
        try {
          audioEl.load();
        } catch (_) {
          // Ignore load errors; play() will surface issues.
        }
        const playPromise = audioEl.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(err => retryOrFailPlayback(state, err));
        }
      });
    };

    startAttempt();
  }

  function setCrossOrigin(url, element = getActiveAudio()) {
    try {
      const target = new URL(url, window.location.href);
      const sameOrigin = target.origin === window.location.origin;
      const allowList = [
        /\.suno\.(?:ai|com)$/i,
        /cdn\d*\.suno\.(?:ai|com)$/i,
        /raw\.githubusercontent\.com$/i,
        /githubusercontent\.com$/i,
        /github\.io$/i,
        /streamguys1\.com$/i,
        /radio\.co$/i,
        /zeno\.fm$/i,
        /akamaized\.net$/i,
        /mystreaming\.net$/i,
        /securenetsystems\.net$/i
      ];
      const isAllowListed = allowList.some(pattern => pattern.test(target.hostname));

      element.crossOrigin = 'anonymous';

      if (!sameOrigin && !isAllowListed) {
        const removeOnError = () => {
          element.removeEventListener('error', removeOnError);
          element.removeAttribute('crossorigin');
        };
        element.addEventListener('error', removeOnError, { once: true });
      }
    } catch (_) {
      element.removeAttribute('crossorigin');
    }
  }

  function updateSpinState() {
    const shouldSpin = playbackStatus === 'playing';
    [turntableDisc, albumCover, turntableGrooves, turntableSheen, albumGrooveOverlay].forEach(element => {
      if (!element) return;
      element.classList.toggle('spin', shouldSpin);
    });

    if (lastSpinState !== shouldSpin) {
      lastSpinState = shouldSpin;
      console.info('[vinyl] spin', { active: shouldSpin });
    }

    const deckAPlaying = (activeDeckKey === 'A' && shouldSpin) || (isCrossfading && fadingDeckKey === 'A');
    const deckBPlaying = (activeDeckKey === 'B' && shouldSpin) || (isCrossfading && fadingDeckKey === 'B');
    if (deckAVinyl) deckAVinyl.classList.toggle('spinning', deckAPlaying);
    if (deckBVinyl) deckBVinyl.classList.toggle('spinning', deckBPlaying);
  }

  function updateOverlayMetadata(deckKey, track) {
    const meta = deckKey === 'A' ? deckAMeta : deckBMeta;
    if (!meta || !track) return;
    const [titleEl, artistEl] = meta.querySelectorAll('span');
    if (titleEl) titleEl.textContent = track.title || 'Untitled';
    if (artistEl) artistEl.textContent = track.artist || 'Omoluabi';
  }

  function updateCrossfaderUI(value) {
    if (!djCrossfader) return;
    const clamped = Math.min(100, Math.max(0, value));
    djCrossfader.value = String(clamped);
  }

  function markPlaybackSelection(trackSrc) {
    if (!trackSrc) return;
    playbackLatencyMarks.set(trackSrc, performance.now());
    console.debug('[player] Track selected, priming playback', trackSrc);
  }

  function logPlaybackStart(trackSrc) {
    if (!trackSrc || !playbackLatencyMarks.has(trackSrc)) return;
    const startedAt = performance.now();
    const latency = Math.round(startedAt - playbackLatencyMarks.get(trackSrc));
    playbackLatencyMarks.delete(trackSrc);
    console.debug(`[player] Playback audible in ${latency}ms for ${trackSrc}`);
  }

  function syncCrossfaderToActiveDeck() {
    const value = activeDeckKey === 'A' ? 0 : 100;
    updateCrossfaderUI(value);
  }

  function animateCrossfader(fromKey, toKey, durationSeconds) {
    if (!djCrossfader) return;
    if (crossfaderFrame) cancelAnimationFrame(crossfaderFrame);
    const start = performance.now();
    const startValue = fromKey === 'A' ? 0 : 100;
    const endValue = toKey === 'A' ? 0 : 100;

    const step = now => {
      const progress = Math.min((now - start) / (durationSeconds * 1000), 1);
      const value = startValue + (endValue - startValue) * progress;
      updateCrossfaderUI(value);
      if (progress < 1) {
        crossfaderFrame = requestAnimationFrame(step);
      }
    };

    crossfaderFrame = requestAnimationFrame(step);
  }

  function collapseAlbumGroup(group) {
    if (!group) return;
    group.classList.remove('is-open');
    const toggle = group.querySelector('.album-toggle');
    const list = group.querySelector('.album-track-list');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
    }
    if (list) {
      list.hidden = true;
      list.setAttribute('aria-hidden', 'true');
    }
  }

  function expandAlbumGroup(group) {
    if (!group) return;
    const groups = playlistElement.querySelectorAll('.album-group');
    groups.forEach(other => {
      if (other !== group) {
        collapseAlbumGroup(other);
      }
    });
    group.classList.add('is-open');
    const toggle = group.querySelector('.album-toggle');
    const list = group.querySelector('.album-track-list');
    const albumIndex = Number(group.dataset.albumIndex);
    if (Number.isFinite(albumIndex)) {
      const tracks = albumTrackMap.get(albumIndex);
      if (tracks) {
        loadAlbumDurations(albumIndex, tracks);
      }
    }
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'true');
    }
    if (list) {
      list.hidden = false;
      list.setAttribute('aria-hidden', 'false');
    }
  }

  function updatePlaylistHighlight() {
    const items = playlistElement.querySelectorAll('.album-track');
    let activeItem = null;
    items.forEach(item => {
      const orderIndex = Number(item.dataset.orderIndex);
      const isActive = orderIndex === currentOrderIndex;
      if (isActive) {
        item.setAttribute('aria-current', 'true');
        activeItem = item;
      } else {
        item.removeAttribute('aria-current');
      }
    });

    if (activeItem) {
      const group = activeItem.closest('.album-group');
      if (group) {
        expandAlbumGroup(group);
      }
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  }

  function updateNextTrackLabel() {
    if (!nextTrackInfo) return;
    if (playbackOrder.length <= 1) {
      nextTrackInfo.textContent = '';
      return;
    }
    const nextIndex = (currentOrderIndex + 1) % playbackOrder.length;
    const nextTrack = allTracks[playbackOrder[nextIndex]];
    nextTrackInfo.textContent = `Next: ${nextTrack.title}`;
  }

  function cleanupPrefetch(url) {
    if (!url || !prefetchCache.has(url)) return;
    const element = prefetchCache.get(url);
    try {
      if (typeof element.pause === 'function') {
        element.pause();
      }
    } catch (_) {
      // Ignore pause errors for detached prefetch elements.
    }
    try {
      element.removeAttribute('src');
      element.load();
    } catch (_) {
      // Ignore load errors during cleanup.
    }
    prefetchCache.delete(url);
    const index = prefetchOrder.indexOf(url);
    if (index !== -1) {
      prefetchOrder.splice(index, 1);
    }
  }

  function prunePrefetchCache() {
    while (prefetchOrder.length > PREFETCH_CACHE_LIMIT) {
      const oldest = prefetchOrder.shift();
      if (!oldest) {
        break;
      }
      if (oldest === getActiveAudio().dataset.trackSrc) {
        prefetchOrder.push(oldest);
        if (prefetchOrder.length <= PREFETCH_CACHE_LIMIT) {
          break;
        }
        continue;
      }
      cleanupPrefetch(oldest);
    }
  }

  function rememberPrefetch(url, element) {
    if (!url || prefetchCache.has(url)) return;
    prefetchCache.set(url, element);
    prefetchOrder.push(url);
    prunePrefetchCache();
  }

  async function prefetchTrack(orderIndex) {
    if (!Number.isInteger(orderIndex) || playbackOrder.length <= 1) return;
    const track = allTracks[playbackOrder[orderIndex]];
    const currentTrackSrc = getActiveAudio().dataset.trackSrc;
    if (!track || isLiveStreamTrack(track) || prefetchCache.has(track.src) || track.src === currentTrackSrc) return;

    const prefetchAudio = new Audio();
    prefetchAudio.preload = 'auto';
    const resolvedSrc = await resolveSunoAudioSrc(track.src, SOURCE_RESOLVE_TIMEOUT_MS);
    setCrossOrigin(resolvedSrc, prefetchAudio);
    prefetchAudio.src = resolvedSrc;

    const handleFailure = () => {
      cleanupPrefetch(track.src);
    };

    prefetchAudio.addEventListener('error', handleFailure, { once: true });

    try {
      prefetchAudio.load();
      rememberPrefetch(track.src, prefetchAudio);
    } catch (_) {
      handleFailure();
    }
  }

  function prefetchUpcomingTracks(orderIndex) {
    if (!playbackOrder.length) return;
    const maxAhead = Math.min(PREFETCH_AHEAD, playbackOrder.length - 1);
    for (let offset = 1; offset <= maxAhead; offset += 1) {
      const nextIndex = (orderIndex + offset) % playbackOrder.length;
      if (nextIndex === orderIndex) break;
      prefetchTrack(nextIndex);
    }
  }

  function renderPlaylist() {
    playlistElement.innerHTML = '';
    albumDurationState.clear();
    const orderLookup = new Map();
    playbackOrder.forEach((trackIndex, orderIndex) => {
      orderLookup.set(trackIndex, orderIndex);
    });

    albumTrackMap.forEach((tracks, albumIndex) => {
      if (!tracks || !tracks.length) {
        return;
      }

      const album = albums[albumIndex] || {};
      const albumGroup = document.createElement('li');
      albumGroup.className = 'album-group';
      albumGroup.dataset.albumIndex = albumIndex;

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'album-toggle';
      toggle.setAttribute('aria-expanded', 'false');

      const trackListId = `albumTracks-${albumIndex}`;
      toggle.setAttribute('aria-controls', trackListId);

      const thumb = document.createElement('img');
      thumb.className = 'album-thumb';
      thumb.src = tracks[0].cover || album.cover || '../../Logo.jpg';
      thumb.alt = `${tracks[0].album} cover art`;
      thumb.loading = 'lazy';
      thumb.decoding = 'async';
      thumb.onerror = () => {
        thumb.onerror = null;
        thumb.src = '../../Logo.jpg';
      };

      const textWrap = document.createElement('span');
      textWrap.className = 'album-toggle-text';

      const name = document.createElement('span');
      name.className = 'album-name';
      name.textContent = tracks[0].album;

      const meta = document.createElement('span');
      meta.className = 'album-meta';
      const releaseYear = (typeof album.releaseYear !== 'undefined' && album.releaseYear) ? album.releaseYear : tracks[0].releaseYear;
      const trackCount = tracks.length;
      const safeYear = releaseYear || 'Unknown';
      meta.textContent = `${safeYear} • ${trackCount} track${trackCount === 1 ? '' : 's'}`;

      const durationLabel = document.createElement('span');
      durationLabel.className = 'album-duration';
      meta.appendChild(durationLabel);
      albumDurationState.set(albumIndex, {
        element: durationLabel,
        pending: 0,
        totalSeconds: 0,
        requested: false,
      });
      updateAlbumDurationLabel(albumIndex);

      textWrap.appendChild(name);
      textWrap.appendChild(meta);

      const icon = document.createElement('span');
      icon.className = 'album-toggle-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '▾';

      toggle.appendChild(thumb);
      toggle.appendChild(textWrap);
      toggle.appendChild(icon);

      const trackList = document.createElement('ol');
      trackList.className = 'album-track-list';
      trackList.id = trackListId;
      trackList.hidden = true;
      trackList.setAttribute('role', 'list');
      trackList.setAttribute('aria-hidden', 'true');

      tracks.forEach(track => {
        const orderIndex = orderLookup.get(track.globalIndex);
        if (typeof orderIndex !== 'number') {
          return;
        }

        const listItem = document.createElement('li');
        listItem.className = 'album-track';
        listItem.tabIndex = 0;
        listItem.dataset.orderIndex = orderIndex;

        const title = document.createElement('span');
        title.className = 'album-track-title';
        title.textContent = track.title;

        const trackMeta = document.createElement('span');
        trackMeta.className = 'album-track-meta';
        const trackLabel = isLiveStreamTrack(track)
          ? 'Live • Afrobeats'
          : `Track ${track.albumTrackIndex + 1}`;
        trackMeta.textContent = `${track.artist} • ${trackLabel}`;

        const trackDurationLabel = document.createElement('span');
        trackDurationLabel.className = 'album-track-duration';
        trackMeta.appendChild(trackDurationLabel);

        if (isLiveStreamTrack(track)) {
          trackDurationLabel.textContent = 'Live stream';
        } else {
          trackDurationLabel.textContent = '—';
          trackDurationLabels.set(track.src, trackDurationLabel);
        }

        listItem.appendChild(title);
        listItem.appendChild(trackMeta);

        listItem.addEventListener('click', () => {
          loadTrack(orderIndex, { autoplay: true });
        });
        listItem.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            loadTrack(orderIndex, { autoplay: true });
          }
        });

        trackList.appendChild(listItem);
      });

      if (!trackList.children.length) {
        return;
      }

      toggle.addEventListener('click', () => {
        if (albumGroup.classList.contains('is-open')) {
          collapseAlbumGroup(albumGroup);
        } else {
          expandAlbumGroup(albumGroup);
        }
      });

      toggle.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (albumGroup.classList.contains('is-open')) {
            collapseAlbumGroup(albumGroup);
          } else {
            expandAlbumGroup(albumGroup);
          }
        }
      });

      albumGroup.appendChild(toggle);
      albumGroup.appendChild(trackList);
      playlistElement.appendChild(albumGroup);
    });

    updatePlaylistHighlight();
  }

  function updatePlaybackOrder(newOrder) {
    const currentTrackId = playbackOrder[currentOrderIndex];
    playbackOrder = [...newOrder];
    currentOrderIndex = Math.max(0, playbackOrder.indexOf(currentTrackId));
    renderPlaylist();
    updateNextTrackLabel();
    prefetchUpcomingTracks(currentOrderIndex);
  }

  function shufflePlaybackOrder() {
    const shuffled = [...playbackOrder];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    updatePlaybackOrder(shuffled);
  }

  function updateTrackMetadata(track) {
    const isLive = isLiveStreamTrack(track);
    trackInfo.textContent = track.title;
    trackArtist.textContent = `Artist: ${track.artist}`;
    trackAlbum.textContent = `Album: ${track.album}`;
    trackYear.textContent = `Release Year: ${track.releaseYear || 'Unknown'}`;
    albumCover.src = track.cover || '../../Logo.jpg';
    progressBarFill.style.width = '0%';
    seekBar.value = 0;
    seekBar.disabled = isLive;
    seekBar.setAttribute('aria-disabled', String(isLive));
    trackDuration.textContent = isLive ? 'Live • Afrobeats' : '0:00 / 0:00';
    updatePlaylistHighlight();
    updateNextTrackLabel();
  }

  function scheduleDeckSourceUpdate(deckKey, track, resolvedSrc, { preloadOnly = false, reason = 'track-change' } = {}) {
    return new Promise(resolve => {
      const existing = audioController.pendingSourceTimers.get(deckKey);
      if (existing) {
        clearTimeout(existing);
      }

      const timerId = setTimeout(() => {
        audioController.pendingSourceTimers.delete(deckKey);
        const deck = decks[deckKey];
        if (!deck) return resolve(null);
        const audio = deck.audio;
        const previousResolved = audioController.lastResolvedByDeck.get(deckKey);
        const isSameResolved = previousResolved === resolvedSrc;
        const isSameTrack = audio.dataset.trackSrc === track.src;
        const shouldSkipReload = isSameResolved && isSameTrack && !preloadOnly;

        if (shouldSkipReload) {
          logDebug('source:reuse', { deckKey, reason, src: resolvedSrc });
          return resolve({ deck, track, updated: false });
        }

        setCrossOrigin(resolvedSrc, audio);
        ensureInlinePlayback();
        audio.autoplay = !preloadOnly;
        audio.preload = preloadOnly ? 'metadata' : 'auto';
        audio.dataset.trackSrc = track.src;
        audio.dataset.isLive = String(isLiveStreamTrack(track));
        audio.dataset.sourceType = track.sourceType || '';
        audioController.lastResolvedByDeck.set(deckKey, resolvedSrc);

        const didChangeSrc = audio.src !== resolvedSrc;
        if (didChangeSrc) {
          audio.src = resolvedSrc;
          logDebug('source:apply', { deckKey, reason, src: resolvedSrc, preloadOnly });
        }

        if (didChangeSrc && !preloadOnly) {
          try {
            if (typeof audio.fastSeek === 'function') {
              audio.fastSeek(0);
            } else {
              audio.currentTime = 0;
            }
          } catch (_) {
            audio.currentTime = 0;
          }

          try {
            audio.load();
            logDebug('source:load-call', { deckKey, reason });
          } catch (_) {
            // Ignore browsers that block load() on active media elements.
          }
        }

        return resolve({ deck, track, updated: didChangeSrc });
      }, SOURCE_UPDATE_DEBOUNCE_MS);

      audioController.pendingSourceTimers.set(deckKey, timerId);
    });
  }

  async function cueTrackOnDeck(deckKey, orderIndex, { updateUI = true, preloadOnly = false } = {}) {
    const trackIndex = playbackOrder[orderIndex];
    const track = allTracks[trackIndex];
    if (!track) return null;

    const deck = decks[deckKey];
    ensureAudioGraph(deck);
    const resolvedSrc = await resolveSunoAudioSrc(track.src, SOURCE_RESOLVE_TIMEOUT_MS);
    ensurePreconnect(resolvedSrc);
    let effectiveSrc = resolvedSrc;
    if (prefetchCache.has(track.src) && !isLiveStreamTrack(track)) {
      effectiveSrc = prefetchCache.get(track.src).currentSrc || resolvedSrc;
      logDebug('source:prefetch-promote', { deckKey, src: effectiveSrc });
    }

    const scheduled = await scheduleDeckSourceUpdate(deckKey, track, effectiveSrc, {
      preloadOnly,
      reason: preloadOnly ? 'preload' : 'track-change',
    });

    if (!scheduled) {
      return null;
    }

    resetStallRecovery();

    if (updateUI) {
      currentOrderIndex = orderIndex;
      updateTrackMetadata(track);
      updateOverlayMetadata(deckKey, track);
      postPanelStatus('loading', track.title);
      prefetchUpcomingTracks(currentOrderIndex);
      setPlaybackStatus('loading', 'track-select');
    }

    if (!preloadOnly) {
      showLoading('Loading track…');
    }

    return { deck, track };
  }

  function completeSwitch(incomingKey, outgoingKey, targetVolume) {
    const incomingDeck = decks[incomingKey];
    const outgoingDeck = decks[outgoingKey];
    if (outgoingDeck) {
      cancelVolumeAnimation(outgoingDeck);
      outgoingDeck.audio.pause();
      outgoingDeck.audio.currentTime = 0;
      setDeckVolume(outgoingDeck, targetVolume);
    }
    activeDeckKey = incomingKey;
    fadingDeckKey = null;
    isCrossfading = false;
    standbyPreloadedIndex = null;
    resetStallRecovery();
    cleanupPrefetch(incomingDeck.audio.dataset.trackSrc);
    syncCrossfaderToActiveDeck();
    updateSpinState();
    updateDjMixUi();
  }

  async function startCrossfade(orderIndex, { duration = crossfadeDurationSeconds } = {}) {
    if (isCrossfading || !playbackOrder.length) return;
    const incomingKey = getStandbyDeckKey();
    const outgoingKey = activeDeckKey;
    const queued = await cueTrackOnDeck(incomingKey, orderIndex, { updateUI: true });
    if (!queued) return;

    const { deck: incomingDeck, track } = queued;
    const outgoingDeck = decks[outgoingKey];
    const targetVolume = Number(volumeControl.value || 1);

    ensureAudioGraph(incomingDeck);
    ensureAudioGraph(outgoingDeck);

    setDeckVolume(incomingDeck, 0);
    isCrossfading = true;
    fadingDeckKey = outgoingKey;
    activeDeckKey = incomingKey;
    updateDjMixUi();
    animateCrossfader(outgoingKey, incomingKey, duration);

    beginPlaybackStart(incomingKey, track);

    rampVolume(incomingDeck, 0, targetVolume, duration);
    rampVolume(outgoingDeck, targetVolume, 0, duration, () => {
      completeSwitch(incomingKey, outgoingKey, targetVolume);
    });
  }

  async function transitionToOrderIndex(orderIndex, { autoplay = true, preferCrossfade = true, shortFade = false } = {}) {
    const shouldCrossfade = preferCrossfade && djAutoMixEnabled && autoplay && playbackOrder.length > 1;
    if (shouldCrossfade) {
      const duration = shortFade ? Math.max(2, crossfadeDurationSeconds / 2) : crossfadeDurationSeconds;
      await startCrossfade(orderIndex, { duration });
      return;
    }

    const incomingKey = getStandbyDeckKey();
    const outgoingKey = activeDeckKey;
    const queued = await cueTrackOnDeck(incomingKey, orderIndex, { updateUI: true });
    if (!queued) return;

    const { deck: incomingDeck, track } = queued;
    const targetVolume = Number(volumeControl.value || 1);
    const outgoingDeck = decks[outgoingKey];
    ensureAudioGraph(incomingDeck);
    ensureAudioGraph(outgoingDeck);
    setDeckVolume(incomingDeck, targetVolume);

    if (autoplay) {
      beginPlaybackStart(incomingKey, track);
    }

    outgoingDeck.audio.pause();
    outgoingDeck.audio.currentTime = 0;
    activeDeckKey = incomingKey;
    fadingDeckKey = null;
    standbyPreloadedIndex = null;
    cleanupPrefetch(incomingDeck.audio.dataset.trackSrc);
    updateSpinState();
  }

  async function loadTrack(orderIndex, { autoplay = false } = {}) {
    const trackIndex = playbackOrder[orderIndex];
    const track = allTracks[trackIndex];
    if (autoplay) {
      // FIX: iOS gesture-safe play
      markUserGesture('track-select');
      console.info('[player] select', { orderIndex, src: track ? track.src : null });
    }
    await transitionToOrderIndex(orderIndex, { autoplay, preferCrossfade: djAutoMixEnabled });
  }

  async function playCurrentTrack() {
    const activeAudio = getActiveAudio();
    // FIX: iOS gesture-safe play
    markUserGesture('play');
    setPlaybackStatus('loading', 'play-click');
    logAudioEvent('play-attempt', activeAudio);
    ensureAudioGraph(getActiveDeck());
    await resumeAudioContext();
    ensureAudibleDeck(getActiveDeck());
    const playPromise = activeAudio.play();
    if (playPromise) {
      playPromise.catch(error => {
        console.error('[audio] play-rejected', { error });
        setPlaybackStatus('error', 'play-rejected', 'Playback blocked by your browser. Tap play again.');
        setStatus('Playback blocked by your browser. Tap play again.', 'warning');
        updateSpinState();
      });
    }
  }

  function stopPlayback() {
    resetPlaybackStartState();
    resetStallRecovery();
    Object.values(decks).forEach(deck => {
      deck.audio.pause();
      deck.audio.currentTime = 0;
    });
    setPlaybackStatus('paused', 'stop');
    updateSpinState();
    hideLoading();
    setStatus('Playback stopped.');
  }

  async function playNextTrack(auto = false) {
    if (!playbackOrder.length) return;
    const nextIndex = (currentOrderIndex + 1) % playbackOrder.length;
    await transitionToOrderIndex(nextIndex, { autoplay: auto ? true : !getActiveAudio().paused, shortFade: !auto });
  }

  async function playPreviousTrack() {
    if (!playbackOrder.length) return;
    const prevIndex = (currentOrderIndex - 1 + playbackOrder.length) % playbackOrder.length;
    await transitionToOrderIndex(prevIndex, { autoplay: !getActiveAudio().paused, shortFade: true });
  }

  function toggleShuffle() {
    isShuffleEnabled = !isShuffleEnabled;
    shuffleButton.setAttribute('aria-pressed', String(isShuffleEnabled));
    if (isShuffleEnabled) {
      setStatus('Shuffle enabled.');
      shufflePlaybackOrder();
    } else {
      setStatus('Shuffle disabled.');
      updatePlaybackOrder(baseOrder);
    }
  }

  function syncVolume(value) {
    Object.values(decks).forEach(deck => {
      setDeckVolume(deck, value);
    });
  }

  function getDjStatusText() {
    if (isCrossfading) return 'Crossfading…';
    return djAutoMixEnabled ? 'DJ Mix on' : 'DJ Mix off';
  }

  function updateDjMixUi() {
    if (djToggle) {
      djToggle.checked = djAutoMixEnabled;
    }
    if (crossfadeDurationSelect) {
      crossfadeDurationSelect.disabled = !djAutoMixEnabled;
      crossfadeDurationSelect.value = String(crossfadeDurationSeconds);
    }
    if (crossfadeStatus) {
      crossfadeStatus.textContent = getDjStatusText();
    }
    syncCrossfaderToActiveDeck();
  }

  function handleDjToggleChange() {
    djAutoMixEnabled = Boolean(djToggle.checked);
    resetStandbyDeck();
    updateDjMixUi();
    setStatus(
      djAutoMixEnabled
        ? 'DJ Mix enabled. Crossfades will start near the end of each track.'
        : 'DJ Mix disabled. Tracks will play through without crossfade.',
      djAutoMixEnabled ? 'info' : 'neutral'
    );
  }

  playButton.addEventListener('click', playCurrentTrack);
  pauseButton.addEventListener('click', () => {
    getActiveAudio().pause();
  });
  stopButton.addEventListener('click', stopPlayback);
  prevButton.addEventListener('click', playPreviousTrack);
  nextButton.addEventListener('click', () => playNextTrack(false));
  shuffleButton.addEventListener('click', toggleShuffle);
  refreshButton.addEventListener('click', shufflePlaybackOrder);

  crossfadeDurationSelect.value = String(DEFAULT_CROSSFADE_SECONDS);
  updateDjMixUi();

  djToggle.addEventListener('change', handleDjToggleChange);

  crossfadeDurationSelect.addEventListener('change', () => {
    const value = Number(crossfadeDurationSelect.value);
    crossfadeDurationSeconds = Number.isFinite(value) ? value : DEFAULT_CROSSFADE_SECONDS;
    updateDjMixUi();
  });

  volumeControl.addEventListener('input', event => {
    const value = Number(event.target.value);
    syncVolume(value);
  });
  syncVolume(Number(volumeControl.value || 1));

  ['pointerdown', 'touchstart', 'keydown'].forEach(eventName => {
    window.addEventListener(eventName, unlockAudio, { passive: true, once: true });
  });

  ['pointerdown', 'mousedown', 'touchstart'].forEach(eventName => {
    seekBar.addEventListener(eventName, () => {
      userSeeking = true;
    }, { passive: true });
  });

  ['pointerup', 'mouseup', 'touchend', 'touchcancel'].forEach(eventName => {
    seekBar.addEventListener(eventName, () => {
      userSeeking = false;
    }, { passive: true });
  });

  seekBar.addEventListener('input', event => {
    const activeAudio = getActiveAudio();
    if (activeAudio.dataset.isLive === 'true' || !activeAudio.duration) return;
    const value = Number(event.target.value);
    const newTime = (value / 100) * activeAudio.duration;
    trackDuration.textContent = `${formatTime(newTime)} / ${formatTime(activeAudio.duration)}`;
    progressBarFill.style.width = `${value}%`;
  });

  seekBar.addEventListener('change', event => {
    const activeAudio = getActiveAudio();
    if (activeAudio.dataset.isLive === 'true' || !activeAudio.duration) return;
    const value = Number(event.target.value);
    activeAudio.currentTime = (value / 100) * activeAudio.duration;
    userSeeking = false;
  });

  function handleLoadedMetadata(event) {
    if (event.target !== getActiveAudio()) return;
    if (event.target.dataset.isLive === 'true') {
      trackDuration.textContent = 'Live • Afrobeats';
      seekBar.value = 0;
      progressBarFill.style.width = '0%';
      return;
    }
    const total = event.target.duration;
    trackDuration.textContent = `${formatTime(event.target.currentTime)} / ${formatTime(total)}`;
    seekBar.value = 0;
    progressBarFill.style.width = '0%';
  }

  function handleLoadStart(event) {
    if (event.target !== getActiveAudio()) return;
    isBuffering = true;
    logAudioEvent('loadstart', event.target);
    setPlaybackStatus('loading', 'loadstart');
  }

  async function handleTimeUpdate(event) {
    if (event.target !== getActiveAudio() || userSeeking) return;
    if (event.target.dataset.isLive === 'true') {
      trackDuration.textContent = 'Live • Afrobeats';
      seekBar.value = 0;
      progressBarFill.style.width = '0%';
      return;
    }
    if (!event.target.duration) return;
    const current = event.target.currentTime;
    const percent = (current / event.target.duration) * 100;
    seekBar.value = percent;
    progressBarFill.style.width = `${percent}%`;
    trackDuration.textContent = `${formatTime(current)} / ${formatTime(event.target.duration)}`;
    notePlaybackProgress();

    if (djAutoMixEnabled && !isCrossfading && event.target.duration) {
      const remaining = event.target.duration - event.target.currentTime;
      if (remaining <= CROSSFADE_PRELOAD_SECONDS && playbackOrder.length > 1) {
        const nextIndex = (currentOrderIndex + 1) % playbackOrder.length;
        if (standbyPreloadedIndex !== nextIndex) {
          await cueTrackOnDeck(getStandbyDeckKey(), nextIndex, { updateUI: false, preloadOnly: true });
          standbyPreloadedIndex = nextIndex;
        }

        const fadeDuration = getCrossfadeDurationForTrack(event.target.duration);
        if (remaining <= fadeDuration) {
          await startCrossfade(nextIndex, { duration: fadeDuration });
        }
      }
    }
  }

  function handlePlaying(event) {
    if (event.target !== getActiveAudio()) return;
    isBuffering = false;
    logAudioEvent('playing', event.target);
    ensureAudibleDeck(getActiveDeck());
    // FIX: vinyl rotation synced to 'playing'
    setPlaybackStatus('playing', 'playing');
    notePlaybackProgress();
    startPlaybackMonitor();
    logPlaybackStart(event.target.dataset.trackSrc);
    hideLoading();
    setStatus(`Now playing: ${trackInfo.textContent}`);
    updateSpinState();
    postPanelStatus('playing', trackInfo.textContent);
    cleanupPrefetch(event.target.dataset.trackSrc);
  }

  function handlePause(event) {
    if (event.target !== getActiveAudio()) return;
    isBuffering = false;
    logAudioEvent('pause', event.target);
    if (!event.target.ended) {
      setPlaybackStatus('paused', 'pause');
    }
    updateSpinState();
    resetStallRecovery();
    if (event.target.currentTime > 0 && event.target.currentTime < event.target.duration) {
      setStatus('Playback paused.');
      postPanelStatus('paused', trackInfo.textContent);
    }
  }

  function handleWaiting(event) {
    if (event.target !== getActiveAudio()) return;
    isBuffering = true;
    logAudioEvent(event.type || 'waiting', event.target);
    setPlaybackStatus('loading', event.type || 'waiting');
    showLoading('Buffering…', 'info');
    scheduleStallRecovery();
    updateSpinState();
  }

  function handleCanPlay(event) {
    if (event.target !== getActiveAudio()) return;
    isBuffering = false;
    logAudioEvent('canplay', event.target);
    if (playbackStatus !== 'playing') {
      setPlaybackStatus('loading', event.type || 'canplay');
    }
    hideLoading();
    notePlaybackProgress();
  }

  function handleEnded(event) {
    if (event.target !== getActiveAudio() || isCrossfading) return;
    isBuffering = false;
    logAudioEvent('ended', event.target);
    setPlaybackStatus('paused', 'ended');
    resetStallRecovery();
    updateSpinState();
    setStatus('Track finished. Loading next…');
    playNextTrack(true);
  }

  function handleStalled(event) {
    if (event.target !== getActiveAudio()) return;
    isBuffering = true;
    logAudioEvent('stalled', event.target);
    setPlaybackStatus('error', 'stalled', 'Playback stalled or stream unreachable.');
    hideLoading();
    setStatus('Playback stalled or stream unreachable.', 'error');
    postPanelStatus('error', trackInfo.textContent);
    updateSpinState();
  }

  function handleError(event) {
    if (event.target !== getActiveAudio()) return;
    isBuffering = true;
    const errorMessage = getAudioErrorMessage(event.target);
    logAudioEvent('error', event.target, { error: event?.error, audioError: errorMessage });
    setPlaybackStatus('error', 'error', errorMessage || 'Audio playback error.');
    resetStallRecovery();
    updateSpinState();
    if (playbackStartState && playbackStartState.audioEl === event.target) {
      retryOrFailPlayback(playbackStartState, event?.error || event);
      return;
    }
    hideLoading();
    setStatus('We could not start playback right now. Please check your connection and try again.', 'error');
    postPanelStatus('error', trackInfo.textContent);
    cleanupPrefetch(event.target.dataset.trackSrc);
  }

  const DEBUG_AUDIO_EVENTS = [
    'loadstart', 'loadedmetadata', 'canplay', 'canplaythrough', 'play', 'playing', 'waiting', 'stalled',
    'timeupdate', 'seeking', 'seeked', 'ended', 'pause', 'error', 'abort', 'emptied', 'durationchange'
  ];

  function attachDebugEventLogging(deck) {
    if (!DEBUG_AUDIO_ENABLED || !deck || !deck.audio) return;
    DEBUG_AUDIO_EVENTS.forEach(eventName => {
      deck.audio.addEventListener(eventName, event => {
        logDebug(`event:${eventName}`, captureAudioState(event.target));
        playbackHealth.updateState(event.target);
      });
    });
  }

  Object.values(decks).forEach(deck => {
    const el = deck.audio;
    // FIX: event-driven playbackStatus
    el.addEventListener('loadstart', handleLoadStart);
    el.addEventListener('loadedmetadata', handleLoadedMetadata);
    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('playing', handlePlaying);
    el.addEventListener('pause', handlePause);
    el.addEventListener('waiting', handleWaiting);
    el.addEventListener('stalled', handleStalled);
    el.addEventListener('canplay', handleCanPlay);
    el.addEventListener('canplaythrough', handleCanPlay);
    el.addEventListener('ended', handleEnded);
    el.addEventListener('error', handleError);
    attachDebugEventLogging(deck);
  });

  playbackHealth.updateState(getActiveAudio());

  renderPlaylist();
  loadTrack(currentOrderIndex, { autoplay: false });
})();
