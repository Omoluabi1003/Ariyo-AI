    /* SHARE BUTTON (Web Share API) */
    function shareContent() {
      if (navigator.share) {
        navigator.share({
          title: "Àríyò AI - Smart Naija AI",
          text: "Check out this awesome page!",
          url: window.location.href
        }).catch((err) => console.error("Share failed:", err));
      } else {
        alert("Your browser doesn't support the Web Share API. Please copy the URL manually.");
      }
    }

    /* Utility to create URL-friendly slugs */
    function slugify(str) {
      return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }

    /* SEARCH BAR AUTO-COMPLETE */
    const searchInput = document.getElementById('searchInput');
    const searchSuggestions = document.getElementById('searchSuggestions');
    const searchMap = {};

    albums.forEach((album, albumIndex) => {
      const albumLabel = `Album ${albumIndex + 1}: ${album.name}`;
      const albumOption = document.createElement('option');
      albumOption.value = albumLabel;
      searchSuggestions.appendChild(albumOption);
      searchMap[albumLabel.toLowerCase()] = { type: 'album', albumIndex };

      album.tracks.forEach((track, trackIndex) => {
        const label = `${track.title} - ${album.name}`;
        const option = document.createElement('option');
        option.value = label;
        searchSuggestions.appendChild(option);
        searchMap[label.toLowerCase()] = { type: 'track', albumIndex, trackIndex };
      });
    });

    radioStations.forEach((station, index) => {
      const label = `${station.name} (${station.location})`;
      const option = document.createElement('option');
      option.value = label;
      searchSuggestions.appendChild(option);
      searchMap[label.toLowerCase()] = { type: 'radio', index };
    });

    searchInput.addEventListener('input', (e) => {
      const key = e.target.value.trim().toLowerCase();
      const result = searchMap[key];
      if (result) {
        if (result.type === 'track') {
          currentAlbumIndex = result.albumIndex;
          const track = albums[result.albumIndex].tracks[result.trackIndex];
          selectTrack(track.src, track.title, result.trackIndex);
        } else if (result.type === 'radio') {
          const station = radioStations[result.index];
          selectRadio(station.url, `${station.name} - ${station.location}`, result.index, station.logo);
        } else if (result.type === 'album') {
          selectAlbum(result.albumIndex);
        }
        e.target.value = '';
      }
    });

    /* NAVIGATE TO ABOUT PAGE & HOME */
    let originalMainContentHTML = '';
    let aboutButtonGlobal = null;
    let originalAboutButtonText = '';
    let originalAboutButtonOnClick;
    let currentVersion;

    async function navigateToAbout() {
      const mainContent = document.getElementById('main-content');

      if (!aboutButtonGlobal) {
          const sidebarButtons = document.querySelectorAll('.sidebar button');
          aboutButtonGlobal = Array.from(sidebarButtons).find(btn => btn.textContent.includes('About Us'));
          if (aboutButtonGlobal) {
              originalAboutButtonText = aboutButtonGlobal.textContent;
              originalAboutButtonOnClick = aboutButtonGlobal.onclick;
          }
      }

      if (!mainContent.dataset.originalContentStored) {
        originalMainContentHTML = mainContent.innerHTML;
        mainContent.dataset.originalContentStored = 'true';
      }

      savePlayerState();

      try {
        const response = await fetch('about.html');
        if (!response.ok) {
          console.error('Failed to fetch about.html:', response.status);
          mainContent.innerHTML = '<p>Error loading About page content.</p>';
          return;
        }
        const aboutHtmlText = await response.text();
        const parser = new DOMParser();
        const aboutDoc = parser.parseFromString(aboutHtmlText, 'text/html');

        const aboutPageActualContent = aboutDoc.body.innerHTML;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = aboutDoc.body.innerHTML;

        const albumCoversDiv = tempDiv.querySelector('.album-covers');
        if (albumCoversDiv) {
          albumCoversDiv.innerHTML = '';
          albums.forEach(album => {
            const albumLink = document.createElement('a');
            albumLink.href = album.external_url || '#';
            if (album.external_url) {
                albumLink.target = '_blank';
            }

            const img = document.createElement('img');
            img.src = album.cover;
            img.alt = album.name + " Album Cover";
            img.title = album.name;

            const nameParagraph = document.createElement('p');
            nameParagraph.textContent = album.name;
            nameParagraph.style.color = '#fff';
            nameParagraph.style.fontSize = '0.8rem';
            nameParagraph.style.marginTop = '0.5rem';

            const albumContainer = document.createElement('div');
            albumContainer.style.textAlign = 'center';
            albumContainer.appendChild(img);
            albumContainer.appendChild(nameParagraph);

            albumLink.appendChild(albumContainer);
            albumCoversDiv.appendChild(albumLink);
          });
        }

        mainContent.innerHTML = tempDiv.innerHTML;


        const oldStyles = document.getElementById('about-page-styles');
        if (oldStyles) {
          oldStyles.remove();
        }
        const styleElement = document.createElement('style');
        styleElement.id = 'about-page-styles';
        styleElement.textContent = aboutDoc.head.querySelector('style').textContent;
        document.head.appendChild(styleElement);

        let socialIconOverrideStyle = document.getElementById('social-icon-override-styles');
        if (!socialIconOverrideStyle) {
          socialIconOverrideStyle = document.createElement('style');
          socialIconOverrideStyle.id = 'social-icon-override-styles';
          document.head.appendChild(socialIconOverrideStyle);
        }
        socialIconOverrideStyle.textContent = `
          #main-content .social-icons a img {
            width: 48px;
            height: 48px;
            border-radius: 8px; /* Optional: adjust border-radius if desired */
            object-fit: cover;
          }
          @media (max-width: 768px) {
            #main-content .social-icons a img {
              width: 40px;
              height: 40px;
            }
          }
        `;

        if (window.location.pathname !== '/about.html') {
          history.pushState({ page: 'about' }, 'About Us', 'about.html');
        }

        if (aboutButtonGlobal) {
          aboutButtonGlobal.textContent = '🎵 Back to Player';
          aboutButtonGlobal.onclick = navigateToHome;
        }
        mainContent.classList.add('about-us-active');
        mainContent.style.opacity = '1';

      } catch (error) {
        console.error('Error navigating to About page:', error);
        mainContent.innerHTML = '<p>Error loading About page content.</p>';
      }
    }

    function navigateToHome() {
      const mainContent = document.getElementById('main-content');
      mainContent.innerHTML = '<div id="newsContainer" class="news-container" style="display: none;"></div>';


      const aboutPageStyles = document.getElementById('about-page-styles');
      if (aboutPageStyles) {
        aboutPageStyles.remove();
      }
      const socialIconOverride = document.getElementById('social-icon-override-styles');
      if (socialIconOverride) {
        socialIconOverride.remove();
      }

      let currentPath = window.location.pathname;
      if (currentPath.endsWith('/main.html')) currentPath = currentPath.substring(0, currentPath.length - 'main.html'.length);
      if (currentPath.endsWith('/about.html')) {
          history.pushState({ page: 'home' }, 'Home', currentPath.replace('about.html', ''));
      } else if (currentPath !== '/' && !currentPath.endsWith('/')) {
           history.pushState({ page: 'home' }, 'Home', '/');
      }

      if (aboutButtonGlobal && originalAboutButtonText && typeof originalAboutButtonOnClick === 'function') {
        aboutButtonGlobal.textContent = originalAboutButtonText;
        aboutButtonGlobal.onclick = originalAboutButtonOnClick;
      }

      mainContent.classList.remove('about-us-active');
      gsap.to(mainContent, { opacity: 1, duration: 0.5 });
    }

    /* BACKGROUND CYCLER */
    const backgrounds = [
      'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI.jpg',
      'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI2.jpg',
      'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI3.jpg'
    ];

    // Preload background images to prevent flashing
    const preloadedBackgrounds = backgrounds.map(src => {
      const img = new Image();
      img.src = src;
      return img;
    });

    let currentBgIndex = 0;
    document.body.style.backgroundImage = `url(${backgrounds[currentBgIndex]})`;

    const changeBackground = () => {
      const nextIndex = (currentBgIndex + 1) % backgrounds.length;
      const nextImage = preloadedBackgrounds[nextIndex];

      const applyBackground = () => {
        document.body.style.backgroundImage = `url(${backgrounds[nextIndex]})`;
        currentBgIndex = nextIndex;
      };

      if (nextImage.complete) {
        applyBackground();
      } else {
        nextImage.onload = applyBackground;
      }
    };

    setInterval(changeBackground, 30000);

    /* DYNAMIC AUDIO CACHING */
    function cacheTrackForOffline(trackUrl) {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_TRACK',
          url: trackUrl
        });
        console.log(`Requested caching for: ${trackUrl}`);
      } else {
        console.warn('Service worker not available for caching');
        alert('Offline caching unavailable. Please try again later.');
      }
    }

    // Listen for caching confirmation from service worker
    navigator.serviceWorker.onmessage = (event) => {
      if (event.data && event.data.type === 'TRACK_CACHED') {
        console.log(`Track cached successfully: ${event.data.url}`);
        alert(`Track cached for offline use: ${event.data.url.split('/').pop()}`);
      }
    };

    /* MEDIA SESSION API */
    function updateMediaSession() {
      if ('mediaSession' in navigator) {
        const track = currentRadioIndex === -1
          ? albums[currentAlbumIndex].tracks[currentTrackIndex]
          : radioStations[currentRadioIndex];
        const artwork = currentRadioIndex === -1
          ? albums[currentAlbumIndex].cover
          : radioStations[currentRadioIndex].logo;

        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentRadioIndex === -1 ? track.title : track.name + ' - ' + track.location,
          artist: currentRadioIndex === -1 ? 'Omoluabi' : '',
          album: currentRadioIndex === -1 ? albums[currentAlbumIndex].name : '',
          artwork: [
            { src: artwork, sizes: '96x96', type: 'image/jpeg' },
            { src: artwork, sizes: '128x128', type: 'image/jpeg' },
            { src: artwork, sizes: '192x192', type: 'image/jpeg' },
            { src: artwork, sizes: '256x256', type: 'image/jpeg' },
            { src: artwork, sizes: '384x384', type: 'image/jpeg' },
            { src: artwork, sizes: '512x512', type: 'image/jpeg' }
          ]
        });

        navigator.mediaSession.setActionHandler('play', playMusic);
        navigator.mediaSession.setActionHandler('pause', pauseMusic);
        navigator.mediaSession.setActionHandler('stop', stopMusic);
        navigator.mediaSession.setActionHandler('previoustrack', previousTrack);
        navigator.mediaSession.setActionHandler('nexttrack', nextTrack);

        console.log('Media Session updated with artwork');
      }
    }

    audioPlayer.addEventListener('timeupdate', () => {
      if ('mediaSession' in navigator && audioPlayer.duration && currentRadioIndex === -1) {
        navigator.mediaSession.setPositionState({
          duration: audioPlayer.duration,
          playbackRate: audioPlayer.playbackRate,
          position: audioPlayer.currentTime
        });
      }
    });

    function initializePlayer() {
      const params = new URLSearchParams(window.location.search);
      const albumParam = params.get('album');
      const trackParam = params.get('track');
      if (albumParam && trackParam) {
        const albumIndex = albums.findIndex(a => slugify(a.name) === albumParam);
        if (albumIndex !== -1) {
          const album = albums[albumIndex];
          const trackIndex = album.tracks.findIndex(t => slugify(t.title) === trackParam);
          if (trackIndex !== -1) {
            currentAlbumIndex = albumIndex;
            updateTrackListModal();
            selectTrack(album.tracks[trackIndex].src, album.tracks[trackIndex].title, trackIndex);
            return;
          }
        }
      }

      const savedState = loadPlayerState();
      if (savedState) {
        currentAlbumIndex = savedState.albumIndex;
        currentTrackIndex = savedState.trackIndex;
        currentRadioIndex = savedState.radioIndex;
        // shuffleMode = savedState.shuffleMode; // This line is updated below
        if (currentRadioIndex >= 0) {
          const station = radioStations[currentRadioIndex];
          albumCover.src = station.logo;
          audioPlayer.src = station.url;
          trackInfo.textContent = `${station.name} - ${station.location}`;
          trackArtist.textContent = '';
          trackYear.textContent = '';
          trackAlbum.textContent = 'Radio Stream'; // Clear album for radio
          cacheButton.style.display = 'none'; // Hide for radio
          audioPlayer.addEventListener('loadedmetadata', () => {
            audioPlayer.currentTime = savedState.playbackPosition;
            updateTrackTime();
            manageVinylRotation();
          }, { once: true });
        } else {
          albumCover.src = albums[currentAlbumIndex].cover;
          const track = albums[currentAlbumIndex].tracks[currentTrackIndex];
          audioPlayer.src = track.src;
          trackInfo.textContent = track.title;
          trackArtist.textContent = 'Artist: Omoluabi';
          trackYear.textContent = 'Release Year: 2025';
           trackAlbum.textContent = `Album: ${albums[currentAlbumIndex].name}`; // Display album name
          cacheButton.style.display = 'block'; // Show for tracks
          audioPlayer.addEventListener('loadedmetadata', () => {
            audioPlayer.currentTime = savedState.playbackPosition;
            updateTrackTime();
            manageVinylRotation();
          }, { once: true });
        }
        updateTrackListModal();
        const controls = document.querySelector(".music-controls.icons-only");
        // Updated section for shuffle button text:
        const shuffleBtn = controls.querySelector("button[aria-label='Toggle shuffle']");
        const shuffleStatusInfo = document.getElementById('shuffleStatusInfo');

        shuffleMode = savedState.shuffleMode;
        shuffleScope = savedState.shuffleScope;

        if (shuffleScope === 'album') {
          shuffleBtn.textContent = '🔀 Album';
          shuffleStatusInfo.textContent = 'Shuffle: On (Album)';
        } else if (shuffleScope === 'all') {
          shuffleBtn.textContent = '🔀 All';
          shuffleStatusInfo.textContent = 'Shuffle: On (All Tracks)';
        } else { // off
          shuffleBtn.textContent = '🔀 Off';
          shuffleStatusInfo.textContent = 'Shuffle: Off';
        }
        console.log('Player restored from saved state:', savedState);
      } else {
        // Default state for a new session if no saved state
        shuffleScope = 'off';
        shuffleMode = false;
        document.getElementById('shuffleStatusInfo').textContent = 'Shuffle: Off';
        document.querySelector(".music-controls.icons-only button[aria-label='Toggle shuffle']").textContent = '🔀 Off';
        selectAlbum(0);
        console.log('No saved state found, initialized with default');
      }
      updateMediaSession();
      if (!savedState) {
        selectAlbum(0);
      }
    }

    // GSAP Sidebar Button Animations
    document.querySelectorAll('.sidebar button').forEach(button => {
      button.addEventListener('mouseenter', () => {
        gsap.to(button, { scale: 1.08, duration: 0.3, ease: "power2.out" });
      });
      button.addEventListener('mouseleave', () => {
        gsap.to(button, { scale: 1, duration: 0.3, ease: "power2.out" });
      });
      button.addEventListener('click', () => {
        gsap.to(button, {
          scale: 0.95,
          duration: 0.1,
          ease: "power1.in",
          onComplete: () => gsap.to(button, { scale: 1, duration: 0.2, ease: "bounce.out" })
        });
      });
    });

    // Initialize player
    initializePlayer();
    autoPopOutEdgePanel();

    // Save state before unloading
    window.addEventListener('beforeunload', savePlayerState);

    // PWA Install Prompt
    if ('serviceWorker' in navigator) {
      // Reload the page when a new service worker activates
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      window.addEventListener('load', async function() {
        showIosInstallBanner();
        let version = '';
        try {
          const res = await fetch('/version.json', { cache: 'no-store' });
          const data = await res.json();
          version = data.version;
          currentVersion = version;
        } catch (err) {
          console.error('Failed to fetch version for SW registration:', err);
        }
        const swUrl = version ? `/service-worker.js?v=${version}` : '/service-worker.js';
        navigator.serviceWorker.register(swUrl).then(function(registration) {
          console.log('Service Worker registered with scope:', registration.scope);
        }).catch(function(error) {
          console.log('Service worker registration failed:', error);
        });
      });
    }

    let deferredPrompt;
    const installContainer = document.createElement('div');
    installContainer.style.position = 'fixed';
    installContainer.style.bottom = '20px';
    installContainer.style.right = '20px';
    installContainer.style.zIndex = '1000';
    document.body.appendChild(installContainer);

    const installBtn = document.createElement('button');
    installBtn.textContent = 'Install Àríyò AI';
    installBtn.style.background = 'var(--theme-color)';
    installBtn.style.color = 'white';
    installBtn.style.padding = '10px 20px';
    installBtn.style.border = 'none';
    installBtn.style.borderRadius = '5px';
    installBtn.style.display = 'none';
    installContainer.appendChild(installBtn);

    const iosInstallBanner = document.createElement('div');
    iosInstallBanner.innerHTML = '<p>To install, tap the share button and then "Add to Home Screen".</p>';
    iosInstallBanner.style.background = 'rgba(0,0,0,0.8)';
    iosInstallBanner.style.color = 'white';
    iosInstallBanner.style.padding = '10px';
    iosInstallBanner.style.borderRadius = '5px';
    iosInstallBanner.style.display = 'none';
    installContainer.appendChild(iosInstallBanner);

    const closeBannerBtn = document.createElement('button');
    closeBannerBtn.innerHTML = '&times;';
    closeBannerBtn.style.position = 'absolute';
    closeBannerBtn.style.top = '0';
    closeBannerBtn.style.right = '5px';
    closeBannerBtn.style.background = 'none';
    closeBannerBtn.style.border = 'none';
    closeBannerBtn.style.color = 'white';
    closeBannerBtn.style.fontSize = '20px';
    closeBannerBtn.onclick = () => {
      iosInstallBanner.style.display = 'none';
    };
    iosInstallBanner.appendChild(closeBannerBtn);


    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (!isIOS()) {
        installBtn.style.display = 'block';
      }
      console.log('Install prompt available');
    });

    function showIosInstallBanner() {
      if (isIOS() && !navigator.standalone) {
        iosInstallBanner.style.display = 'block';
      }
    }

    installBtn.onclick = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User installed the app');
          }
          deferredPrompt = null;
          installBtn.style.display = 'none';
        });
      }
    };

    function isIOS() {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test( userAgent );
    }

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
    });

    // Handle visibility change to fix track time bar after sleep
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !audioPlayer.paused) {
        audioPlayer.removeEventListener('timeupdate', updateTrackTime);
        audioPlayer.addEventListener('timeupdate', updateTrackTime);
        updateTrackTime();
        console.log('Page visible, reattached timeupdate listener');
      }
    });

    // Handle Browser Back/Forward Navigation for dynamically loaded content
    window.addEventListener('popstate', (event) => {
      const mainContent = document.getElementById('main-content');
      const aboutPageStyles = document.getElementById('about-page-styles');

      if (event.state && event.state.page) {
        if (event.state.page === 'about') {
          if (!aboutPageStyles || mainContent.innerHTML.includes('<h2>Select an option from the sidebar')) {
            navigateToAbout();
          }
        } else if (event.state.page === 'home') {
          if (aboutPageStyles) {
            navigateToHome();
          }
        }
      } else {
        // Fallback for initial state or null state. If about page is showing, go home.
        if (aboutPageStyles) {
          navigateToHome();
        }
      }
    });




    // Weekly Color Scheme Changer
    changeColorScheme();

    // Dynamic Edge Panel Height
    const edgePanelContent = document.querySelector('.edge-panel-content');
    const icons = edgePanelContent.querySelectorAll('.chatbot-bubble-container, .sabi-bible-bubble-container, .picture-game-bubble-container, .tetris-bubble-container, .word-search-bubble-container, .chess-bubble-container');
    const iconHeight = 50; // height of each icon
    const iconSpacing = 20; // spacing between icons
    const panelPadding = 20; // top and bottom padding of the panel
    const panelHeight = (icons.length * iconHeight) + ((icons.length - 1) * iconSpacing) + (2 * panelPadding);
    document.getElementById('edgePanel').style.height = `${panelHeight}px`;

    // Add this to your main.js file
    document.addEventListener('DOMContentLoaded', function() {
        // Your other DOM-dependent code here
    });

    // Check for updates
    function checkForUpdates() {
        fetch('/version.json', { cache: 'no-store' })
            .then(response => response.json())
            .then(data => {
                if (currentVersion && currentVersion !== data.version) {
                    if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.register(`/service-worker.js?v=${data.version}`);
                    }
                    if (confirm('A new version of Àríyò AI is available. Reload to update?')) {
                        window.location.reload();
                    }
                }
                currentVersion = data.version;
            })
            .catch(error => console.error('Error checking for updates:', error));
    }

    // Check for updates every 5 minutes
    setInterval(checkForUpdates, 300000);

    // Initial check
    checkForUpdates();
