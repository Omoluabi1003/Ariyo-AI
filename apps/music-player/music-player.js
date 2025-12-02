(function () {
  const deckAudioA = document.getElementById('audioPlayer');
  const deckAudioB = document.getElementById('audioDeckB');
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
        artist: track.artist || artist,
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

  function setStatus(message, tone = 'info') {
    if (!statusMessage) return;
    statusMessage.textContent = message || '';
    statusMessage.dataset.tone = tone;
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

  function prefetchTrack(orderIndex) {
    if (!Number.isInteger(orderIndex) || playbackOrder.length <= 1) return;
    const track = allTracks[playbackOrder[orderIndex]];
    const currentTrackSrc = getActiveAudio().dataset.trackSrc;
    if (!track || prefetchCache.has(track.src) || track.src === currentTrackSrc) return;

    const prefetchAudio = new Audio();
    prefetchAudio.preload = 'auto';
    setCrossOrigin(track.src, prefetchAudio);
    prefetchAudio.src = track.src;

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

  function cueTrackOnDeck(deckKey, orderIndex, { updateUI = true, preloadOnly = false } = {}) {
    const trackIndex = playbackOrder[orderIndex];
    const track = allTracks[trackIndex];
    if (!track) return null;

    const deck = decks[deckKey];
    ensureAudioGraph(deck);
    setCrossOrigin(track.src, deck.audio);
    deck.audio.src = track.src;
    deck.audio.dataset.trackSrc = track.src;
    deck.audio.dataset.isLive = String(isLiveStreamTrack(track));
    deck.audio.dataset.sourceType = track.sourceType || '';

    try {
      deck.audio.load();
    } catch (_) {
      // Ignore load errors for browsers that block preloading.
    }

    if (updateUI) {
      currentOrderIndex = orderIndex;
      updateTrackMetadata(track);
      postPanelStatus('loading', track.title);
      prefetchUpcomingTracks(currentOrderIndex);
    }

    if (!preloadOnly) {
      loadingSpinner.style.display = 'block';
      setStatus('Loading track…');
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
    updateSpinState();
    updateDjMixUi();
  }

  function startCrossfade(orderIndex, { duration = crossfadeDurationSeconds } = {}) {
    if (isCrossfading || !playbackOrder.length) return;
    const incomingKey = getStandbyDeckKey();
    const outgoingKey = activeDeckKey;
    const queued = cueTrackOnDeck(incomingKey, orderIndex, { updateUI: true });
    if (!queued) return;

    const incomingDeck = queued.deck;
    const outgoingDeck = decks[outgoingKey];
    const targetVolume = Number(volumeControl.value || 1);

    ensureAudioGraph(incomingDeck);
    ensureAudioGraph(outgoingDeck);

    setDeckVolume(incomingDeck, 0);
    isCrossfading = true;
    fadingDeckKey = outgoingKey;
    activeDeckKey = incomingKey;
    updateDjMixUi();

    const playPromise = incomingDeck.audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        setStatus('Tap play to continue the mix.', 'warning');
      });
    }

    rampVolume(incomingDeck, 0, targetVolume, duration);
    rampVolume(outgoingDeck, targetVolume, 0, duration, () => {
      completeSwitch(incomingKey, outgoingKey, targetVolume);
    });
  }

  function transitionToOrderIndex(orderIndex, { autoplay = true, preferCrossfade = true, shortFade = false } = {}) {
    const shouldCrossfade = preferCrossfade && djAutoMixEnabled && autoplay && playbackOrder.length > 1;
    if (shouldCrossfade) {
      const duration = shortFade ? Math.max(2, crossfadeDurationSeconds / 2) : crossfadeDurationSeconds;
      startCrossfade(orderIndex, { duration });
      return;
    }

    const incomingKey = getStandbyDeckKey();
    const outgoingKey = activeDeckKey;
    const queued = cueTrackOnDeck(incomingKey, orderIndex, { updateUI: true });
    if (!queued) return;

    const targetVolume = Number(volumeControl.value || 1);
    const incomingDeck = queued.deck;
    const outgoingDeck = decks[outgoingKey];
    ensureAudioGraph(incomingDeck);
    ensureAudioGraph(outgoingDeck);
    setDeckVolume(incomingDeck, targetVolume);

    if (autoplay) {
      const playPromise = incomingDeck.audio.play();
      if (playPromise) {
        playPromise.catch(() => {
          setStatus('Tap play to start listening.', 'warning');
          updateSpinState();
        });
      }
    }

    outgoingDeck.audio.pause();
    outgoingDeck.audio.currentTime = 0;
    activeDeckKey = incomingKey;
    fadingDeckKey = null;
    standbyPreloadedIndex = null;
    cleanupPrefetch(incomingDeck.audio.dataset.trackSrc);
    updateSpinState();
  }

  function loadTrack(orderIndex, { autoplay = false } = {}) {
    transitionToOrderIndex(orderIndex, { autoplay, preferCrossfade: djAutoMixEnabled });
  }

  function playCurrentTrack() {
    const activeAudio = getActiveAudio();
    ensureAudioGraph(getActiveDeck());
    const playPromise = activeAudio.play();
    if (playPromise) {
      playPromise.catch(() => {
        setStatus('Playback blocked by your browser. Tap play again.', 'warning');
        updateSpinState();
      });
    }
  }

  function stopPlayback() {
    Object.values(decks).forEach(deck => {
      deck.audio.pause();
      deck.audio.currentTime = 0;
    });
    updateSpinState();
    setStatus('Playback stopped.');
  }

  function playNextTrack(auto = false) {
    if (!playbackOrder.length) return;
    const nextIndex = (currentOrderIndex + 1) % playbackOrder.length;
    transitionToOrderIndex(nextIndex, { autoplay: auto ? true : !getActiveAudio().paused, shortFade: !auto });
  }

  function playPreviousTrack() {
    if (!playbackOrder.length) return;
    const prevIndex = (currentOrderIndex - 1 + playbackOrder.length) % playbackOrder.length;
    transitionToOrderIndex(prevIndex, { autoplay: !getActiveAudio().paused, shortFade: true });
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

  function handleTimeUpdate(event) {
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
          cueTrackOnDeck(getStandbyDeckKey(), nextIndex, { updateUI: false, preloadOnly: true });
          standbyPreloadedIndex = nextIndex;
        }

        const fadeDuration = getCrossfadeDurationForTrack(event.target.duration);
        if (remaining <= fadeDuration) {
          startCrossfade(nextIndex, { duration: fadeDuration });
        }
      }
    }
  }

  function handlePlaying(event) {
    if (event.target !== getActiveAudio()) return;
    loadingSpinner.style.display = 'none';
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
    loadingSpinner.style.display = 'block';
    setStatus('Buffering…', 'info');
  }

  function handleCanPlay(event) {
    if (event.target !== getActiveAudio()) return;
    loadingSpinner.style.display = 'none';
  }

  function handleEnded(event) {
    if (event.target !== getActiveAudio() || isCrossfading) return;
    updateSpinState();
    setStatus('Track finished. Loading next…');
    playNextTrack(true);
  }

  function handleError(event) {
    if (event.target !== getActiveAudio()) return;
    loadingSpinner.style.display = 'none';
    setStatus('Unable to play this track. Please try another one.', 'error');
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
