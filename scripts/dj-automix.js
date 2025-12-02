(() => {
  const crossfadeDuration = 8; // seconds
  const decks = {
    A: { audio: new Audio(), vinyl: null, meta: null, trackIndex: 0 },
    B: { audio: new Audio(), vinyl: null, meta: null, trackIndex: 1 },
  };

  let autoMixEnabled = false;
  let currentDeck = 'A';
  let currentIndex = 0;
  let activeAlbumIndex = 0;
  let crossfadeFrame = null;
  let isCrossfading = false;
  let autoMixStatus;
  let overlay;
  let toggleButton;
  let closeButton;
  let crossfader;
  let djMixStatusInfo;

  function initAutoMixUI() {
    overlay = document.getElementById('autoDjOverlay');
    toggleButton = document.getElementById('autoDjToggle');
    closeButton = document.getElementById('autoDjClose');
    crossfader = document.getElementById('djCrossfader');
    autoMixStatus = document.getElementById('autoDjStatus');
    djMixStatusInfo = document.getElementById('djMixStatusInfo');

    decks.A.vinyl = document.getElementById('deckA_vinyl');
    decks.B.vinyl = document.getElementById('deckB_vinyl');
    decks.A.meta = document.getElementById('deckA_meta');
    decks.B.meta = document.getElementById('deckB_meta');

    Object.values(decks).forEach(({ audio }) => {
      audio.preload = 'auto';
      audio.volume = 1;
      audio.setAttribute('playsinline', '');
    });

    attachAutoMixEvents();
    updateStatus('Auto-mix: Idle');
  }

  function attachAutoMixEvents() {
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        if (autoMixEnabled) {
          stopAutoMix();
        } else {
          startAutoMix();
        }
      });
    }

    if (closeButton) {
      closeButton.addEventListener('click', stopAutoMix);
    }
  }

  function getPlaylist() {
    if (!window.albums || typeof window.currentAlbumIndex !== 'number') return [];
    const albumIndex = autoMixEnabled ? activeAlbumIndex : window.currentAlbumIndex;
    const album = window.albums[albumIndex];
    return (album && Array.isArray(album.tracks)) ? album.tracks : [];
  }

  function startAutoMix() {
    if (typeof window.currentRadioIndex !== 'undefined' && window.currentRadioIndex !== -1) {
      updateStatus('Auto-mix: Not available for radio streams');
      return;
    }
    const playlist = getPlaylist();
    if (!playlist.length) {
      updateStatus('Auto-mix: No album loaded');
      return;
    }

    if (playlist.length < 2) {
      updateStatus('Auto-mix needs 2+ tracks.');
      return;
    }

    resumeAudioContext?.();
    window.audioPlayer?.pause();

    activeAlbumIndex = window.currentAlbumIndex || 0;
    currentIndex = typeof window.currentTrackIndex === 'number' ? window.currentTrackIndex : 0;

    loadTrackIntoDeck('A', currentIndex);
    loadTrackIntoDeck('B', getWrappedIndex(currentIndex + 1));

    if (typeof applyTrackUiState === 'function') {
      applyTrackUiState(activeAlbumIndex, currentIndex);
    }

    decks.A.audio.volume = 1;
    decks.B.audio.volume = 0;
    decks.A.audio.currentTime = 0;
    decks.B.audio.currentTime = 0;

    decks.A.audio.play().catch(console.error);
    setDeckSpinning('A', true);
    setDeckSpinning('B', false);
    bindActiveTimeUpdate();

    currentDeck = 'A';
    autoMixEnabled = true;
    window.djAutoMixEnabled = true;
    toggleOverlay(true);
    setToggleState(true);
    updateStatus('Auto-mix: Playing');
    updateMixBadge(true);
    updateCrossfaderUI(0);
  }

  function stopAutoMix() {
    autoMixEnabled = false;
    window.djAutoMixEnabled = false;
    cancelAnimationFrame(crossfadeFrame);
    crossfadeFrame = null;
    isCrossfading = false;

    Object.values(decks).forEach(({ audio, vinyl }) => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
      if (vinyl) vinyl.classList.remove('spinning');
    });

    toggleOverlay(false);
    setToggleState(false);
    updateStatus('Auto-mix: Off');
    updateMixBadge(false);
    updateCrossfaderUI(0);
  }

  function toggleOverlay(show) {
    if (!overlay) return;
    overlay.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function setToggleState(active) {
    if (!toggleButton) return;
    toggleButton.classList.toggle('active', active);
    toggleButton.setAttribute('aria-pressed', String(active));
  }

  function getWrappedIndex(index) {
    const playlist = getPlaylist();
    const total = playlist.length;
    if (!total) return 0;
    return (index + total) % total;
  }

  function loadTrackIntoDeck(deckKey, index) {
    const playlist = getPlaylist();
    const deck = decks[deckKey];
    const track = playlist[index];
    if (!deck || !track) return false;

    const src = typeof buildTrackFetchUrl === 'function' ? buildTrackFetchUrl(track.src) : track.src;
    if (typeof setCrossOrigin === 'function') {
      setCrossOrigin(deck.audio, src);
    }
    deck.audio.src = src;
    deck.trackIndex = index;
    deck.audio.load();
    updateDeckMetadata(deckKey, track);
    return true;
  }

  function updateDeckMetadata(deckKey, track) {
    const target = decks[deckKey]?.meta;
    if (!target || !track) return;
    const [titleEl, artistEl] = target.querySelectorAll('span');
    if (titleEl) titleEl.textContent = track.title || 'Untitled';
    if (artistEl) {
      const album = window.albums?.[activeAlbumIndex];
      artistEl.textContent = album?.artist ? album.artist : 'Omoluabi';
    }
  }

  function setDeckSpinning(deckKey, isSpinning) {
    const vinyl = decks[deckKey]?.vinyl;
    if (!vinyl) return;
    vinyl.classList.toggle('spinning', isSpinning);
  }

  function bindActiveTimeUpdate() {
    Object.entries(decks).forEach(([key, { audio }]) => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      if (key === currentDeck) {
        audio.addEventListener('timeupdate', handleTimeUpdate);
      }
    });
  }

  function handleTimeUpdate() {
    if (!autoMixEnabled) return;
    const active = decks[currentDeck].audio;
    if (!active.duration || isCrossfading) return;

    if (typeof updateTrackTime === 'function') {
      updateTrackTime();
    }

    const remaining = active.duration - active.currentTime;
    if (remaining <= crossfadeDuration) {
      const targetDeck = currentDeck === 'A' ? 'B' : 'A';
      startCrossfade(currentDeck, targetDeck);
    }
  }

  function startCrossfade(fromKey, toKey) {
    if (isCrossfading || !autoMixEnabled) return;
    const playlist = getPlaylist();
    const toDeckIndex = decks[toKey].trackIndex;
    if (!playlist[toDeckIndex]) return;

    const fromDeck = decks[fromKey];
    const toDeck = decks[toKey];
    toDeck.audio.currentTime = 0;
    toDeck.audio.volume = 0;
    isCrossfading = true;

    toDeck.audio.play().catch(console.error);
    setDeckSpinning(toKey, true);

    const start = performance.now();
    const step = () => {
      if (!autoMixEnabled) return;
      const elapsed = (performance.now() - start) / 1000;
      const progress = Math.min(elapsed / crossfadeDuration, 1);
      const toVol = progress;
      const fromVol = 1 - progress;
      fromDeck.audio.volume = fromVol;
      toDeck.audio.volume = toVol;
      updateCrossfaderUI(toVol);

      if (progress < 1) {
        crossfadeFrame = requestAnimationFrame(step);
      } else {
        finalizeCrossfade(fromKey, toKey);
      }
    };

    crossfadeFrame = requestAnimationFrame(step);
  }

  function finalizeCrossfade(fromKey, toKey) {
    const fromDeck = decks[fromKey];
    const toDeck = decks[toKey];

    fromDeck.audio.pause();
    fromDeck.audio.currentTime = 0;
    fromDeck.audio.volume = 0;
    setDeckSpinning(fromKey, false);

    currentDeck = toKey;
    currentIndex = toDeck.trackIndex;
    isCrossfading = false;

    if (typeof applyTrackUiState === 'function') {
      applyTrackUiState(activeAlbumIndex, currentIndex);
    }

    queueNextTrackOn(fromKey);
    bindActiveTimeUpdate();
    updateStatus('Auto-mix: Playing');
    updateCrossfaderUI(currentDeck === 'A' ? 0 : 1);
  }

  function queueNextTrackOn(deckKey) {
    const nextIndex = getWrappedIndex(currentIndex + 1);
    loadTrackIntoDeck(deckKey, nextIndex);
  }

  function updateCrossfaderUI(ratio) {
    if (!crossfader) return;
    const value = Math.round(Math.min(Math.max(ratio, 0), 1) * 100);
    crossfader.value = String(value);
  }

  function play() {
    if (!autoMixEnabled) return;
    decks[currentDeck].audio.play().catch(console.error);
    setDeckSpinning(currentDeck, true);
  }

  function pause() {
    if (!autoMixEnabled) return;
    decks[currentDeck].audio.pause();
    setDeckSpinning(currentDeck, false);
  }

  function manualAdvance(direction = 1) {
    if (!autoMixEnabled) return;
    const targetIndex = getWrappedIndex(currentIndex + direction);
    const targetDeck = currentDeck === 'A' ? 'B' : 'A';
    if (!loadTrackIntoDeck(targetDeck, targetIndex)) return;
    startCrossfade(currentDeck, targetDeck);
  }

  function getCurrentTime() {
    return autoMixEnabled ? decks[currentDeck].audio.currentTime : 0;
  }

  function getDuration() {
    return autoMixEnabled ? decks[currentDeck].audio.duration : 0;
  }

  function updateStatus(message) {
    if (autoMixStatus) {
      autoMixStatus.textContent = message;
    }
    if (djMixStatusInfo) {
      djMixStatusInfo.textContent = message;
    }
  }

  function updateMixBadge(state) {
    if (djMixStatusInfo && !state) {
      djMixStatusInfo.textContent = 'DJ Auto-Mix: Off';
    }
  }

  document.addEventListener('DOMContentLoaded', initAutoMixUI);

  window.DJAutoMix = {
    startAutoMix,
    stopAutoMix,
    isEnabled: () => autoMixEnabled,
    play,
    pause,
    manualAdvance,
    getCurrentTime,
    getDuration,
    updateCrossfaderUI,
  };
})();
