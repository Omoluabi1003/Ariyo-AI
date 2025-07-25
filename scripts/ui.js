function openAlbumList() {
      document.getElementById('main-content').classList.remove('about-us-active');
      const modal = document.getElementById('albumModal');
      const modalContent = modal.querySelector('.modal-content');

      modalContent.style.pointerEvents = 'none';
      modal.style.display = 'block';

      gsap.fromTo(modalContent,
        { scale: 0.8, opacity: 0, y: 50 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          onComplete: () => {
            modalContent.style.pointerEvents = 'auto';
            console.log('Album list animation complete, clicks enabled.');
          }
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
      modal.style.display = 'block';
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
      console.log('Track list closed');
    }

    function openRadioList() {
      document.getElementById('main-content').classList.remove('about-us-active');
      updateRadioListModal();
      const modal = document.getElementById('radioModal');
      const modalContent = modal.querySelector('.modal-content');

      modalContent.style.pointerEvents = 'none';
      modal.style.display = 'block';

      gsap.fromTo(modalContent,
        { scale: 0.8, opacity: 0, y: 50 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          onComplete: () => {
            modalContent.style.pointerEvents = 'auto';
            console.log('Radio list animation complete, clicks enabled.');
          }
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
    if (shuffleMode) {
      shuffleBtn.textContent = '🔀 Radio';
      shuffleStatusInfo.textContent = 'Shuffle: On (Radio)';
      console.log('Shuffle mode: Radio');
    } else {
      shuffleBtn.textContent = '🔀 Off';
      shuffleStatusInfo.textContent = 'Shuffle: Off';
      console.log('Shuffle mode: Off');
    }
  }
  // If we are in album/track mode, cycle through off, album, all
  else {
    if (shuffleScope === 'off') {
      shuffleScope = 'album';
      shuffleMode = true;
      shuffleBtn.textContent = '🔀 Album';
      shuffleStatusInfo.textContent = 'Shuffle: On (Album)';
      console.log('Shuffle mode: Album');
    } else if (shuffleScope === 'album') {
      shuffleScope = 'all';
      shuffleMode = true;
      shuffleBtn.textContent = '🔀 All';
      shuffleStatusInfo.textContent = 'Shuffle: On (All Tracks)';
      console.log('Shuffle mode: All');
    } else { // shuffleScope === 'all'
      shuffleScope = 'off';
      shuffleMode = false;
      shuffleBtn.textContent = '🔀 Off';
      shuffleStatusInfo.textContent = 'Shuffle: Off';
      console.log('Shuffle mode: Off');
    }
  }
  savePlayerState();
}

    /* CHATBOT & SABI BIBLE TOGGLE WITH US SPOOFING */
const chatbotContainer = document.getElementById('chatbotContainer');
const sabiBibleContainer = document.getElementById('sabiBibleContainer');
const pictureGameContainer = document.getElementById('pictureGameContainer');
const wordSearchGameContainer = document.getElementById('wordSearchGameContainer');

function isAnyPanelOpen() {
    return chatbotContainer.style.display === 'block' ||
           sabiBibleContainer.style.display === 'block' ||
           pictureGameContainer.style.display === 'block' ||
           wordSearchGameContainer.style.display === 'block';
}

// Spoof user as if dem dey America
window.spoofedLocation = {country:"US",timezone:"America/New_York",language:"en-US"};
console.log("US Spoof Active:", window.spoofedLocation);

function updateEdgePanelBehavior() {
    chatbotWindowOpen = isAnyPanelOpen();
    if (chatbotWindowOpen) {
        closeEdgePanel();
        clearInterval(autoPopOutInterval);
    } else if (!edgePanel.classList.contains('visible')) {
        autoPopOutEdgePanel();
    }
}

function toggleChatbot() {
    const isHidden = chatbotContainer.style.display === 'none' || !chatbotContainer.style.display;
    chatbotContainer.style.display = isHidden ? 'block' : 'none';
    updateEdgePanelBehavior();
}

function toggleSabiBible() {
    const isHidden = sabiBibleContainer.style.display === 'none' || !sabiBibleContainer.style.display;
    sabiBibleContainer.style.display = isHidden ? 'block' : 'none';
    updateEdgePanelBehavior();
}

function openPictureGame() {
    pictureGameContainer.style.display = 'block';
    updateEdgePanelBehavior();
}

function closePictureGame() {
    pictureGameContainer.style.display = 'none';
    updateEdgePanelBehavior();
}

function openWordSearchGame() {
    const wordSearchGameContainer = document.getElementById('wordSearchGameContainer');
    wordSearchGameContainer.style.display = 'block';
    updateEdgePanelBehavior();
}

function closeWordSearchGame() {
    const wordSearchGameContainer = document.getElementById('wordSearchGameContainer');
    wordSearchGameContainer.style.display = 'none';
    updateEdgePanelBehavior();
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
  toast.textContent = `Now playing: ${trackTitle}`;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}
