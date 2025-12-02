(function () {
  function initAutoMix() {
    const bridge = window.AriyoPlayerBridge;
    if (!bridge) return;

    const autoDjToggle = document.getElementById('autoDjToggle');
    const overlay = document.getElementById('autoDjOverlay');
    const closeButton = document.getElementById('autoDjClose');
    const crossfader = document.getElementById('djCrossfader');
    const statusEl = document.getElementById('autoDjStatus');
    const deckVinyl = {
      A: document.getElementById('deckA_vinyl'),
      B: document.getElementById('deckB_vinyl'),
    };
    const deckMeta = {
      A: document.getElementById('deckA_meta'),
      B: document.getElementById('deckB_meta'),
    };

    if (!autoDjToggle || !overlay) return;

    const AUTO_MIX_CROSSFADE = 8;
    let autoMixEnabled = false;
    let currentDeck = 'A';
    let currentIndex = 0;
    let playlistLength = bridge.getPlaylistLength ? bridge.getPlaylistLength() : 0;
    let lastActiveDeck = currentDeck;

    function setDeckSpinning(deckKey, isSpinning) {
      const vinyl = deckVinyl[deckKey];
      if (!vinyl) return;
      vinyl.classList.toggle('is-spinning', Boolean(isSpinning));
    }

    function updateDeckMetadata(deckKey, track) {
      const metaRoot = deckMeta[deckKey];
      if (!metaRoot || !track) return;
      const titleEl = metaRoot.querySelector('.dj-track-title');
      const artistEl = metaRoot.querySelector('.dj-track-artist');
      if (titleEl) {
        titleEl.textContent = track.title || 'Unknown title';
      }
      if (artistEl) {
        artistEl.textContent = track.artist ? `by ${track.artist}` : 'Unknown artist';
      }
    }

    function updateCrossfaderUI(value) {
      if (!crossfader) return;
      const clamped = Math.min(Math.max(value, 0), 100);
      crossfader.value = clamped;
    }

    function updateStatus(message) {
      if (statusEl) {
        statusEl.textContent = message;
      }
    }

    function showOverlay() {
      overlay.classList.add('is-visible');
      overlay.setAttribute('aria-hidden', 'false');
      autoDjToggle.classList.add('is-active');
    }

    function hideOverlay() {
      overlay.classList.remove('is-visible');
      overlay.setAttribute('aria-hidden', 'true');
      autoDjToggle.classList.remove('is-active');
    }

    function loadTrackIntoDeck(deckKey, orderIndex) {
      const track = bridge.getTrackByOrderIndex ? bridge.getTrackByOrderIndex(orderIndex) : null;
      if (!track) return;
      const deckAudio = bridge.getDeckAudio ? bridge.getDeckAudio(deckKey) : null;
      if (deckAudio && deckAudio.dataset.trackSrc === track.src) {
        updateDeckMetadata(deckKey, track);
        return;
      }
      updateDeckMetadata(deckKey, track);
      if (bridge.cueDeck) {
        bridge.cueDeck(deckKey, orderIndex, { updateUI: deckKey === currentDeck, preloadOnly: deckKey !== currentDeck });
      }
    }

    function queueNextTrackOn(deckKey) {
      if (!playlistLength) return;
      const nextIndex = (currentIndex + 1) % playlistLength;
      loadTrackIntoDeck(deckKey, nextIndex);
    }

    function startAutoMix() {
      playlistLength = bridge.getPlaylistLength ? bridge.getPlaylistLength() : 0;
      if (playlistLength < 2) {
        updateStatus('Auto-mix needs at least two tracks.');
        return;
      }

      autoMixEnabled = true;
      bridge.setAutoMixEnabled && bridge.setAutoMixEnabled(true);
      bridge.setCrossfadeSeconds && bridge.setCrossfadeSeconds(AUTO_MIX_CROSSFADE);

      currentDeck = bridge.getActiveDeckKey ? bridge.getActiveDeckKey() : 'A';
      currentIndex = bridge.getCurrentOrderIndex ? bridge.getCurrentOrderIndex() : 0;

      loadTrackIntoDeck('A', currentIndex);
      queueNextTrackOn('B');

      if (bridge.playFromOrderIndex) {
        bridge.playFromOrderIndex(currentIndex);
      }

      setDeckSpinning('A', currentDeck === 'A');
      setDeckSpinning('B', currentDeck === 'B');
      updateCrossfaderUI(currentDeck === 'A' ? 0 : 100);
      updateStatus('Auto-mix: Deck A live, Deck B queued');
      showOverlay();
    }

    function stopAutoMix() {
      autoMixEnabled = false;
      bridge.setAutoMixEnabled && bridge.setAutoMixEnabled(false);
      bridge.stopAll && bridge.stopAll();
      setDeckSpinning('A', false);
      setDeckSpinning('B', false);
      updateCrossfaderUI(0);
      hideOverlay();
      updateStatus('Auto-mix: Idle');
    }

    function handleCrossfadeProgress(detail) {
      if (!detail) return;
      const { fromDeck, toDeck, progress } = detail;
      const toDeckIsB = toDeck === 'B';
      const value = toDeckIsB ? progress * 100 : 100 - (progress * 100);
      updateCrossfaderUI(value);
      setDeckSpinning(fromDeck, true);
      setDeckSpinning(toDeck, true);
    }

    function attachDeckListeners() {
      ['A', 'B'].forEach(deckKey => {
        const audio = bridge.getDeckAudio ? bridge.getDeckAudio(deckKey) : null;
        if (!audio) return;
        audio.addEventListener('playing', () => setDeckSpinning(deckKey, autoMixEnabled));
        audio.addEventListener('pause', () => setDeckSpinning(deckKey, false));
        audio.addEventListener('ended', () => setDeckSpinning(deckKey, false));
      });
    }

    function attachEvents() {
      autoDjToggle.addEventListener('click', () => {
        if (autoMixEnabled) {
          stopAutoMix();
        } else {
          startAutoMix();
        }
      });

      if (closeButton) {
        closeButton.addEventListener('click', stopAutoMix);
      }

      if (crossfader) {
        crossfader.addEventListener('input', event => {
          event.preventDefault();
        });
      }

      window.addEventListener('automix:deck-metadata', event => {
        const { deck, track, orderIndex, isActive } = event.detail || {};
        updateDeckMetadata(deck, track);
        if (typeof orderIndex === 'number' && isActive) {
          currentIndex = orderIndex;
        }
      });

      window.addEventListener('automix:state', event => {
        const { activeDeck, autoMixEnabled: mixEnabled, isCrossfading, currentOrderIndex } = event.detail || {};
        lastActiveDeck = currentDeck;
        currentDeck = activeDeck || currentDeck;
        if (typeof currentOrderIndex === 'number') {
          currentIndex = currentOrderIndex;
        }
        if (typeof mixEnabled === 'boolean') {
          autoMixEnabled = mixEnabled;
        }
        if (!isCrossfading) {
          updateCrossfaderUI(currentDeck === 'A' ? 0 : 100);
          setDeckSpinning('A', currentDeck === 'A' && autoMixEnabled);
          setDeckSpinning('B', currentDeck === 'B' && autoMixEnabled);
          if (autoMixEnabled && lastActiveDeck !== currentDeck) {
            const standbyDeck = currentDeck === 'A' ? 'B' : 'A';
            queueNextTrackOn(standbyDeck);
          }
        }

        if (!autoMixEnabled) {
          hideOverlay();
          updateStatus('Auto-mix: Idle');
        }
      });

      window.addEventListener('automix:crossfade-progress', event => {
        handleCrossfadeProgress(event.detail);
      });
    }

    function initAutoMixUI() {
      attachDeckListeners();
      attachEvents();
      if (crossfader) {
        crossfader.value = 0;
        crossfader.disabled = true;
      }
    }

    initAutoMixUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoMix);
  } else {
    initAutoMix();
  }
})();
