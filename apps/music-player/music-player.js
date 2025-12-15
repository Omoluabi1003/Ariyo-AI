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
  const PLAYBACK_START_TIMEOUT_MS = 8000;
  const PLAYBACK_MAX_RETRIES = 2;
  const PLAYBACK_RETRY_DELAY_MS = 600;

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
  const allTracks = [];

  albums.forEach((album, albumIndex) => {
    if (!album || !Array.isArray(album.tracks)) {
      return;
    }

    const artist = album.artist || 'Omoluabi';
    const releaseYear = typeof album.releaseYear !== 'undefined' ? album.releaseYear : '2025';
    const cover = album.cover || album.coverImage || '../../Logo.jpg';
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
        releaseYear,
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
  let crossfaderFrame = null;
  let playbackStartState = null;
  const preconnectedHosts = new Set();

  function getCrossfadeDurationForTrack(trackDurationSeconds) {
    if (!trackDurationSeconds || !Number.isFinite(trackDurationSeconds)) {
      return crossfadeDurationSeconds;
    }

    const maxFadeShare = 0.25;
    const minimumFadeSeconds = 2;
    const cappedByTrackLength = Math.max(minimumFadeSeconds, trackDurationSeconds * maxFadeShare);
    return Math.min(crossfadeDurationSeconds, cappedByTrackLength);
  }

  function createDeck(audioElement) {
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

  async function resumeAudioContext() {
    if (!audioContext || typeof audioContext.resume !== 'function') return;
    try {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
    } catch (_) {
      // Ignore resume failures so playback attempts still proceed.
    }
  }

  function ensureAudioGraph(deck) {
    if (!AudioContextClass || deck.gainNode) return;
    audioContext = audioContext || new AudioContext();
    if (!audioContext) return;
    try {
      deck.sourceNode = audioContext.createMediaElementSource(deck.audio);
      deck.gainNode = audioContext.createGain();
      deck.gainNode.gain.value = Number(volumeControl.value || 1);
      deck.sourceNode.connect(deck.gainNode).connect(audioContext.destination);
    } catch (_) {
      deck.gainNode = null;
    }
  }

  function unlockAudio() {
    if (!AudioContextClass) return;
    audioContext = audioContext || new AudioContext();
    if (!audioContext) return;

    resumeAudioContext();

    if (audioContext.state === 'running') return;

    try {
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
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
  const albumDurationState = new Map();

  function requestTrackDuration(track, { disableCors = false } = {}) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'metadata';

      if (disableCors) {
        audio.removeAttribute('crossorigin');
      } else {
        setCrossOrigin(track.src, audio);
      }

      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', handleSuccess);
        audio.removeEventListener('error', handleError);
        audio.removeAttribute('src');
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
        resolveSunoAudioSrc(track.src).then(resolved => {
          audio.src = resolved;
          audio.load();
        }).catch(error => {
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

    const promise = (async () => {
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
    })();

    durationPromises.set(track.src, promise);
    const result = await promise;
    durationPromises.delete(track.src);
    return result;
  }

  function updateAlbumDurationLabel(albumIndex, durationSeconds) {
    const state = albumDurationState.get(albumIndex);
    if (!state) return;

    if (arguments.length > 1) {
      if (Number.isFinite(durationSeconds)) {
        state.totalSeconds += durationSeconds;
      }
      state.pending = Math.max(0, (state.pending || 0) - 1);
    }

    let label = ' • Unknown length';
    if (state.totalSeconds > 0) {
      label = ` • ${formatAlbumDuration(state.totalSeconds)}${state.pending > 0 ? '…' : ''}`;
    } else if (state.pending > 0) {
      label = ' • Calculating…';
    }

    state.element.textContent = label;
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
    // Update this message to change the user-facing playback failure copy.
    setStatus('We could not start playback right now. Please check your connection and try again.', 'error');
    postPanelStatus('error', state.trackTitle || '');
    console.error('[player] Playback failed after retries', { error });
  }

  function beginPlaybackStart(deckKey, track) {
    const deck = decks[deckKey];
    if (!deck || !deck.audio) return;

    resetPlaybackStartState();
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

    const startAttempt = () => {
      if (!isActivePlaybackState(state)) return;
      state.timeoutId = setTimeout(() => {
        retryOrFailPlayback(state, new Error('playback timeout'));
      }, PLAYBACK_START_TIMEOUT_MS);

      resumeAudioContext().finally(() => {
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
      const { hostname } = new URL(url, window.location.href);
      const allowList = ['raw.githubusercontent.com', 'githubusercontent.com', 'zeno.fm', 'streamguys1.com', 'suno.ai'];
      if (allowList.some(host => hostname.endsWith(host))) {
        element.crossOrigin = 'anonymous';
      } else {
        element.removeAttribute('crossorigin');
      }
    } catch (_) {
      element.removeAttribute('crossorigin');
    }
  }

  function updateSpinState() {
    const activeAudio = getActiveAudio();
    const shouldSpin = activeAudio && !activeAudio.paused && !activeAudio.ended && !activeAudio.seeking;
    [turntableDisc, albumCover].forEach(element => {
      if (!element) return;
      element.classList.toggle('spin', shouldSpin);
    });

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
    if (!track || prefetchCache.has(track.src) || track.src === currentTrackSrc) return;

    const prefetchAudio = new Audio();
    prefetchAudio.preload = 'auto';
    const resolvedSrc = await resolveSunoAudioSrc(track.src);
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
      const safeYear = releaseYear || '2025';
      meta.textContent = `${safeYear} • ${trackCount} track${trackCount === 1 ? '' : 's'}`;

      const durationLabel = document.createElement('span');
      durationLabel.className = 'album-duration';
      meta.appendChild(durationLabel);
      const pendingDurations = tracks.filter(track => !isLiveStreamTrack(track)).length;
      albumDurationState.set(albumIndex, {
        element: durationLabel,
        pending: pendingDurations,
        totalSeconds: 0,
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
          updateAlbumDurationLabel(albumIndex);
        } else {
          trackDurationLabel.textContent = 'Loading…';
          loadTrackDuration(track)
            .then(durationSeconds => {
              if (Number.isFinite(durationSeconds)) {
                trackDurationLabel.textContent = formatTime(durationSeconds);
              } else {
                trackDurationLabel.textContent = 'Unknown length';
              }
              updateAlbumDurationLabel(albumIndex, durationSeconds);
            })
            .catch(() => {
              trackDurationLabel.textContent = 'Unknown length';
              updateAlbumDurationLabel(albumIndex, null);
            });
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
    trackYear.textContent = `Release Year: ${track.releaseYear}`;
    albumCover.src = track.cover || '../../Logo.jpg';
    progressBarFill.style.width = '0%';
    seekBar.value = 0;
    seekBar.disabled = isLive;
    seekBar.setAttribute('aria-disabled', String(isLive));
    trackDuration.textContent = isLive ? 'Live • Afrobeats' : '0:00 / 0:00';
    updatePlaylistHighlight();
    updateNextTrackLabel();
  }

  async function cueTrackOnDeck(deckKey, orderIndex, { updateUI = true, preloadOnly = false } = {}) {
    const trackIndex = playbackOrder[orderIndex];
    const track = allTracks[trackIndex];
    if (!track) return null;

    const deck = decks[deckKey];
    ensureAudioGraph(deck);
    const resolvedSrc = await resolveSunoAudioSrc(track.src);
    ensurePreconnect(resolvedSrc);
    setCrossOrigin(resolvedSrc, deck.audio);
    deck.audio.autoplay = !preloadOnly;
    deck.audio.preload = preloadOnly ? 'metadata' : 'auto';

    if (prefetchCache.has(track.src)) {
      // Promote the prefetched response so play() can start immediately from cache.
      deck.audio.src = prefetchCache.get(track.src).currentSrc || resolvedSrc;
    } else {
      deck.audio.src = resolvedSrc;
    }

    deck.audio.dataset.trackSrc = track.src;
    deck.audio.dataset.isLive = String(isLiveStreamTrack(track));
    deck.audio.dataset.sourceType = track.sourceType || '';

    if (typeof deck.audio.fastSeek === 'function') {
      try {
        deck.audio.fastSeek(0);
      } catch (_) {
        deck.audio.currentTime = 0;
      }
    } else {
      deck.audio.currentTime = 0;
    }

    try {
      deck.audio.load();
    } catch (_) {
      // Ignore load errors for browsers that block preloading.
    }

    if (updateUI) {
      currentOrderIndex = orderIndex;
      updateTrackMetadata(track);
      updateOverlayMetadata(deckKey, track);
      postPanelStatus('loading', track.title);
      prefetchUpcomingTracks(currentOrderIndex);
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
    await transitionToOrderIndex(orderIndex, { autoplay, preferCrossfade: djAutoMixEnabled });
  }

  async function playCurrentTrack() {
    const activeAudio = getActiveAudio();
    ensureAudioGraph(getActiveDeck());
    await resumeAudioContext();
    const playPromise = activeAudio.play();
    if (playPromise) {
      playPromise.catch(() => {
        setStatus('Playback blocked by your browser. Tap play again.', 'warning');
        updateSpinState();
      });
    }
  }

  function stopPlayback() {
    resetPlaybackStartState();
    Object.values(decks).forEach(deck => {
      deck.audio.pause();
      deck.audio.currentTime = 0;
    });
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
    logPlaybackStart(event.target.dataset.trackSrc);
    hideLoading();
    setStatus(`Now playing: ${trackInfo.textContent}`);
    updateSpinState();
    postPanelStatus('playing', trackInfo.textContent);
    cleanupPrefetch(event.target.dataset.trackSrc);
  }

  function handlePause(event) {
    if (event.target !== getActiveAudio()) return;
    updateSpinState();
    if (event.target.currentTime > 0 && event.target.currentTime < event.target.duration) {
      setStatus('Playback paused.');
      postPanelStatus('paused', trackInfo.textContent);
    }
  }

  function handleWaiting(event) {
    if (event.target !== getActiveAudio()) return;
    showLoading('Buffering…', 'info');
  }

  function handleCanPlay(event) {
    if (event.target !== getActiveAudio()) return;
    hideLoading();
  }

  function handleEnded(event) {
    if (event.target !== getActiveAudio() || isCrossfading) return;
    updateSpinState();
    setStatus('Track finished. Loading next…');
    playNextTrack(true);
  }

  function handleError(event) {
    if (event.target !== getActiveAudio()) return;
    if (playbackStartState && playbackStartState.audioEl === event.target) {
      retryOrFailPlayback(playbackStartState, event?.error || event);
      return;
    }
    hideLoading();
    setStatus('We could not start playback right now. Please check your connection and try again.', 'error');
    postPanelStatus('error', trackInfo.textContent);
    cleanupPrefetch(event.target.dataset.trackSrc);
  }

  Object.values(decks).forEach(deck => {
    const el = deck.audio;
    el.addEventListener('loadedmetadata', handleLoadedMetadata);
    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('playing', handlePlaying);
    el.addEventListener('pause', handlePause);
    el.addEventListener('waiting', handleWaiting);
    el.addEventListener('canplay', handleCanPlay);
    el.addEventListener('ended', handleEnded);
    el.addEventListener('error', handleError);
  });

  renderPlaylist();
  loadTrack(currentOrderIndex, { autoplay: false });
})();
