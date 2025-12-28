/* MUSIC PLAYER LOGIC */
    const resolveSunoAudioSrc = window.resolveSunoAudioSrc || (async src => src);
    const existingAudioElement = document.getElementById('audioPlayer');
    const audioPlayer = existingAudioElement || document.createElement('audio');

    function deriveTrackArtist(baseArtist, trackTitle) {
        const artistName = baseArtist || 'Omoluabi';
        if (!trackTitle) return artistName;

        const match = trackTitle.match(/ft\.?\s+(.+)/i);
        if (match && match[1]) {
            return `${artistName} ft. ${match[1].trim()}`;
        }

        return artistName;
    }
    function setCrossOrigin(element, url) {
      try {
        const target = new URL(url, window.location.origin);
        const sameOrigin = target.origin === window.location.origin;
        const allowList = [
          /\.suno\.ai$/i,
          /\.suno\.com$/i,
          /raw\.githubusercontent\.com$/i,
          /githubusercontent\.com$/i,
          /streamguys1\.com$/i,
          /radio\.co$/i,
          /zeno\.fm$/i,
          /akamaized\.net$/i,
          /mystreaming\.net$/i,
          /securenetsystems\.net$/i,
          /github\.io$/i
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
        return `${window.location.protocol}${trimmed}`;
      }

      if (/^http:\/\//i.test(trimmed)) {
        return trimmed.replace(/^http:\/\//i, 'https://');
      }

      return trimmed;
    }
    const audioContext = window.__ariyoAudioContext || (window.__ariyoAudioContext = new (window.AudioContext || window.webkitAudioContext)());
    let isAudioContextResumed = audioContext.state === 'running';
    let audioWarmupRan = false;

    async function resumeAudioContext() {
        if (audioContext.state === 'suspended' && !isAudioContextResumed) {
            try {
                await audioContext.resume();
                isAudioContextResumed = true;
                console.log('AudioContext resumed successfully.');
            } catch (err) {
                console.error('AudioContext resume failed:', err);
            }
        }
        return audioContext.state;
    }

    async function warmupAudioOutput() {
      if (audioWarmupRan) return;
      audioWarmupRan = true;

      try {
        await resumeAudioContext();

        if (audioContext.state === 'running') {
          const buffer = audioContext.createBuffer(1, 1, 22050);
          const source = audioContext.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContext.destination);
          source.start(0);
        }

        audioPlayer.muted = false;
        if (audioPlayer.volume === 0) {
          audioPlayer.volume = 1;
        }
      } catch (error) {
        console.warn('Audio warmup failed; will retry on next interaction.', error);
        audioWarmupRan = false;
      }
    }

    const unlockHandler = () => {
      resumeAudioContext();
      document.removeEventListener('click', unlockHandler);
      document.removeEventListener('touchstart', unlockHandler);
      document.removeEventListener('keydown', unlockHandler);
    };
    document.addEventListener('click', unlockHandler, { passive: true });
    document.addEventListener('touchstart', unlockHandler, { passive: true });
    document.addEventListener('keydown', unlockHandler);
    primeInitialBuffer();

    if (!existingAudioElement) {
        audioPlayer.id = 'audioPlayer';
    }
    audioPlayer.preload = 'auto';
    audioPlayer.volume = 1;
    audioPlayer.muted = false;
    audioPlayer.setAttribute('playsinline', '');
    audioPlayer.setAttribute('controlsList', 'nodownload');
    audioPlayer.addEventListener('contextmenu', e => e.preventDefault());
    audioPlayer.addEventListener('canplaythrough', hidePlaySpinner, { once: false });
    audioPlayer.addEventListener('playing', () => {
      clearBufferingHedge();
      hidePlaySpinner();
    });
    audioPlayer.addEventListener('waiting', () => {
      showPlaySpinner();
      scheduleBufferingHedgeFromSource();
    });
    audioPlayer.addEventListener('stalled', () => {
      showPlaySpinner();
      if (!stallRetryTimer) {
        stallRetryTimer = setTimeout(() => attemptPlay(), 3000);
      }
    });
    if (!existingAudioElement) {
        document.body.appendChild(audioPlayer);
    }
    const albumCover = document.getElementById('albumCover');
    const turntableDisc = document.querySelector('.turntable-disc');
    const trackInfo = document.getElementById('trackInfo');
    const trackArtist = document.getElementById('trackArtist');
    const trackYear = document.getElementById('trackYear');
    const trackAlbum = document.getElementById('trackAlbum'); // Added for album display
    const trackDuration = document.getElementById('trackDuration');
    const seekBar = document.getElementById('seekBar');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const bufferingOverlay = document.getElementById('bufferingOverlay');
    const bufferingMessage = document.getElementById('bufferingMessage');
    const retryButton = document.getElementById('retryButton');
    if (retryButton) {
      retryButton.style.display = 'none';
      retryButton.inert = true;
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

const offlineFallbackTrack = {
  src: 'offline-audio.mp3',
  title: 'Offline Vibes',
  artist: 'Àríyò AI'
};

let offlineFallbackActive = false;
const SLOW_FETCH_TIMEOUT_MS = 8000;

    let currentAlbumIndex = 0;
    let currentTrackIndex = 0;
let currentRadioIndex = -1;
let shuffleQueue = [];
let pendingAlbumIndex = null; // Album selected from the modal but not yet playing
let userInitiatedPause = false;
let lastKnownFiniteDuration = null;

const networkRecoveryState = {
  active: false,
  intervalId: null,
  attemptFn: null,
  wasPlaying: false,
  resumeTime: 0,
  source: null
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

const AUDIO_URL_CACHE_KEY = 'ariyoAudioUrlCache';
const AUDIO_URL_TTL_MS = 24 * 60 * 60 * 1000;

const audioHealer = createSelfHealAudio(audioPlayer);

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

function ensureInitialTrackLoaded(silent = true) {
  if (audioPlayer.src) {
    return true;
  }

  resetOfflineFallback();

  const defaultSelection = getDefaultTrack();
  if (!defaultSelection) {
    return false;
  }

  const { albumIndex, trackIndex, track, album } = defaultSelection;
  applyTrackUiState(albumIndex, trackIndex);
  const normalizedSrc = normalizeMediaSrc(track.src);
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
    warmupAudioOutput().finally(() => ensureInitialTrackLoaded(true));
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

function setPlaybackStatus(status, options = {}) {
  const { message } = options;
  playbackStatus = status;

  if (status === PlaybackStatus.preparing || status === PlaybackStatus.buffering) {
    const messageText = message || 'Lining up your track...';
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
    if (retryButton) {
      retryButton.style.display = 'block';
      retryButton.textContent = 'Retry';
      retryButton.inert = false;
    }
    return;
  }

  if (status === PlaybackStatus.playing) {
    hideRetryButton();
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
      setPlaybackStatus(PlaybackStatus.playing);
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
  startNetworkRecovery('playback-stall');
}

function startPlaybackWatchdog() {
  recordPlaybackProgress(audioPlayer.currentTime || 0);
  if (!playbackWatchdog.intervalId) {
    playbackWatchdog.intervalId = setInterval(checkPlaybackHealth, 5000);
  }
}

function cancelNetworkRecovery() {
  if (networkRecoveryState.intervalId) {
    clearInterval(networkRecoveryState.intervalId);
    networkRecoveryState.intervalId = null;
  }
  networkRecoveryState.active = false;
  networkRecoveryState.attemptFn = null;
  networkRecoveryState.source = null;
  networkRecoveryState.wasPlaying = false;
  networkRecoveryState.resumeTime = 0;
}

function captureCurrentSource() {
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
  if (networkRecoveryState.intervalId) {
    clearInterval(networkRecoveryState.intervalId);
    networkRecoveryState.intervalId = null;
  }
  networkRecoveryState.active = false;
  networkRecoveryState.attemptFn = null;
  networkRecoveryState.source = null;
  networkRecoveryState.wasPlaying = false;
  networkRecoveryState.resumeTime = 0;
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

function buildTrackFetchUrl(src, trackMeta = null) {
  const normalizedSrc = normalizeMediaSrc(src);

  const cachedUrl = getCachedAudioUrl(normalizedSrc);
  if (cachedUrl) {
    return cachedUrl;
  }

  if (trackMeta && trackMeta.sourceType === 'rss') {
    cacheResolvedAudioUrl(normalizedSrc, normalizedSrc);
    return normalizedSrc;
  }

  try {
    const hostname = new URL(normalizedSrc, window.location.origin).hostname;
    const cacheSafeHosts = [
      /cdn\d+\.[^.]+\.ai$/i, // Suno
      /anchor\.fm$/i,
      /cloudfront\.net$/i
    ];
    if (cacheSafeHosts.some(pattern => pattern.test(hostname))) {
      return normalizedSrc;
    }
  } catch (error) {
    console.warn('Unable to analyze track URL for cache busting:', error);
  }

  const separator = normalizedSrc.includes('?') ? '&' : '?';
  return `${normalizedSrc}${separator}t=${Date.now()}`;
}

async function attemptNetworkResume() {
  const source = networkRecoveryState.source;
  if (!source) return false;

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
      setCrossOrigin(audioPlayer, source.src);
      const reloadSrc = appendCacheBuster(source.src);
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
      const fetchUrl = buildTrackFetchUrl(resolvedSrc);
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
      if (isLikelyCorsBlock(error) && originalSrc) {
        const fallbackSrc = appendCacheBuster(originalSrc);
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

  const attemptReconnect = async () => {
    if (!networkRecoveryState.active) return;
    if (!navigator.onLine) {
      console.log('Waiting for network connection to return...');
      return;
    }

    const success = await attemptNetworkResume();
    if (success) {
      console.log('Network recovery successful.');
      finishNetworkRecovery();
      if (!audioPlayer.paused) {
        startPlaybackWatchdog();
      }
    } else {
      console.log('Network recovery attempt failed, will retry.');
    }
  };

  networkRecoveryState.attemptFn = attemptReconnect;
  attemptReconnect();
  networkRecoveryState.intervalId = setInterval(attemptReconnect, 7000);
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

    function updateNextTrackInfo() {
      const nextInfo = document.getElementById('nextTrackInfo');
      if (shuffleMode && shuffleQueue.length > 0) {
        nextInfo.textContent = `Next: ${shuffleQueue[0].title}`;
      } else {
        nextInfo.textContent = '';
      }
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

    function savePlayerState() {
      const playerState = {
        albumIndex: currentAlbumIndex,
        trackIndex: currentTrackIndex,
        radioIndex: currentRadioIndex,
        playbackPosition: audioPlayer.currentTime,
        shuffleMode: shuffleMode,
        shuffleScope: shuffleScope, // Save shuffleScope
        timestamp: new Date().getTime()
      };
      localStorage.setItem('ariyoPlayerState', JSON.stringify(playerState));
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
      }, saveStateConfig.intervalMs);
    }

    window.addEventListener('beforeunload', () => schedulePlayerStateSave(true));

    function loadPlayerState() {
      const savedState = localStorage.getItem('ariyoPlayerState');
      if (savedState) {
        try {
          const playerState = JSON.parse(savedState);
          const ageInHours = (new Date().getTime() - playerState.timestamp) / (1000 * 60 * 60);
          if (ageInHours < 24) {
            // Validate the saved state
            if (playerState.albumIndex >= 0 && playerState.albumIndex < albums.length &&
                playerState.trackIndex >= 0 && playerState.trackIndex < albums[playerState.albumIndex].tracks.length) {
              playerState.shuffleScope = playerState.shuffleScope || 'off';
              return playerState;
            }
          }
        } catch (error) {
          console.error('Error loading player state:', error);
          localStorage.removeItem('ariyoPlayerState');
        }
      }
      return null;
    }

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

    function updateTrackListModal(prefetchDurations = false) {
      const albumIndex = pendingAlbumIndex !== null ? pendingAlbumIndex : currentAlbumIndex;
      const modal = document.getElementById('trackModal');
      const modalVisible = modal && getComputedStyle(modal).display !== 'none';
      const shouldPrefetchDurations = prefetchDurations || modalVisible;
      const album = albums[albumIndex];
      const trackListContainer = document.querySelector('.track-list');
      const trackModalTitle = document.getElementById('trackModalTitle');
      trackModalTitle.textContent = album.name;

      const trackModalMeta = document.getElementById('trackModalMeta');
      if (trackModalMeta) {
        trackModalMeta.innerHTML = '';

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
      }
      trackListContainer.innerHTML = '';

      const banner = document.getElementById('latestTracksBanner');
      const bannerCopy = document.getElementById('latestTracksCopy');
      const bannerActions = document.getElementById('latestTracksActions');
      if (banner && bannerCopy && bannerActions) {
        bannerActions.innerHTML = '';
        if (Array.isArray(latestTracks) && latestTracks.length) {
          const albumName = albums[albumIndex].name;
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
          const intro = albumHighlights.length
            ? `New in ${albumName}`
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
          const newsNote = 'Àríyò AI Media Studio now streams Naija Vibe News alongside your playlists—open the news panel for fresh headlines.';
          const combinedCopy = [announcementCopy.trim(), newsNote].filter(Boolean).join(' ');
          bannerCopy.textContent = combinedCopy.trim();
          latestTracks.forEach(track => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'latest-track-button';
            button.textContent = `▶ Play “${track.title}”`;
            button.setAttribute('aria-label', `Play the latest track ${track.title}`);
            button.addEventListener('click', () => {
              const albumIdx = albums.findIndex(album => album.name === track.albumName);
              if (albumIdx === -1) {
                return;
              }
              const trackIdx = albums[albumIdx].tracks.findIndex(albumTrack => albumTrack.title === track.title && albumTrack.src === track.src);
              if (trackIdx === -1) {
                pendingAlbumIndex = albumIdx;
                currentAlbumIndex = albumIdx;
                updateTrackListModal();
                return;
              }
              currentAlbumIndex = albumIdx;
              pendingAlbumIndex = null;
              closeTrackList();
              selectTrack(albums[albumIdx].tracks[trackIdx].src, albums[albumIdx].tracks[trackIdx].title, trackIdx);
            });
            bannerActions.appendChild(button);
          });
          const newsButton = document.createElement('button');
          newsButton.type = 'button';
          newsButton.className = 'latest-track-button';
          newsButton.textContent = '📰 Open Naija Vibe News';
          newsButton.setAttribute('aria-label', 'Open the Naija Vibe News panel');
          newsButton.addEventListener('click', () => {
            if (typeof window.openPanel === 'function') {
              window.openPanel('news-section');
            }
          });
          bannerActions.appendChild(newsButton);
          banner.hidden = false;
        } else {
          banner.hidden = true;
          bannerCopy.textContent = '';
          bannerActions.innerHTML = '';
        }
      }

      // Build an array of track indices and shuffle them (except for playlist)
      let trackIndices = albums[albumIndex].tracks.map((_, i) => i);
      if (albumIndex !== playlistAlbumIndex) {
        for (let i = trackIndices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [trackIndices[i], trackIndices[j]] = [trackIndices[j], trackIndices[i]];
        }
      }

      trackIndices.forEach(index => {
        const track = albums[albumIndex].tracks[index];
        // Use cached duration if available, otherwise fetch it
        const displayDuration = track.duration
          ? formatTime(track.duration)
          : track.isLive
            ? 'Live'
            : '';

        const item = document.createElement('div');
        item.className = 'track-item';
        item.addEventListener('click', () => {
          currentAlbumIndex = albumIndex;
          pendingAlbumIndex = null;
          closeTrackList();
          selectTrack(track.src, track.title, index);
        });

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
          setCrossOrigin(tempAudio, track.src);
          tempAudio.src = track.src;
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
      console.log(`Track list updated for album: ${albums[albumIndex].name}`);
    }

    const stationsPerPage = 6;
let stationDisplayCounts = { nigeria: 0, westAfrica: 0, international: 0 };

// Region Classifier
function classifyStation(station) {
  const nigeriaLocations = ["Nigeria", "Lagos", "Ibadan", "Abuja", "Abeokuta", "Uyo", "Jos", "Kaduna", "Nassarawa", "Abia", "Ondo", "Calabar", "Aba"];
  const westAfricaLocations = ["Accra", "Ghana", "West Africa"];

  if (nigeriaLocations.includes(station.location)) return "nigeria";
  if (westAfricaLocations.includes(station.location)) return "westAfrica";
  return "international";
}

// Grouped Stations
const groupedStations = { nigeria: [], westAfrica: [], international: [] };
radioStations.forEach(station => {
  const region = classifyStation(station);
  groupedStations[region].push(station);
});

async function checkStreamStatus(url) {
      return new Promise(resolve => {
        const testAudio = document.createElement('audio');
        let settled = false;

        const cleanup = () => {
          testAudio.removeEventListener('canplay', onCanPlay);
          testAudio.removeEventListener('error', onError);
          testAudio.src = '';
        };

        const onCanPlay = () => {
          if (!settled) {
            settled = true;
            cleanup();
            resolve('online');
          }
        };

        const onError = () => {
          if (!settled) {
            settled = true;
            cleanup();
            resolve('offline');
          }
        };

        setCrossOrigin(testAudio, url);
        testAudio.preload = 'auto';
        testAudio.addEventListener('canplay', onCanPlay, { once: true });
        testAudio.addEventListener('error', onError, { once: true });
        testAudio.src = url;
        testAudio.load();

        setTimeout(() => {
          if (!settled) {
            settled = true;
            cleanup();
            resolve('offline');
          }
        }, 10000); // fallback timeout
      });
    }

    function updateRadioListModal() {
      stationDisplayCounts = { nigeria: 0, westAfrica: 0, international: 0 };

      ["nigeria", "westAfrica", "international"].forEach(region => {
        document.getElementById(`${region}-stations`).innerHTML = '';
        document.querySelector(`button[onclick="loadMoreStations('${region}')"]`).style.display = 'inline-block';
        loadMoreStations(region);
      });

      console.log("Grouped and displayed radio stations by region");
    }

function loadMoreStations(region) {
  const container = document.getElementById(`${region}-stations`);
  const stations = groupedStations[region];
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

    checkStreamStatus(station.url).then(status => {
        statusSpan.textContent = status === 'online' ? ' (Online)' : ' (Offline)';
        statusSpan.style.color = status === 'online' ? 'lightgreen' : 'red';
        if (status !== 'online') {
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
      console.log(`Selecting album: ${albums[albumIndex].name}`);
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
    const year = album.releaseYear || 2025;
    trackYear.textContent = `Release Year: ${year}`;
    trackAlbum.textContent = `Album: ${album.name}`;
    albumCover.src = album.cover;
    loadLyrics(track.lrc);
    document.getElementById('progressBar').style.display = 'block';
    progressBar.style.width = '0%';
    updateNextTrackInfo();
    updateMediaSession();
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
    const trackCount = albums[currentAlbumIndex].tracks.length;
    const targetIndex = (currentTrackIndex + direction + trackCount) % trackCount;
    const track = albums[currentAlbumIndex].tracks[targetIndex];
    if (!track) return null;
    return {
        src: track.src,
        title: track.title,
        albumIndex: currentAlbumIndex,
        trackIndex: targetIndex
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
  onError = null
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
    onError
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
        disableSlowGuard: true,
        allowCorsRetry: false
      });
      attemptPlay();
    })
    .catch(error => {
      console.warn('[player] Suno resolve skipped:', error);
    });
}


async function selectTrack(src, title, index, rebuildQueue = true) {
      console.log(`[selectTrack] called with: src=${src}, title=${title}, index=${index}`);
      resetOfflineFallback();
      cancelNetworkRecovery();
      clearSlowBufferRescue();
      await warmupAudioOutput();
      await resumeAudioContext();
      audioPlayer.autoplay = true;
      audioPlayer.muted = false;
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
      const isLiveTrack = Boolean(trackMeta && trackMeta.isLive);
      showBufferingState('Loading your track...');
      albumCover.style.display = 'none';
      hideRetryButton();
      setTurntableSpin(false);

      const normalizedSrc = normalizeMediaSrc(trackMeta?.src || src);
      const handlePlaybackError = createPlaybackErrorHandler(trackMeta, normalizedSrc);
      primePlaybackSource({
        normalizedSrc,
        title,
        trackMeta,
        live: isLiveTrack,
        isInitialLoad: false,
        onReady: () => {
          // Keep the track list open for non-user-initiated loads to avoid fighting the UI.
          // The modal is explicitly closed by the track selection UI when needed.
        },
        onError: () => handlePlaybackError()
      });

      // Begin playback immediately after the user selects a track instead of waiting for
      // metadata events. The autoplay safeguards in handleAudioLoad will keep the state
      // consistent if the play promise settles later.
      await attemptPlay();

      updateMediaSession();
      showNowPlayingToast(title);
      if (shuffleMode && rebuildQueue) {
        buildShuffleQueue();
      }
    }

async function selectRadio(src, title, index, logo) {
      console.log(`[selectRadio] called with: src=${src}, title=${title}, index=${index}`);
      resetOfflineFallback();
      cancelNetworkRecovery();
      clearSlowBufferRescue();
      await warmupAudioOutput();
      resumeAudioContext();
      closeRadioList();
      console.log(`[selectRadio] Selecting radio: ${title}`);
      const station = radioStations[index];
      currentRadioIndex = index;
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
      const normalizedSrc = normalizeMediaSrc(src);
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
      closeRadioList();
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
        trackMeta: null,
        live: true,
        isInitialLoad: true
      });
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
      albumCover.classList.remove('spin');
      if (!turntableDisc) return;
      turntableDisc.classList.remove('spin');
      if (isSpinning) {
        turntableDisc.classList.add('spin');
      }
    }

    function shouldSpinVinyl() {
      const readyState = typeof HTMLMediaElement !== 'undefined'
        ? HTMLMediaElement.HAVE_CURRENT_DATA
        : 2;
      const hasAudibleState = (audioPlayer.currentTime || 0) > 0 || audioPlayer.readyState >= readyState;
      return playbackStatus === PlaybackStatus.playing && !audioPlayer.paused && !audioPlayer.ended && hasAudibleState;
    }

    function manageVinylRotation() {
      setTurntableSpin(shouldSpinVinyl());
    }

    function playMusic() {
        attemptPlay();
    }

    async function attemptPlay() {
      console.log('[attemptPlay] called');
      userInitiatedPause = false;
      showPlaySpinner();
      await warmupAudioOutput();
      await resumeAudioContext();
      ensureInitialTrackLoaded();
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
          setPlaybackStatus(PlaybackStatus.playing);
          clearQuickStartDeadline();
          hidePlaySpinner();
          const progressBarElement = document.getElementById('progressBar');
          if (progressBarElement) {
            progressBarElement.style.display = 'block';
          }
          if (lastTrackTitle) {
            trackInfo.textContent = lastTrackTitle;
          }
          manageVinylRotation();
          audioPlayer.removeEventListener('timeupdate', updateTrackTime);
          audioPlayer.addEventListener('timeupdate', updateTrackTime);
          recordPlaybackProgress(audioPlayer.currentTime || 0);
          startPlaybackWatchdog();
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
          handlePlayError(error, trackInfo.textContent);
        });
      }
    }

    function handlePlayError(error, title) {
      clearQuickStartDeadline();
      if (!audioPlayer.src) {
        trackInfo.textContent = 'Choose a track to start playback.';
        hideRetryButton();
        setPlaybackStatus(PlaybackStatus.idle);
        return;
      }

      setPlaybackStatus(PlaybackStatus.failed, { message: 'Playback was interrupted. Tap play to resume.' });
      albumCover.style.display = 'block';
      document.getElementById('progressBar').style.display = 'none';
      setTurntableSpin(false);
      console.error(`Error playing ${title}:`, error);

      if (!navigator.onLine || (error && error.code === MediaError.MEDIA_ERR_NETWORK)) {
        startNetworkRecovery('play-error');
        return;
      }

      // Surface retry control immediately to keep listeners in control
      hidePlaySpinner();
      showRetryButton('Retry playback');
    }

function pauseMusic() {
    cancelNetworkRecovery();
    userInitiatedPause = true;
    clearQuickStartDeadline();
    clearSilentStartGuard();
    audioPlayer.pause();
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

  if (currentTime > 0 && playbackStatus !== PlaybackStatus.playing) {
    hideBufferingState();
    hidePlaySpinner();
    setPlaybackStatus(PlaybackStatus.playing);
    manageVinylRotation();
    clearSilentStartGuard();
  }

    if (hasFiniteDuration) {
      lastKnownFiniteDuration = duration;
    }

    // 🔒 If it's a radio stream, don't format duration
    if (currentRadioIndex >= 0) {
      trackDuration.textContent = `${formatTime(currentTime)} / Live`;
      seekBar.style.display = 'none'; // hide seekbar for radio
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

    function handleTrackEnded() {
      console.log("Track ended, selecting next track...");
      audioPlayer.removeEventListener('timeupdate', updateTrackTime);
      manageVinylRotation();
      stopPlaybackWatchdog(false);
      setPlaybackStatus(PlaybackStatus.stopped);

      if (currentRadioIndex !== -1) return; // Only advance albums/podcasts, not live radio

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

    audioPlayer.addEventListener('play', manageVinylRotation);
    audioPlayer.addEventListener('pause', event => {
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
    audioPlayer.addEventListener('ended', manageVinylRotation);

    audioPlayer.addEventListener('playing', () => {
      audioPlayer.removeEventListener('timeupdate', updateTrackTime); // clear old listener
      audioPlayer.addEventListener('timeupdate', updateTrackTime);    // reattach freshly
      updateTrackTime();  // update UI instantly
      manageVinylRotation(); // spin the turntable if needed
      recordPlaybackProgress(audioPlayer.currentTime || 0);
      startPlaybackWatchdog();
      console.log(`🎧 Time tracking active: ${trackInfo.textContent}`);
      syncMediaSessionPlaybackState();
      clearFirstPlayGuard();
      hideBufferingState();
      hidePlaySpinner();
      setPlaybackStatus(PlaybackStatus.playing);
    });

    audioPlayer.addEventListener('error', clearFirstPlayGuard);
    audioPlayer.addEventListener('stalled', scheduleFirstPlayGuard);

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
  if (!navigator.onLine) {
    startNetworkRecovery(event.type);
    return;
  }

  const haveFutureData = typeof HTMLMediaElement !== 'undefined'
    ? HTMLMediaElement.HAVE_FUTURE_DATA
    : 3;

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

  if (currentRadioIndex !== -1) {
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
      const trackCount = albums[currentAlbumIndex].tracks.length;
      currentTrackIndex = (currentTrackIndex + direction + trackCount) % trackCount;
      selectTrack(
        albums[currentAlbumIndex].tracks[currentTrackIndex].src,
        albums[currentAlbumIndex].tracks[currentTrackIndex].title,
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
    loadMoreStations
  });
}
