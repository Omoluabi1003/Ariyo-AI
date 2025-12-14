const albumDurationsCache = new Map();
const metadataCorsBlocklist = [
  /(?:^|\.)podcastics\.com$/i,
  /(?:^|\.)anchor\.fm$/i,
  /d3ctxlq1ktw2nl\.cloudfront\.net$/i
];

function shouldUseAnonymousCors(url) {
  try {
    const target = new URL(url, window.location.origin);
    return !metadataCorsBlocklist.some(pattern => pattern.test(target.hostname));
  } catch (error) {
    console.warn('Unable to determine CORS safety for metadata probe:', error);
    return false;
  }
}

function calculateAlbumDuration(album) {
  if (albumDurationsCache.has(album.name)) {
    return Promise.resolve(albumDurationsCache.get(album.name));
  }

  const promises = album.tracks.map(track => {
    if (track.duration) return Promise.resolve(track.duration);
    return new Promise(resolve => {
      const tempAudio = new Audio();
      tempAudio.preload = 'metadata';
      if (shouldUseAnonymousCors(track.src)) {
        tempAudio.crossOrigin = 'anonymous';
      }
      tempAudio.src = track.src;
      tempAudio.addEventListener('loadedmetadata', () => {
        track.duration = tempAudio.duration;
        resolve(track.duration);
      });
      tempAudio.addEventListener('error', () => {
        resolve(track.duration || 0);
      });
    });
  });

  return Promise.all(promises).then(durations => {
    const total = durations.reduce((a, b) => a + b, 0);
    albumDurationsCache.set(album.name, total);
    return total;
  });
}

function populateAlbumList() {
  const albumList = document.querySelector('.album-list');
  if (!albumList) return;
  albumList.innerHTML = '';
  albums.forEach((album, index) => {
    const link = document.createElement('a');
    link.href = '#';
    link.onclick = () => { selectAlbum(index); closeAlbumList(); };

    const img = document.createElement('img');
    img.src = album.cover;
    img.alt = `${album.name} Album Cover`;

    const name = document.createElement('p');
    name.textContent = `Album ${index + 1}: ${album.name}`;
    if (typeof latestTracks !== 'undefined' && latestTracks.some(track => track.albumName === album.name)) {
      const badge = document.createElement('span');
      badge.className = 'album-new-badge';
      badge.textContent = 'NEW';
      badge.title = 'Contains freshly added tracks';
      name.appendChild(badge);
    }

    const durationEl = document.createElement('p');
    durationEl.className = 'album-duration';
    durationEl.textContent = 'Duration: …';

    const info = document.createElement('div');
    info.className = 'album-info';
    info.appendChild(name);
    info.appendChild(durationEl);

    link.appendChild(img);
    link.appendChild(info);
    albumList.appendChild(link);

    calculateAlbumDuration(album)
      .then(total => {
        durationEl.textContent = `Duration: ${formatTime(total)}`;
      })
      .catch(() => {
        durationEl.textContent = 'Duration: N/A';
      });
  });
}

function prepareDeferredIframes() {
  const iframes = document.querySelectorAll('.chatbot-container iframe, #aboutModalContainer iframe');
  if (!iframes.length) {
    return;
  }

  iframes.forEach((iframe) => {
    const currentSrc = iframe.getAttribute('src');
    const defaultSrc = iframe.getAttribute('data-default-src');

    if (!defaultSrc && currentSrc && currentSrc !== 'about:blank') {
      iframe.setAttribute('data-default-src', currentSrc);
    }

    iframe.setAttribute('loading', 'lazy');

    if (iframe.getAttribute('data-default-src')) {
      iframe.setAttribute('data-loaded-src', '');
      if (currentSrc && currentSrc !== 'about:blank') {
        iframe.setAttribute('src', 'about:blank');
      } else if (!currentSrc) {
        iframe.setAttribute('src', 'about:blank');
      }
    }
  });
}

function openAlbumList() {
      document.getElementById('main-content').classList.remove('about-us-active');
      const modal = document.getElementById('albumModal');
      const modalContent = modal.querySelector('.modal-content');

      populateAlbumList();

      modal.style.display = 'flex';

      gsap.fromTo(modalContent,
        { scale: 0.8, opacity: 0, y: 50 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out"
        }
      );
      console.log('Album list opened, animating...');
    }

    function closeAlbumList() {
      const modal = document.getElementById('albumModal');
      gsap.to(modal.querySelector('.modal-content'),
        { scale: 0.8, opacity: 0, y: 50, duration: 0.3, ease: "power2.in",
          onComplete: () => { modal.style.display = 'none'; }
        }
      );
      console.log('Album list closed');
    }

    function openTrackList() {
      updateTrackListModal();
      const modal = document.getElementById('trackModal');
      modal.style.display = 'flex';
      gsap.fromTo(modal.querySelector('.modal-content'),
        { scale: 0.8, opacity: 0, y: 50 },
        { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
      console.log('Track list opened');
    }

    function closeTrackList() {
      const modal = document.getElementById('trackModal');
      gsap.to(modal.querySelector('.modal-content'),
        { scale: 0.8, opacity: 0, y: 50, duration: 0.3, ease: "power2.in",
          onComplete: () => { modal.style.display = 'none'; }
        }
      );
      pendingAlbumIndex = null;
      console.log('Track list closed');
    }

    function openPlaylist() {
      pendingAlbumIndex = playlistAlbumIndex;
      openTrackList();
    }

    function openRadioList() {
      document.getElementById('main-content').classList.remove('about-us-active');
      updateRadioListModal();
      const modal = document.getElementById('radioModal');
      const modalContent = modal.querySelector('.modal-content');

      modal.style.display = 'flex';

      gsap.fromTo(modalContent,
        { scale: 0.8, opacity: 0, y: 50 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out"
        }
      );
      console.log('Radio list opened, animating...');
    }

    function closeRadioList() {
      const modal = document.getElementById('radioModal');
      modal.style.display = 'none';
      console.log('Radio list closed');
    }

function toggleShuffle() {
  const shuffleBtn = document.querySelector(".music-controls.icons-only button[aria-label='Toggle shuffle']");
  const shuffleStatusInfo = document.getElementById('shuffleStatusInfo');

  // If we are in radio mode, shuffle only has on/off states
  if (currentRadioIndex !== -1) {
    shuffleMode = !shuffleMode;
    shuffleQueue = [];
    updateNextTrackInfo();
    if (shuffleMode) {
      shuffleBtn.innerHTML = '🔀 <span class="shuffle-indicator">R</span>';
      shuffleStatusInfo.textContent = 'Shuffle: On (Radio)';
      console.log('Shuffle mode: Radio');
    } else {
      shuffleBtn.innerHTML = '🔀';
      shuffleStatusInfo.textContent = 'Shuffle: Off';
      console.log('Shuffle mode: Off');
    }
  }
  // If we are in album/track mode, cycle through off, repeat one, album, all
  else {
    if (shuffleScope === 'off') {
      shuffleScope = 'repeat';
      shuffleMode = false;
      shuffleBtn.innerHTML = '🔂 <span class="shuffle-indicator">1</span>';
      shuffleStatusInfo.textContent = 'Repeat: On (Single Track)';
      console.log('Repeat mode: Single Track');
      shuffleQueue = [];
      updateNextTrackInfo();
    } else if (shuffleScope === 'repeat') {
      shuffleScope = 'album';
      shuffleMode = true;
      shuffleBtn.innerHTML = '🔀 <span class="shuffle-indicator">2</span>';
      shuffleStatusInfo.textContent = 'Shuffle: On (Album)';
      console.log('Shuffle mode: Album');
      buildShuffleQueue();
    } else if (shuffleScope === 'album') {
      shuffleScope = 'all';
      shuffleMode = true;
      shuffleBtn.innerHTML = '🔀 <span class="shuffle-indicator">3</span>';
      shuffleStatusInfo.textContent = 'Shuffle: On (All Tracks)';
      console.log('Shuffle mode: All');
      buildShuffleQueue();
    } else { // shuffleScope === 'all'
      shuffleScope = 'off';
      shuffleMode = false;
      shuffleBtn.innerHTML = '🔀';
      shuffleStatusInfo.textContent = 'Shuffle: Off';
      console.log('Shuffle mode: Off');
      shuffleQueue = [];
      updateNextTrackInfo();
    }
  }
  savePlayerState();
}

/* CHATBOT TOGGLE WITH US SPOOFING */
const PANEL_IDS = [
    'ariyoChatbotContainer',
    'sabiBibleContainer',
    'pictureGameContainer',
    'musicPlayerContainer',
    'tetrisGameContainer',
    'wordSearchContainer',
    'connectFourContainer',
    'cyclePrecisionContainer',
    'youtubeModalContainer',
    'aboutModalContainer'
];

const panelRegistry = {};

const PANEL_LOAD_CONFIG = {
    ariyoChatbotContainer: {
        loadingMessage: 'Connecting to Àríyò AI…',
        errorMessage: 'Àríyò AI couldn’t start. Please check your internet connection and try again.',
        errorMessages: {
            'component-unavailable': 'Àríyò AI is taking too long to respond. Please retry in a few moments.',
            'missing-embed': 'We couldn’t initialise the Àríyò AI chat window. Try again.',
            'unsupported-browser': 'This browser version doesn’t support the chatbot embed. Please upgrade or switch browsers.'
        },
        handshake: true
    },
    sabiBibleContainer: {
        loadingMessage: 'Opening Sabi Bible…',
        errorMessage: 'Sabi Bible couldn’t load. Check your internet connection and try again.',
        errorMessages: {
            'component-unavailable': 'Sabi Bible is still waking up. Tap retry in a few seconds.',
            'missing-embed': 'We couldn’t initialise Sabi Bible. Please retry.',
            'unsupported-browser': 'Your browser version can’t render Sabi Bible. Please update it or try a different one.'
        },
        handshake: true
    },
    youtubeModalContainer: {
        loadingMessage: 'Loading Omoluabi Paul on YouTube…',
        errorMessage: 'YouTube refused to play inside Àríyò AI. Please retry or open the full channel.',
        supportLink: 'https://youtube.com/@omoluabipaul?si=9zduvJQvN8_ZXMuV',
        supportLinkLabel: 'Open channel on YouTube'
    },
    musicPlayerContainer: {
        loadingMessage: 'Loading Omoluabi Player…',
        errorMessage: 'The music player is unavailable right now. Please retry in a moment.'
    }
};

const panelStates = {};
const panelLoadTimers = {};
const panelOverlays = {};
const panelLastTrigger = new Map();
const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function preparePanelForAccessibility(panel) {
    if (!panel) return;
    if (!panel.hasAttribute('tabindex')) {
        panel.setAttribute('tabindex', '-1');
    }
    const displayState = window.getComputedStyle(panel).display;
    panel.setAttribute('aria-hidden', displayState === 'none' ? 'true' : 'false');
}

function focusFirstElement(panel) {
    if (!panel) return;
    const closeButton = panel.querySelector('.popup-close');
    if (closeButton) {
        closeButton.focus();
        return;
    }
    const focusable = panel.querySelector(focusableSelector);
    if (focusable) {
        focusable.focus();
        return;
    }
    panel.focus();
}

function getPanelElement(id) {
    if (!panelRegistry[id]) {
        panelRegistry[id] = document.getElementById(id) || null;
    }
    return panelRegistry[id];
}

function initializePanelLoadTracking(panelId) {
    const panel = getPanelElement(panelId);
    if (!panel) return;

    preparePanelForAccessibility(panel);

    const config = PANEL_LOAD_CONFIG[panelId];
    if (!config) return;

    const iframe = panel.querySelector('iframe');
    if (!iframe) return;

    ensurePanelOverlay(panelId);

    if (config.handshake) {
        return;
    }

    if (!iframe.dataset.panelLoadTracked) {
        iframe.addEventListener('load', () => {
            handlePanelReady(panelId);
        });
        iframe.addEventListener('error', () => {
            handlePanelError(panelId);
        });
        iframe.dataset.panelLoadTracked = 'true';
    }
}

function ensurePanelOverlay(panelId) {
    const config = PANEL_LOAD_CONFIG[panelId];
    if (!config) return null;

    if (panelOverlays[panelId]) {
        return panelOverlays[panelId];
    }

    const panel = getPanelElement(panelId);
    if (!panel) return null;

    const overlay = document.createElement('div');
    overlay.className = 'panel-status-overlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');

    const spinner = document.createElement('div');
    spinner.className = 'panel-status-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    overlay.appendChild(spinner);

    const message = document.createElement('p');
    message.className = 'panel-status-message';
    overlay.appendChild(message);

    const actions = document.createElement('div');
    actions.className = 'panel-status-actions';

    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.className = 'retry-button panel-status-retry';
    retryButton.textContent = 'Retry';
    retryButton.addEventListener('click', () => {
        reloadPanel(panelId);
    });
    actions.appendChild(retryButton);

    if (config.supportLink) {
        const supportLink = document.createElement('a');
        supportLink.href = config.supportLink;
        supportLink.target = '_blank';
        supportLink.rel = 'noopener noreferrer';
        supportLink.className = 'panel-status-link';
        supportLink.textContent = config.supportLinkLabel || 'Open in new tab';
        actions.appendChild(supportLink);
    }

    overlay.appendChild(actions);
    panel.appendChild(overlay);
    panelOverlays[panelId] = overlay;

    return overlay;
}

function setPanelState(panelId, state, reason = null) {
    const config = PANEL_LOAD_CONFIG[panelId];
    if (!config) return;

    const overlay = ensurePanelOverlay(panelId);
    if (!overlay) return;

    panelStates[panelId] = state;

    const message = overlay.querySelector('.panel-status-message');
    const spinner = overlay.querySelector('.panel-status-spinner');
    const actions = overlay.querySelector('.panel-status-actions');

    overlay.classList.remove('loading', 'error', 'visible');

    if (state === 'loading') {
        spinner.style.display = '';
        actions.style.display = 'none';
        message.textContent = config.loadingMessage || 'Loading…';
        overlay.classList.add('visible', 'loading');
    } else if (state === 'error') {
        const errorMessage = (reason && config.errorMessages && config.errorMessages[reason]) || config.errorMessage || 'Something went wrong. Please try again.';
        message.textContent = errorMessage;
        spinner.style.display = 'none';
        actions.style.display = 'flex';
        overlay.classList.add('visible', 'error');
    } else {
        spinner.style.display = 'none';
        actions.style.display = 'none';
    }

    if (state !== 'ready') {
        overlay.classList.add('visible');
    }

    if (state === 'ready') {
        overlay.classList.remove('visible');
    }
}

function startPanelTimeout(panelId) {
    const config = PANEL_LOAD_CONFIG[panelId];
    if (!config) return;

    clearTimeout(panelLoadTimers[panelId]);
    panelLoadTimers[panelId] = setTimeout(() => {
        if (panelStates[panelId] !== 'ready') {
            setPanelState(panelId, 'error', 'component-unavailable');
        }
    }, config.timeout || 10000);
}

function clearPanelTimeout(panelId) {
    if (panelLoadTimers[panelId]) {
        clearTimeout(panelLoadTimers[panelId]);
        delete panelLoadTimers[panelId];
    }
}

function reloadPanel(panelId) {
    const panel = getPanelElement(panelId);
    if (!panel) return;

    const iframe = panel.querySelector('iframe');
    if (!iframe) return;

    try {
        if (iframe.contentWindow && typeof iframe.contentWindow.location.reload === 'function') {
            iframe.contentWindow.location.reload();
        } else {
            const src = iframe.getAttribute('data-default-src') || iframe.getAttribute('src');
            if (src) {
                iframe.setAttribute('src', src);
            }
        }
    } catch (error) {
        const src = iframe.getAttribute('data-default-src') || iframe.getAttribute('src');
        if (src) {
            iframe.setAttribute('src', src);
        }
    }

    setPanelState(panelId, 'loading');
    startPanelTimeout(panelId);
}

function beginPanelLoad(panelId) {
    const config = PANEL_LOAD_CONFIG[panelId];
    if (!config) return;

    if (panelStates[panelId] === 'ready') {
        setPanelState(panelId, 'ready');
        return;
    }

    setPanelState(panelId, 'loading');
    startPanelTimeout(panelId);
}

function handlePanelReady(panelId) {
    if (!PANEL_LOAD_CONFIG[panelId]) return;
    clearPanelTimeout(panelId);
    setPanelState(panelId, 'ready');
}

function handlePanelError(panelId, reason) {
    if (!PANEL_LOAD_CONFIG[panelId]) return;
    clearPanelTimeout(panelId);
    setPanelState(panelId, 'error', reason);
}

document.addEventListener('DOMContentLoaded', () => {
    prepareDeferredIframes();
    PANEL_IDS.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            panelRegistry[id] = element;
            initializePanelLoadTracking(id);
        }
    });

    document.querySelectorAll('[data-open-target]').forEach(trigger => {
        const targetId = trigger.getAttribute('data-open-target');
        if (!targetId) return;

        trigger.addEventListener('click', () => openPanel(targetId, trigger));
        trigger.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openPanel(targetId, trigger);
            }
        });
    });

    document.querySelectorAll('[data-close-target]').forEach(trigger => {
        const targetId = trigger.getAttribute('data-close-target');
        if (!targetId) return;

        trigger.addEventListener('click', () => closePanel(targetId));
    });

    // Allow users to dismiss any open panel by clicking its backdrop or pressing Escape
    PANEL_IDS.forEach(id => {
        const panel = getPanelElement(id);
        if (!panel) return;

        panel.addEventListener('click', (event) => {
            if (event.target === panel && panel.style.display === 'block') {
                closePanel(id);
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;

        PANEL_IDS.forEach(id => {
            const panel = getPanelElement(id);
            if (panel && panel.style.display === 'block') {
                closePanel(id);
            }
        });
    });
});

window.addEventListener('message', (event) => {
    const sameOrigin = !event.origin || event.origin === 'null' || event.origin === window.location.origin;
    if (!sameOrigin) return;

    const data = event.data;
    if (!data || data.source !== 'edge-panel-app' || !data.panelId) return;

    if (data.status === 'ready') {
        handlePanelReady(data.panelId);
    } else if (data.status === 'error') {
        handlePanelError(data.panelId, data.reason || data.detail || null);
    }
});

function isAnyPanelOpen() {
    return PANEL_IDS.some(id => {
        const panel = getPanelElement(id);
        return panel && panel.style.display === 'block';
    });
}

function resetCloseButtonsPosition() {
    document.querySelectorAll('.popup-close').forEach(btn => {
        btn.style.top = 'calc(10px + env(safe-area-inset-top))';
        btn.style.right = '10px';
        btn.style.left = 'auto';
    });
}

// Spoof user as if dem dey America
window.spoofedLocation = {country:"US",timezone:"America/New_York",language:"en-US"};
console.log("US Spoof Active:", window.spoofedLocation);

function updateEdgePanelBehavior() {
    resetCloseButtonsPosition();
    chatbotWindowOpen = isAnyPanelOpen();
    if (chatbotWindowOpen) {
        closeEdgePanel();
    } else {
        showEdgePanelPeek();
    }
}

function syncPanelSource(panel, trigger) {
    if (!panel) return;

    const iframe = panel.querySelector('iframe');
    if (!iframe) return;

    let desiredSrc = null;

    if (trigger) {
        desiredSrc = trigger.getAttribute('data-open-src');
    }

    if (!desiredSrc) {
        desiredSrc = iframe.getAttribute('data-default-src');
    }

    if (!desiredSrc) return;

    if (panel.id === 'youtubeModalContainer') {
        try {
            const preparedUrl = new URL(desiredSrc, window.location.origin);
            if (!preparedUrl.searchParams.has('enablejsapi')) {
                preparedUrl.searchParams.set('enablejsapi', '1');
            }
            if (!preparedUrl.searchParams.has('origin')) {
                preparedUrl.searchParams.set('origin', window.location.origin);
            }
            desiredSrc = preparedUrl.toString();
        } catch (error) {
            console.warn('Unable to prepare YouTube embed URL:', error);
        }
    }

    const loadedSrc = iframe.getAttribute('data-loaded-src') || iframe.getAttribute('src') || '';
    let shouldReload = false;

    if (loadedSrc === desiredSrc) {
        try {
            const doc = iframe.contentDocument;
            if (doc && doc.readyState && (doc.readyState === 'complete' || doc.readyState === 'interactive')) {
                const body = doc.body;
                if (!body) {
                    shouldReload = true;
                } else {
                    const hasChildren = body.childElementCount > 0;
                    const textContent = body.textContent ? body.textContent.trim() : '';
                    if (!hasChildren && textContent.length === 0) {
                        shouldReload = true;
                    }
                }
            }
        } catch (error) {
            shouldReload = false;
        }
    }

    if (loadedSrc !== desiredSrc || shouldReload) {
        const applySrc = () => {
            iframe.setAttribute('src', desiredSrc);
            iframe.setAttribute('data-loaded-src', desiredSrc);
        };

        if (shouldReload) {
            iframe.setAttribute('data-loaded-src', '');
            iframe.setAttribute('src', 'about:blank');
            window.setTimeout(applySrc, 50);
        } else {
            applySrc();
        }
    } else if (!iframe.hasAttribute('data-loaded-src') && loadedSrc) {
        iframe.setAttribute('data-loaded-src', loadedSrc);
    }
}

function stopYouTubePlayback() {
    const panel = getPanelElement('youtubeModalContainer');
    if (!panel) return false;

    const iframe = panel.querySelector('iframe');
    if (!iframe) return false;

    let commandSent = false;
    try {
        if (iframe.contentWindow) {
            const message = JSON.stringify({ event: 'command', func: 'stopVideo', args: [] });
            iframe.contentWindow.postMessage(message, '*');
            commandSent = true;
        }
    } catch (error) {
        console.warn('Failed to send YouTube stop command:', error);
    }

    if (!commandSent) {
        const defaultSrc = iframe.getAttribute('data-default-src');
        if (defaultSrc) {
            iframe.setAttribute('src', 'about:blank');
            iframe.removeAttribute('data-loaded-src');
            setTimeout(() => {
                iframe.setAttribute('src', defaultSrc);
                iframe.setAttribute('data-loaded-src', defaultSrc);
            }, 100);
        }
    }

    return commandSent;
}

window.stopYouTubePlayback = stopYouTubePlayback;

function openPanel(targetId, trigger = null) {
    const panel = getPanelElement(targetId);
    if (!panel) return;

    if (targetId === 'musicPlayerContainer') {
        const mainAudio = document.getElementById('audioPlayer');
        if (mainAudio && !mainAudio.paused) {
            try {
                mainAudio.pause();
                mainAudio.currentTime = 0;
            } catch (error) {
                console.warn('Unable to stop main player when launching Omoluabi Player:', error);
            }
        }
    }

    if (targetId === 'aboutModalContainer') {
        const iframe = panel.querySelector('iframe');
        if (iframe) {
            iframe.src = 'about.html';
        }
    }

    syncPanelSource(panel, trigger);
    beginPanelLoad(targetId);

    panel.style.display = 'block';
    panel.setAttribute('aria-hidden', 'false');
    const opener = trigger || document.activeElement;
    if (opener) {
        panelLastTrigger.set(targetId, opener);
    }
    requestAnimationFrame(() => focusFirstElement(panel));
    updateEdgePanelBehavior();
}

function closePanel(targetId) {
    const panel = getPanelElement(targetId);
    if (!panel) return;

    if (targetId === 'youtubeModalContainer') {
        stopYouTubePlayback();
    }

    panel.style.display = 'none';
    panel.setAttribute('aria-hidden', 'true');
    const iframe = panel.querySelector('iframe');
    if (targetId !== 'youtubeModalContainer' && iframe && iframe.getAttribute('data-default-src')) {
        iframe.setAttribute('src', 'about:blank');
        iframe.setAttribute('data-loaded-src', '');
    }
    clearPanelTimeout(targetId);
    updateEdgePanelBehavior();

    const lastTrigger = panelLastTrigger.get(targetId);
    if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus();
    }
    panelLastTrigger.delete(targetId);
}

function openAboutModal() {
    openPanel('aboutModalContainer');
}

function closeAboutModal() {
    closePanel('aboutModalContainer');
}

function openAriyoChatbot() {
    openPanel('ariyoChatbotContainer');
}

function closeAriyoChatbot() {
    closePanel('ariyoChatbotContainer');
}

function openSabiBible() {
    openPanel('sabiBibleContainer');
}

function closeSabiBible() {
    closePanel('sabiBibleContainer');
}

function openPictureGame() {
    openPanel('pictureGameContainer');
}

function closePictureGame() {
    closePanel('pictureGameContainer');
}

function openTetrisGame() {
    openPanel('tetrisGameContainer');
}

function closeTetrisGame() {
    closePanel('tetrisGameContainer');
}

function openWordSearchGame() {
    openPanel('wordSearchContainer');
}

function closeWordSearchGame() {
    closePanel('wordSearchContainer');
}

function openConnectFourGame() {
    openPanel('connectFourContainer');
}

function closeConnectFourGame() {
    closePanel('connectFourContainer');
}

function openCyclePrecision() {
    openPanel('cyclePrecisionContainer');
}

function closeCyclePrecision() {
    closePanel('cyclePrecisionContainer');
}




    const collapsibleContainerLeft = document.getElementById('collapsibleContainerLeft');
    const collapsibleContainerRight = document.getElementById('collapsibleContainerRight');

    function toggleCollapsibleContainer(container) {
        container.classList.toggle('visible');
    }

    let inactivityTimer;

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            collapsibleContainerLeft.classList.remove('visible');
            collapsibleContainerRight.classList.remove('visible');
        }, 45000);
    }

    const edgePanel = document.getElementById('edgePanel');
    const edgePanelHandle = edgePanel ? edgePanel.querySelector('.edge-panel-handle') : null;
    const focusFirstEdgePanelItem = () => {
        const firstItem = edgePanel?.querySelector('.edge-panel-item');
        if (firstItem) {
            firstItem.focus();
        }
    };
    const setupEdgePanelListNavigation = () => {
        const list = document.querySelector('.edge-panel-list');
        if (!list) return;

        list.addEventListener('keydown', (event) => {
            const activeElement = document.activeElement;
            if (!list.contains(activeElement)) return;

            const items = Array.from(list.querySelectorAll('.edge-panel-item'));
            const currentIndex = items.indexOf(activeElement);
            if (currentIndex === -1) return;

            let nextIndex = null;
            if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                nextIndex = Math.min(currentIndex + 1, items.length - 1);
            } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                nextIndex = Math.max(currentIndex - 1, 0);
            } else if (event.key === 'Home') {
                nextIndex = 0;
            } else if (event.key === 'End') {
                nextIndex = items.length - 1;
            }

            if (nextIndex !== null && nextIndex !== currentIndex) {
                event.preventDefault();
                items[nextIndex].focus();
            }
        });
    };
    let isDragging = false;
    let initialX;
    let initialRight;
    let EDGE_PANEL_VISIBLE_X = 16;
    let EDGE_PANEL_COLLAPSED_X = -160;
    let EDGE_PANEL_PEEK_X = -32;
    let edgePanelState = 'collapsed';
    let edgePanelUserCollapsed = false;
    let edgePanelPeekTimeoutId = null;
    const EDGE_PANEL_PEEK_DURATION = 3200;

    const computeEdgePanelOffsets = () => {
        if (!edgePanel || !edgePanelHandle) return;
        const panelWidth = edgePanel.offsetWidth;
        const handleWidth = edgePanelHandle.offsetWidth || Math.max(Math.round(panelWidth * 0.08), 16);

        const rootStyles = window.getComputedStyle(document.documentElement);
        const configuredGap = parseFloat(rootStyles.getPropertyValue('--edge-panel-visible-gap'));
        const responsiveGap = window.innerWidth <= 900
            ? Math.max(Math.round(window.innerWidth * 0.028), 10)
            : Math.max(Math.round(window.innerWidth * 0.018), 12);
        EDGE_PANEL_VISIBLE_X = Number.isNaN(configuredGap) ? responsiveGap : Math.max(configuredGap, responsiveGap);

        // Inspired by the Samsung One UI edge panel behaviour — keep only the handle and a slim glow visible.
        const handleReveal = Math.max(Math.round(handleWidth * 0.55), 14);
        const tuckedWidth = panelWidth - handleReveal;
        EDGE_PANEL_COLLAPSED_X = EDGE_PANEL_VISIBLE_X - tuckedWidth;

        const peekAccentReveal = Math.min(Math.round(handleWidth * 0.35), 18);
        const peekExposure = handleReveal + peekAccentReveal;
        const minimumPeek = EDGE_PANEL_COLLAPSED_X + Math.round(handleWidth * 0.25);
        const maximumPeek = EDGE_PANEL_VISIBLE_X - Math.round(handleWidth * 0.35);
        EDGE_PANEL_PEEK_X = Math.min(Math.max(EDGE_PANEL_VISIBLE_X - peekExposure, minimumPeek), maximumPeek);
    };

    const applyEdgePanelPosition = (state, { userInitiated = false } = {}) => {
        if (!edgePanel) return;

        edgePanelState = state;

        const isVisible = state === 'visible';
        const isPeek = state === 'peek';
        const ariaExpanded = isVisible ? 'true' : 'false';

        edgePanel.setAttribute('aria-expanded', ariaExpanded);
        if (edgePanelHandle) {
            edgePanelHandle.setAttribute('aria-expanded', ariaExpanded);
        }

        if (edgePanelPeekTimeoutId) {
            clearTimeout(edgePanelPeekTimeoutId);
            edgePanelPeekTimeoutId = null;
        }

        if (isVisible || isPeek) {
            edgePanel.classList.add('visible');
        } else {
            edgePanel.classList.remove('visible');
        }

        if (isPeek) {
            edgePanel.dataset.position = 'peek';
            edgePanel.style.right = `${EDGE_PANEL_PEEK_X}px`;
        } else if (isVisible) {
            delete edgePanel.dataset.position;
            edgePanel.style.right = `${EDGE_PANEL_VISIBLE_X}px`;
        } else {
            edgePanel.dataset.position = 'collapsed';
            edgePanel.style.right = `${EDGE_PANEL_COLLAPSED_X}px`;
        }

        if (state === 'peek') {
            edgePanelPeekTimeoutId = window.setTimeout(() => {
                if (edgePanelState === 'peek') {
                    applyEdgePanelPosition('collapsed');
                }
            }, EDGE_PANEL_PEEK_DURATION);
        }

        if (userInitiated) {
            if (state === 'collapsed') {
                edgePanelUserCollapsed = true;
            } else if (state === 'visible') {
                edgePanelUserCollapsed = false;
            }
        } else if (state === 'visible') {
            edgePanelUserCollapsed = false;
        }
    };

    if (edgePanel && edgePanelHandle) {
        computeEdgePanelOffsets();
        applyEdgePanelPosition('collapsed');
        if (!edgePanelHandle.getAttribute('role')) {
            edgePanelHandle.setAttribute('role', 'button');
        }
        if (!edgePanelHandle.hasAttribute('tabindex')) {
            edgePanelHandle.setAttribute('tabindex', '0');
        }
        if (!edgePanelHandle.getAttribute('aria-label')) {
            edgePanelHandle.setAttribute('aria-label', 'Toggle Quick Launch hub');
        }
        if (!edgePanelHandle.getAttribute('aria-controls')) {
            edgePanelHandle.setAttribute('aria-controls', 'edgePanel');
        }
        if (!edgePanelHandle.hasAttribute('aria-expanded')) {
            edgePanelHandle.setAttribute('aria-expanded', 'false');
        }
        if (!edgePanel.hasAttribute('aria-expanded')) {
            edgePanel.setAttribute('aria-expanded', 'false');
        }
        window.setTimeout(() => {
            if (!edgePanelUserCollapsed) {
                showEdgePanelPeek();
            }
        }, 600);
        const toggleEdgePanelVisibility = ({ userInitiated = false, focusLaunchers = false } = {}) => {
            if (edgePanelState === 'visible') {
                applyEdgePanelPosition('collapsed', { userInitiated });
            } else {
                applyEdgePanelPosition('visible', { userInitiated });
                if (focusLaunchers) {
                    focusFirstEdgePanelItem();
                }
            }
        };

        const beginDrag = (clientX) => {
            isDragging = true;
            initialX = clientX;
            initialRight = parseInt(window.getComputedStyle(edgePanel).right, 10);
            edgePanel.style.transition = 'none';
        };

        edgePanelHandle.addEventListener('mousedown', (e) => {
            beginDrag(e.clientX);
        });

        edgePanelHandle.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            if (!touch) return;
            beginDrag(touch.clientX);
        }, { passive: true });

        const clampPanelRight = (value) => {
            return Math.min(Math.max(value, EDGE_PANEL_COLLAPSED_X), EDGE_PANEL_VISIBLE_X);
        };

        const endDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            edgePanel.style.transition = 'right 0.3s ease-in-out, box-shadow 0.3s ease-in-out';
            const finalRight = parseInt(window.getComputedStyle(edgePanel).right, 10);
            const collapseThreshold = (EDGE_PANEL_COLLAPSED_X + EDGE_PANEL_PEEK_X) / 2;
            const peekThreshold = (EDGE_PANEL_PEEK_X + EDGE_PANEL_VISIBLE_X) / 2;

            if (finalRight <= collapseThreshold) {
                applyEdgePanelPosition('collapsed', { userInitiated: true });
            } else if (finalRight <= peekThreshold) {
                applyEdgePanelPosition('peek', { userInitiated: true });
            } else {
                applyEdgePanelPosition('visible', { userInitiated: true });
            }
        };

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const currentX = e.clientX;
                const dx = currentX - initialX;
                const nextRight = clampPanelRight(initialRight - dx);
                edgePanel.style.right = `${nextRight}px`;
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            if (!touch) return;
            const dx = touch.clientX - initialX;
            const nextRight = clampPanelRight(initialRight - dx);
            edgePanel.style.right = `${nextRight}px`;
        }, { passive: true });

        document.addEventListener('mouseup', endDrag);

        document.addEventListener('touchend', endDrag, { passive: true });
        document.addEventListener('touchcancel', endDrag, { passive: true });

        edgePanelHandle.addEventListener('click', () => {
            if (isDragging) return;
            toggleEdgePanelVisibility({ userInitiated: true });
        });
        edgePanelHandle.addEventListener('keydown', (event) => {
            if (isDragging) return;
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleEdgePanelVisibility({ userInitiated: true, focusLaunchers: true });
            }
        });

        window.addEventListener('resize', () => {
            computeEdgePanelOffsets();
            if (edgePanelState === 'peek') {
                applyEdgePanelPosition('peek');
            } else if (edgePanelState === 'visible') {
                applyEdgePanelPosition('visible');
            } else {
                applyEdgePanelPosition('collapsed');
            }
        });

        window.addEventListener('orientationchange', () => {
            computeEdgePanelOffsets();
            if (edgePanelState === 'peek') {
                applyEdgePanelPosition('peek');
            } else if (edgePanelState === 'visible') {
                applyEdgePanelPosition('visible');
            } else {
                applyEdgePanelPosition('collapsed');
            }
        });
    }

    setupEdgePanelListNavigation();

    function closeEdgePanel() {
        applyEdgePanelPosition('collapsed');
    }

    function showEdgePanelPeek() {
        if (!edgePanel) return;
        if (edgePanelUserCollapsed) return;
        applyEdgePanelPosition('peek');
    }



    /* EDGE PANEL STATE HELPERS */
    let chatbotWindowOpen = false;

function showNowPlayingToast(trackTitle) {
  const toast = document.getElementById('nowPlayingToast');
  if (!toast) return;
  toast.textContent = `Now playing: ${trackTitle}`;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
