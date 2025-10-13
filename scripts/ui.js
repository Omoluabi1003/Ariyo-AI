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
    'aboutModalContainer'
];

const panelRegistry = {};

function getPanelElement(id) {
    if (!panelRegistry[id]) {
        panelRegistry[id] = document.getElementById(id) || null;
    }
    return panelRegistry[id];
}

document.addEventListener('DOMContentLoaded', () => {
    PANEL_IDS.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            panelRegistry[id] = element;
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

    panel.style.display = 'block';
    updateEdgePanelBehavior();
}

function closePanel(targetId) {
    const panel = getPanelElement(targetId);
    if (!panel) return;

    panel.style.display = 'none';
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
