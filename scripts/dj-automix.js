
(function () {
  function initAutoMixFeature() {
    const adapter = window.djAutoMixAdapter;
    if (!adapter) return;

    const autoDjToggle = document.getElementById('autoDjToggle');
    const overlay = document.getElementById('autoDjOverlay');
    const closeButton = document.getElementById('autoDjClose');
    const statusText = document.getElementById('autoDjStatus');
    const crossfader = document.getElementById('djCrossfader');
    const crossfadeSelect = document.getElementById('crossfadeDuration');
    const deckVinyl = {
      A: document.getElementById('deckA_vinyl'),
      B: document.getElementById('deckB_vinyl'),
    };
    const deckMeta = {
      A: document.getElementById('deckA_meta'),
      B: document.getElementById('deckB_meta'),
    };
    const manualControls = [
      document.getElementById('prevButton'),
      document.getElementById('nextButton'),
      document.getElementById('shuffleButton'),
      document.getElementById('playButton'),
      document.getElementById('pauseButton'),
      document.getElementById('stopButton'),
    ];

    const decks = adapter.getDeckElements();
    const crossfadeDuration = 8;
    let autoMixEnabled = false;
    let currentDeck = 'A';
    let crossfaderFrame = null;

  function getPlaylistLength() {
    const order = adapter.getPlaybackOrder();
    return Array.isArray(order) ? order.length : 0;
  }

  function initAutoMixUI() {
    if (!autoDjToggle || !overlay) return;
    const hasEnoughTracks = getPlaylistLength() > 1;
    autoDjToggle.disabled = !hasEnoughTracks;
    autoDjToggle.title = hasEnoughTracks
      ? 'Toggle DJ Auto-mix'
      : 'Add more tracks to enable Auto-mix';
    if (!hasEnoughTracks && statusText) {
      statusText.textContent = 'Auto-mix: Add at least two tracks to start.';
    }
    if (crossfader) {
      crossfader.value = 0;
      crossfader.setAttribute('aria-label', 'Crossfader (automated)');
      crossfader.disabled = true;
    }
  }

  function setOverlayVisible(isVisible) {
    if (!overlay) return;
    overlay.classList.toggle('is-visible', isVisible);
    overlay.setAttribute('aria-hidden', String(!isVisible));
  }

  function setDeckSpinning(deckKey, isSpinning) {
    const vinyl = deckVinyl[deckKey];
    if (!vinyl) return;
    vinyl.classList.toggle('spinning', Boolean(isSpinning));
  }

  function updateDeckMetadata(deckKey, track) {
    const meta = deckMeta[deckKey];
    if (!meta || !track) return;
    const [titleEl, artistEl] = meta.querySelectorAll('span');
    if (titleEl) titleEl.textContent = track.title || 'Untitled';
    if (artistEl) artistEl.textContent = track.artist ? `by ${track.artist}` : '';
  }

  function loadTrackIntoDeck(deckKey, orderIndex) {
    const track = adapter.getTrackByOrderIndex ? adapter.getTrackByOrderIndex(orderIndex) : null;
    const target = deckKey === 'B' ? decks.deckB : decks.deckA;
    if (!track || !target) return null;
    try {
      target.src = track.src;
      target.dataset.trackSrc = track.src;
      target.load();
    } catch (_) {
      // Allow silent failures when browsers block eager loading.
    }
    updateDeckMetadata(deckKey, track);
    return track;
  }

  function updateCrossfaderUI(ratio) {
    if (!crossfader) return;
    const clamped = Math.min(Math.max(ratio, 0), 1);
    crossfader.value = Math.round(clamped * 100);
  }

  function setStatus(message) {
    if (statusText) {
      statusText.textContent = message;
    }
  }

  function setManualControlsDisabled(disabled) {
    manualControls.forEach(btn => {
      if (btn) {
        btn.disabled = disabled;
      }
    });
  }

  function startVolumeMonitor() {
    if (crossfaderFrame) cancelAnimationFrame(crossfaderFrame);

    const loop = () => {
      if (!autoMixEnabled) return;
      const volumes = adapter.getDeckVolumes ? adapter.getDeckVolumes() : { A: 1, B: 0 };
      const total = (volumes.A || 0) + (volumes.B || 0) || 1;
      const ratio = (volumes.B || 0) / total;
      updateCrossfaderUI(ratio);
      crossfaderFrame = requestAnimationFrame(loop);
    };

    crossfaderFrame = requestAnimationFrame(loop);
  }

  function startAutoMix() {
    if (autoMixEnabled) return;
    if (getPlaylistLength() < 2) {
      setStatus('Auto-mix: need at least two tracks.');
      return;
    }

    autoMixEnabled = true;
    currentDeck = adapter.getActiveDeckKey ? adapter.getActiveDeckKey() : 'A';
    setOverlayVisible(true);
    if (autoDjToggle) autoDjToggle.classList.add('is-active');
    setStatus('Auto-mix: Live');
    if (crossfadeSelect) {
      crossfadeSelect.value = String(crossfadeDuration);
      crossfadeSelect.dispatchEvent(new Event('change'));
    }
    adapter.setDjAutoMixFlag(true);
    setManualControlsDisabled(true);

    const active = currentDeck === 'B' ? decks.deckB : decks.deckA;
    if (active && active.paused) {
      active.play().catch(() => {});
    }

    const activeTrack = adapter.getTrackByOrderIndex
      ? adapter.getTrackByOrderIndex(adapter.getCurrentOrderIndex())
      : null;
    if (activeTrack) {
      updateDeckMetadata(currentDeck, activeTrack);
      const nextIndex = (adapter.getCurrentOrderIndex() + 1) % getPlaylistLength();
      const standbyKey = currentDeck === 'A' ? 'B' : 'A';
      const standbyTrack = loadTrackIntoDeck(standbyKey, nextIndex);
      if (!standbyTrack) {
        updateDeckMetadata(standbyKey, adapter.getTrackByOrderIndex(nextIndex));
      }
    }

    setDeckSpinning(currentDeck, true);
    setDeckSpinning(currentDeck === 'A' ? 'B' : 'A', false);
    startVolumeMonitor();
  }

  function stopAutoMix() {
    autoMixEnabled = false;
    if (autoDjToggle) autoDjToggle.classList.remove('is-active');
    setOverlayVisible(false);
    adapter.setDjAutoMixFlag(false);
    setManualControlsDisabled(false);
    setStatus('Auto-mix: Idle');
    Object.values(decks).forEach(deck => {
      if (deck && typeof deck.pause === 'function') {
        deck.pause();
      }
    });
    setDeckSpinning('A', false);
    setDeckSpinning('B', false);
    if (crossfaderFrame) cancelAnimationFrame(crossfaderFrame);
  }

  function startCrossfade(fromDeck, toDeck) {
    if (!autoMixEnabled) return;
    setDeckSpinning(fromDeck, true);
    setDeckSpinning(toDeck, true);
    setStatus(`Auto-mix: Crossfading over ${crossfadeDuration}s`);
  }

  function queueNextTrackOn(deckKey) {
    const nextIndex = (adapter.getCurrentOrderIndex() + 1) % getPlaylistLength();
    loadTrackIntoDeck(deckKey, nextIndex);
  }

  function handleDeckLoad(event) {
    if (!autoMixEnabled) return;
    const { deckKey, track } = event.detail || {};
    if (!deckKey || !track) return;
    updateDeckMetadata(deckKey, track);
  }

  function handleCrossfadeStart(event) {
    if (!autoMixEnabled) return;
    const { incomingKey, outgoingKey, duration } = event.detail || {};
    if (incomingKey) setDeckSpinning(incomingKey, true);
    if (outgoingKey) setDeckSpinning(outgoingKey, true);
    if (duration) setStatus(`Auto-mix: Crossfading (${Math.round(duration)}s)`);
  }

  function handleCrossfadeComplete(event) {
    if (!autoMixEnabled) return;
    const { activeDeck } = event.detail || {};
    if (activeDeck) {
      currentDeck = activeDeck;
      setDeckSpinning(activeDeck, true);
      setDeckSpinning(activeDeck === 'A' ? 'B' : 'A', false);
      setStatus('Auto-mix: Next deck ready');
    }
  }

  function attachAutoMixEvents() {
    if (autoDjToggle) {
      autoDjToggle.addEventListener('click', () => {
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

    document.addEventListener('dj-deck-load', handleDeckLoad);
    document.addEventListener('dj-crossfade-start', handleCrossfadeStart);
    document.addEventListener('dj-crossfade-complete', handleCrossfadeComplete);
  }

    initAutoMixUI();
    attachAutoMixEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoMixFeature);
  } else {
    initAutoMixFeature();
  }
})();
