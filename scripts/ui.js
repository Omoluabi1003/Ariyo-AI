function calculateAlbumDuration(album) {
  const promises = album.tracks.map(track => {
    if (track.duration) return Promise.resolve(track.duration);
    return new Promise(resolve => {
      const tempAudio = new Audio();
      tempAudio.preload = 'metadata';
      tempAudio.crossOrigin = 'anonymous';
      tempAudio.src = track.src;
      tempAudio.addEventListener('loadedmetadata', () => {
        track.duration = tempAudio.duration;
        resolve(track.duration);
      });
      tempAudio.addEventListener('error', () => resolve(0));
    });
  });
  return Promise.all(promises).then(durations => durations.reduce((a, b) => a + b, 0));
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

document.addEventListener('DOMContentLoaded', populateAlbumList);

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
    'tetrisGameContainer',
    'wordSearchContainer',
    'connectFourContainer',
    'cyclePrecisionContainer',
    'youtubeModalContainer',
    'tiktokModalContainer',
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
    tiktokModalContainer: {
        loadingMessage: 'Loading Omoluabi Paul\'s embedded TikTok feed…',
        errorMessage: 'The TikTok feed wouldn\'t load inside Àríyò AI. Please retry or open the full profile.',
        supportLink: 'https://www.tiktok.com/@omoluabi1003',
        supportLinkLabel: 'Open profile on TikTok'
    }
};

const panelStates = {};
const panelLoadTimers = {};
const panelOverlays = {};

function getPanelElement(id) {
    if (!panelRegistry[id]) {
        panelRegistry[id] = document.getElementById(id) || null;
    }
    return panelRegistry[id];
}

function initializePanelLoadTracking(panelId) {
    const config = PANEL_LOAD_CONFIG[panelId];
    if (!config) return;

    const panel = getPanelElement(panelId);
    if (!panel) return;

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
        clearInterval(autoPopOutInterval);
    } else if (!edgePanel.classList.contains('visible')) {
        autoPopOutEdgePanel();
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

    const loadedSrc = iframe.getAttribute('data-loaded-src') || iframe.getAttribute('src') || '';
    if (loadedSrc !== desiredSrc) {
        iframe.setAttribute('src', desiredSrc);
        iframe.setAttribute('data-loaded-src', desiredSrc);
    } else if (!iframe.hasAttribute('data-loaded-src') && loadedSrc) {
        iframe.setAttribute('data-loaded-src', loadedSrc);
    }
}

function openPanel(targetId, trigger = null) {
    const panel = getPanelElement(targetId);
    if (!panel) return;

    if (targetId === 'aboutModalContainer') {
        const iframe = panel.querySelector('iframe');
        if (iframe) {
            iframe.src = 'about.html';
        }
    }

    syncPanelSource(panel, trigger);
    beginPanelLoad(targetId);

    panel.style.display = 'block';
    updateEdgePanelBehavior();
}

function closePanel(targetId) {
    const panel = getPanelElement(targetId);
    if (!panel) return;

    panel.style.display = 'none';
    clearPanelTimeout(targetId);
    updateEdgePanelBehavior();
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
    const edgePanelHandle = document.querySelector('.edge-panel-handle');
    let isDragging = false;
    let initialX;
    let initialRight;

    edgePanelHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        initialX = e.clientX;
        initialRight = parseInt(window.getComputedStyle(edgePanel).right, 10);
        edgePanel.style.transition = 'none'; // Disable transition during drag
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const currentX = e.clientX;
            const dx = currentX - initialX;
            edgePanel.style.right = `${initialRight - dx}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            edgePanel.style.transition = 'right 0.3s ease-in-out'; // Re-enable transition
            const finalRight = parseInt(window.getComputedStyle(edgePanel).right, 10);
            if (finalRight < -40) {
                edgePanel.classList.remove('visible');
                edgePanel.style.right = '-70px';
            } else {
                edgePanel.classList.add('visible');
                edgePanel.style.right = '0';
            }
        }
    });

    edgePanelHandle.addEventListener('click', () => {
        if (!isDragging) {
            edgePanel.classList.toggle('visible');
            if (edgePanel.classList.contains('visible')) {
                edgePanel.style.right = '0';
            } else {
                edgePanel.style.right = '-70px';
            }
        }
    });

    function closeEdgePanel() {
        edgePanel.classList.remove('visible');
        edgePanel.style.right = '-70px';
    }



    /* AUTO POP-OUT/RETRACT EDGE PANEL */
    let chatbotWindowOpen = false;
    let autoPopOutInterval;

    function autoPopOutEdgePanel() {
        if (chatbotWindowOpen || edgePanel.classList.contains('visible')) return;

        // Automatically pop out the panel shortly after page load
        setTimeout(() => {
            edgePanel.style.right = '-20px';
            edgePanel.classList.add('visible');

            // And retract it after a few seconds
            setTimeout(() => {
                if (!chatbotWindowOpen) { // Check again in case a panel was opened
                    edgePanel.style.right = '-70px';
                    edgePanel.classList.remove('visible');
                }
            }, 5000);
        }, 2000);
    }

function showNowPlayingToast(trackTitle) {
  const toast = document.getElementById('nowPlayingToast');
  if (!toast) return;
  toast.textContent = `Now playing: ${trackTitle}`;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
