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

    /* NAVIGATE TO ABOUT PAGE & HOME */
    let originalMainContentHTML = '';
    let aboutButtonGlobal = null;
    let originalAboutButtonText = '';
    let originalAboutButtonOnClick;

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
    let currentBgIndex = 0;
    document.body.style.backgroundImage = `url(${backgrounds[currentBgIndex]})`;
    setInterval(() => {
      currentBgIndex = (currentBgIndex + 1) % backgrounds.length;
      document.body.style.backgroundImage = `url(${backgrounds[currentBgIndex]})`;
    }, 30000);

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
      const savedState = loadPlayerState();
      if (savedState) {
        currentAlbumIndex = savedState.albumIndex;
        currentTrackIndex = savedState.trackIndex;
        currentRadioIndex = savedState.radioIndex;
        shuffleMode = savedState.shuffleMode;
        shuffleScope = savedState.shuffleScope;

        if (currentRadioIndex >= 0) {
          const station = radioStations[currentRadioIndex];
          albumCover.src = station.logo;
          audioPlayer.src = station.url;
          trackInfo.textContent = `${station.name} - ${station.location}`;
          trackArtist.textContent = '';
          trackYear.textContent = '';
          trackAlbum.textContent = 'Radio Stream';
          cacheButton.style.display = 'none';
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
          trackAlbum.textContent = `Album: ${albums[currentAlbumIndex].name}`;
          cacheButton.style.display = 'block';
          audioPlayer.addEventListener('loadedmetadata', () => {
            audioPlayer.currentTime = savedState.playbackPosition;
            updateTrackTime();
            manageVinylRotation();
          }, { once: true });
        }
        updateTrackListModal();
        const shuffleBtn = document.querySelector("button[aria-label='Toggle shuffle']");
        const shuffleStatusInfo = document.getElementById('shuffleStatusInfo');

        if (shuffleScope === 'album') {
          shuffleBtn.textContent = '🔀 Album';
          shuffleStatusInfo.textContent = 'Shuffle: On (Album)';
        } else if (shuffleScope === 'all') {
          shuffleBtn.textContent = '🔀 All';
          shuffleStatusInfo.textContent = 'Shuffle: On (All Tracks)';
        } else {
          shuffleBtn.textContent = '🔀 Off';
          shuffleStatusInfo.textContent = 'Shuffle: Off';
        }
      } else {
        shuffleScope = 'off';
        shuffleMode = false;
        document.getElementById('shuffleStatusInfo').textContent = 'Shuffle: Off';
        document.querySelector("button[aria-label='Toggle shuffle']").textContent = '🔀 Off';
        selectAlbum(0);
      }
      updateStreak();
      updateMediaSession();
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
      window.addEventListener('load', function() {
        showIosInstallBanner();
        navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' })
          .then(function(registration) {
            console.log('Service Worker registered with scope:', registration.scope);

            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }

            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            });
          }).catch(function(error) {
            console.log('Service worker registration failed:', error);
          });

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
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
    installBtn.style.background = '#00bcd4';
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
    const icons = edgePanelContent.querySelectorAll('.chatbot-bubble-container, .sabi-bible-bubble-container, .picture-game-bubble-container, .word-search-bubble-container');
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
    let currentVersion;

    function checkForUpdates() {
        fetch('/version.json', { cache: 'no-store' })
            .then(response => response.json())
            .then(data => {
                if (currentVersion && currentVersion !== data.version) {
                    // New version available, prompt user to update
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
/* MUSIC PLAYER LOGIC */
    const audioPlayer = document.getElementById('audioPlayer') || new Audio();
    audioPlayer.crossOrigin = "anonymous";
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let isAudioContextResumed = false;

    function resumeAudioContext() {
        if (audioContext.state === 'suspended' && !isAudioContextResumed) {
            audioContext.resume().then(() => {
                isAudioContextResumed = true;
                console.log('AudioContext resumed successfully.');
            });
        }
    }

    audioPlayer.id = 'audioPlayer';
    audioPlayer.preload = 'metadata';
    if (!document.getElementById('audioPlayer')) {
        document.body.appendChild(audioPlayer);
    }
    const albumCover = document.getElementById('albumCover');
    const trackInfo = document.getElementById('trackInfo');
    const trackArtist = document.getElementById('trackArtist');
    const trackYear = document.getElementById('trackYear');
    const trackAlbum = document.getElementById('trackAlbum'); // Added for album display
    const trackDuration = document.getElementById('trackDuration');
    const seekBar = document.getElementById('seekBar');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const retryButton = document.getElementById('retryButton');
    const cacheButton = document.getElementById('cacheButton'); // New cache button
    const progressBar = document.getElementById('progressBarFill');
    const streakInfo = document.getElementById('streakInfo');
    let shuffleMode = false; // True if any shuffle is active
    let shuffleScope = 'off'; // 'off', 'album', 'all'
    let isFirstPlay = true;
    let lastTrackSrc = '';
    let lastTrackTitle = '';
    let lastTrackIndex = 0;

    let currentAlbumIndex = 0;
    let currentTrackIndex = 0;
    let currentRadioIndex = -1;

    // Streak Logic
    function updateStreak() {
      const now = new Date();
      const today = now.toDateString();
      const streakData = JSON.parse(localStorage.getItem('ariyoStreak')) || { streak: 0, lastDate: null };

      if (streakData.lastDate !== today) {
        const lastDate = streakData.lastDate ? new Date(streakData.lastDate) : null;
        if (lastDate) {
          const diffTime = now - lastDate;
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            streakData.streak += 1;
          } else if (diffDays > 1) {
            streakData.streak = 1; // Reset if more than a day is missed
          }
        } else {
          streakData.streak = 1; // First use
        }
        streakData.lastDate = today;
        localStorage.setItem('ariyoStreak', JSON.stringify(streakData));
      }

      streakInfo.textContent = `🔥 Current Streak: ${streakData.streak} days`;
      console.log(`Streak updated: ${streakData.streak} days`);
    }

    function savePlayerState() {
      const playerState = {
        albumIndex: currentAlbumIndex,
        trackIndex: currentTrackIndex,
        radioIndex: currentRadioIndex,
        playbackPosition: audioPlayer.currentTime,
        shuffleMode: shuffleMode,
        shuffleScope: shuffleScope, // Save shuffleScope
        timestamp: new Date().getTime()
      };
      localStorage.setItem('ariyoPlayerState', JSON.stringify(playerState));
      console.log('Player state saved:', playerState);
    }

    function loadPlayerState() {
      const savedState = localStorage.getItem('ariyoPlayerState');
      if (savedState) {
        try {
          const playerState = JSON.parse(savedState);
          const ageInHours = (new Date().getTime() - playerState.timestamp) / (1000 * 60 * 60);
          if (ageInHours < 24) {
            // Validate the saved state
            if (playerState.albumIndex >= 0 && playerState.albumIndex < albums.length &&
                playerState.trackIndex >= 0 && playerState.trackIndex < albums[playerState.albumIndex].tracks.length) {
              playerState.shuffleScope = playerState.shuffleScope || 'off';
              return playerState;
            }
          }
        } catch (error) {
          console.error('Error loading player state:', error);
          localStorage.removeItem('ariyoPlayerState');
        }
      }
      return null;
    }

    function updateTrackListModal() {
      const trackListContainer = document.querySelector('.track-list');
      trackListContainer.innerHTML = '';
      albums[currentAlbumIndex].tracks.forEach((track, index) => {
        const trackLink = document.createElement('a');
        trackLink.href = '#';
        trackLink.onclick = () => selectTrack(track.src, track.title, index);
        trackLink.textContent = track.title;
        trackListContainer.appendChild(trackLink);
      });
      console.log(`Track list updated for album: ${albums[currentAlbumIndex].name}`);
    }

    const stationsPerPage = 6;
let stationDisplayCounts = { nigeria: 0, westAfrica: 0, international: 0 };

// Region Classifier
function classifyStation(station) {
  const nigeriaLocations = ["Nigeria", "Lagos", "Ibadan", "Abuja", "Abeokuta", "Uyo", "Jos", "Kaduna", "Nassarawa", "Abia", "Ondo", "Calabar", "Aba"];
  const westAfricaLocations = ["Accra", "Ghana", "West Africa"];

  if (nigeriaLocations.includes(station.location)) return "nigeria";
  if (westAfricaLocations.includes(station.location)) return "westAfrica";
  return "international";
}

// Grouped Stations
const groupedStations = { nigeria: [], westAfrica: [], international: [] };
radioStations.forEach(station => {
  const region = classifyStation(station);
  groupedStations[region].push(station);
});

async function checkStreamStatus(url) {
      try {
        const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
        // no-cors means we can't access status, but we can see if we get a response
        return 'online';
      } catch (error) {
        return 'offline';
      }
    }

    function updateRadioListModal() {
      stationDisplayCounts = { nigeria: 0, westAfrica: 0, international: 0 };

      ["nigeria", "westAfrica", "international"].forEach(region => {
        document.getElementById(`${region}-stations`).innerHTML = '';
        document.querySelector(`button[onclick="loadMoreStations('${region}')"]`).style.display = 'inline-block';
        loadMoreStations(region);
      });

      console.log("Grouped and displayed radio stations by region");
    }

function loadMoreStations(region) {
  const container = document.getElementById(`${region}-stations`);
  const stations = groupedStations[region];
  const start = stationDisplayCounts[region];
  const end = start + stationsPerPage;

  stations.slice(start, end).forEach((station, index) => {
    const stationLink = document.createElement("a");
    stationLink.href = "#";
    stationLink.onclick = () => selectRadio(station.url, `${station.name} - ${station.location}`, index, station.logo);

    const statusSpan = document.createElement('span');
    statusSpan.style.marginLeft = '10px';
    statusSpan.textContent = ' (Checking...)';

    checkStreamStatus(station.url).then(status => {
        if (status === 'online') {
            statusSpan.textContent = ' (Online)';
            statusSpan.style.color = 'lightgreen';
        } else {
            statusSpan.textContent = ' (Offline)';
            statusSpan.style.color = 'red';
            stationLink.style.textDecoration = 'line-through';
        }
    });

    stationLink.textContent = `${station.name} (${station.location})`;
    stationLink.appendChild(statusSpan);
    container.appendChild(stationLink);
  });

  stationDisplayCounts[region] = end;

  if (stationDisplayCounts[region] >= stations.length) {
    document.querySelector(`button[onclick="loadMoreStations('${region}')"]`).style.display = 'none';
  }
}

    function selectAlbum(albumIndex) {
      console.log("selectAlbum called with index: ", albumIndex);
      console.log(`Selecting album: ${albums[albumIndex].name}`);
      currentAlbumIndex = albumIndex;
      currentTrackIndex = 0;
      currentRadioIndex = -1;
      albumCover.src = albums[currentAlbumIndex].cover;
      loadTrack(
        albums[currentAlbumIndex].tracks[currentTrackIndex].src,
        albums[currentAlbumIndex].tracks[currentTrackIndex].title,
        currentTrackIndex
      );
      updateTrackListModal();
      openTrackList();
      savePlayerState();
      document.getElementById('main-content').innerHTML = '';
    }

function selectTrack(src, title, index) {
      console.log(`[selectTrack] called with: src=${src}, title=${title}, index=${index}`);
      resumeAudioContext();
      console.log(`[selectTrack] Selecting track: ${title} from album: ${albums[currentAlbumIndex].name}`);
      currentTrackIndex = index;
      currentRadioIndex = -1;
      lastTrackSrc = src;
      lastTrackTitle = title;
      lastTrackIndex = index;
      audioPlayer.src = src + '?t=' + new Date().getTime();
      audioPlayer.currentTime = 0;
      document.getElementById('trackInfo').textContent = title;
      document.getElementById('trackArtist').textContent = 'Artist: Omoluabi';
      document.getElementById('trackYear').textContent = 'Release Year: 2025';
      document.getElementById('trackAlbum').textContent = `Album: ${albums[currentAlbumIndex].name}`; // Display album name
      document.getElementById('albumCover').src = albums[currentAlbumIndex].cover; // Ensure album cover updates
      closeTrackList();
      loadingSpinner.style.display = 'block';
      albumCover.style.display = 'none';
      retryButton.style.display = 'none';
      cacheButton.style.display = 'block'; // Show cache button
      document.getElementById('progressBar').style.display = 'block';
      progressBar.style.width = '0%';
      handleAudioLoad(src, title, false);
      updateMediaSession();
      showNowPlayingToast(title);
      playMusic();
    }

    function loadTrack(src, title, index) {
      console.log(`Loading track: ${title} from album: ${albums[currentAlbumIndex].name}`);
      currentTrackIndex = index;
      currentRadioIndex = -1;
      audioPlayer.src = src;
      audioPlayer.currentTime = 0;
      trackInfo.textContent = title;
      trackArtist.textContent = 'Artist: Omoluabi';
      trackYear.textContent = 'Release Year: 2025';
      trackAlbum.textContent = `Album: ${albums[currentAlbumIndex].name}`; // Display album name
      stopMusic();
      loadingSpinner.style.display = 'block';
      albumCover.style.display = 'none';
      retryButton.style.display = 'none';
      cacheButton.style.display = 'block'; // Show cache button for tracks
      document.getElementById('progressBar').style.display = 'block';
      progressBar.style.width = '0%';
    }


    function selectRadio(src, title, index, logo) {
      console.log(`[selectRadio] called with: src=${src}, title=${title}, index=${index}`);
      resumeAudioContext();
      closeRadioList();
      console.log(`[selectRadio] Selecting radio: ${title}`);
      currentRadioIndex = index;
      currentTrackIndex = -1;
      lastTrackSrc = src;
      lastTrackTitle = title;
      lastTrackIndex = index;
      audioPlayer.src = src;
      audioPlayer.currentTime = 0;
      trackInfo.textContent = title;
      trackArtist.textContent = '';
      trackYear.textContent = '';
      trackAlbum.textContent = 'Radio Stream'; // Clear album for radio
      albumCover.src = logo;
      closeRadioList();
      stopMusic();
      loadingSpinner.style.display = 'block';
      albumCover.style.display = 'none';
      retryButton.style.display = 'none';
      cacheButton.style.display = 'none'; // Hide cache button for radio
      document.getElementById('progressBar').style.display = 'block';
      progressBar.style.width = '0%';
      handleAudioLoad(src, title, true);
      updateMediaSession();
      showNowPlayingToast(title);
      playMusic();
      document.getElementById('main-content').innerHTML = '';
    }

    function retryTrack() {
      if (currentRadioIndex >= 0) {
        selectRadio(lastTrackSrc, lastTrackTitle, lastTrackIndex, radioStations[currentRadioIndex].logo);
      } else {
        selectTrack(lastTrackSrc, lastTrackTitle, lastTrackIndex);
      }
    }

    function handleAudioLoad(src, title, isInitialLoad = true) {
      // Remove all previous event listeners
      audioPlayer.removeEventListener('progress', onProgress);
      audioPlayer.removeEventListener('canplaythrough', onCanPlayThrough);
      audioPlayer.removeEventListener('canplay', onCanPlay);
      audioPlayer.removeEventListener('error', onError);

      const playTimeout = setTimeout(() => {
        loadingSpinner.style.display = 'none';
        albumCover.style.display = 'block';
        document.getElementById('progressBar').style.display = 'none';
        trackInfo.textContent = 'Error: Stream failed to load (timeout)';
        retryButton.style.display = 'block';
        console.error(`Timeout: ${title} failed to buffer within 5 seconds`);
      }, 5000);

      function onProgress() {
        if (audioPlayer.buffered.length > 0 && audioPlayer.duration) {
          const bufferedEnd = audioPlayer.buffered.end(0);
          const duration = audioPlayer.duration;
          progressBar.style.width = `${(bufferedEnd / duration) * 100}%`;
        }
      }

      function onCanPlayThrough() {
        console.log("onCanPlayThrough called");
        clearTimeout(playTimeout);
        loadingSpinner.style.display = 'none';
        albumCover.style.display = 'block';
        document.getElementById('progressBar').style.display = 'none';
        console.log(`Stream ${title} can play through`);
        attemptPlay();
      }

      function onCanPlay() {
        console.log("onCanPlay called");
        if (loadingSpinner.style.display === 'block') {
          clearTimeout(playTimeout);
          loadingSpinner.style.display = 'none';
          albumCover.style.display = 'block';
          document.getElementById('progressBar').style.display = 'none';
          console.log(`Stream ${title} can play (fallback)`);
          updateMediaSession();
          attemptPlay();
        }
      }

      function onError() {
        clearTimeout(playTimeout);
        loadingSpinner.style.display = 'none';
        albumCover.style.display = 'block';
        document.getElementById('progressBar').style.display = 'none';
        trackInfo.textContent = 'Error: Unable to load stream.';
        retryButton.style.display = 'block';
        console.error(`Audio error for ${title}:`, audioPlayer.error);
        if (audioPlayer.error) {
          console.error(`Error code: ${audioPlayer.error.code}, Message: ${audioPlayer.error.message}`);
        }
        // Also log the album cover src to see if it's correct
        console.error(`Album cover src: ${albumCover.src}`);
      }

      audioPlayer.addEventListener('progress', onProgress);
      audioPlayer.addEventListener('canplaythrough', onCanPlayThrough, { once: true });
      audioPlayer.addEventListener('canplay', onCanPlay, { once: true });
      audioPlayer.addEventListener('error', onError, { once: true });

      audioPlayer.load(); // Force load
    }

    function manageVinylRotation() {
      if (!audioPlayer.paused && !audioPlayer.ended) {
        albumCover.classList.add('spin');
      } else {
        albumCover.classList.remove('spin');
      }
    }

    function playMusic() {
      attemptPlay();
    }

    function attemptPlay() {
      console.log('[attemptPlay] called');
      loadingSpinner.style.display = 'none';
      albumCover.style.display = 'block';
      const playPromise = audioPlayer.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('[attemptPlay] Playback started successfully.');
          manageVinylRotation();
          audioPlayer.removeEventListener('timeupdate', updateTrackTime);
          audioPlayer.addEventListener('timeupdate', updateTrackTime);
          console.log(`Playing: ${trackInfo.textContent}`);
          updateStreak();
          savePlayerState();
          if (isFirstPlay) {
            gsap.fromTo(albumCover,
              { scale: 1 },
              { scale: 1.1, yoyo: true, repeat: 1, duration: 0.3, ease: "bounce.out" }
            );
            isFirstPlay = false;
          }
        }).catch(error => {
          console.error(`[attemptPlay] Autoplay was prevented for: ${trackInfo.textContent}. Error: ${error}`);
          handlePlayError(error, trackInfo.textContent);
        });
      }
    }

    function handlePlayError(error, title) {
      loadingSpinner.style.display = 'none';
      albumCover.style.display = 'block';
      document.getElementById('progressBar').style.display = 'none';
      retryButton.style.display = 'block';
      console.error(`Error playing ${title}:`, error);

      if (!navigator.onLine) {
        trackInfo.textContent = 'Offline. Please check your connection.';
        return;
      }

      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          trackInfo.textContent = 'Playback aborted.';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          trackInfo.textContent = 'A network error occurred.';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          trackInfo.textContent = 'A decoding error occurred.';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          trackInfo.textContent = 'Audio format not supported.';
          break;
        default:
          trackInfo.textContent = 'An unknown error occurred.';
          break;
      }
    }

    function pauseMusic() {
      audioPlayer.pause();
      manageVinylRotation();
      audioPlayer.removeEventListener('timeupdate', updateTrackTime);
      console.log('Paused');
      savePlayerState();
    }

    function stopMusic() {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      manageVinylRotation();
      audioPlayer.removeEventListener('timeupdate', updateTrackTime);
      seekBar.value = 0;
      trackDuration.textContent = '0:00 / 0:00';
      console.log('Stopped');
      savePlayerState();
    }

    function updateTrackTime() {
  const currentTime = audioPlayer.currentTime;

  // 🔒 If it's a radio stream, don't format duration
  if (currentRadioIndex >= 0 || !isFinite(audioPlayer.duration)) {
    trackDuration.textContent = `${formatTime(currentTime)} / Live`;
    seekBar.style.display = 'none'; // hide seekbar for radio
    return;
  }

  const duration = audioPlayer.duration || 0;

  if (!isNaN(duration) && duration > 0) {
    trackDuration.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
    seekBar.value = (currentTime / duration) * 100;
    seekBar.style.display = 'block';
    savePlayerState();
  } else {
    trackDuration.textContent = `${formatTime(currentTime)} / Loading...`;
    seekBar.style.display = 'block';
  }
}

    function formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}:${secs < 10 ? '0' + secs : secs}`;
    }

    function seekAudio(value) {
      if (audioPlayer.duration && currentRadioIndex === -1) {
        const newTime = (value / 100) * audioPlayer.duration;
        audioPlayer.currentTime = newTime;
        updateTrackTime();
      }
    }

    seekBar.addEventListener('input', () => seekAudio(seekBar.value));
    seekBar.addEventListener('touchstart', () => audioPlayer.pause(), { passive: true });
    seekBar.addEventListener('touchend', () => {
      seekAudio(seekBar.value);
      if (!audioPlayer.paused) audioPlayer.play();
    });

    audioPlayer.addEventListener('loadedmetadata', updateTrackTime);

    audioPlayer.addEventListener('ended', () => {
      console.log("Track ended, selecting next track...");
      audioPlayer.removeEventListener('timeupdate', updateTrackTime);
      manageVinylRotation();
      if (currentRadioIndex === -1) { // Only if not playing a radio station
        if (shuffleMode) {
          if (shuffleScope === 'all') {
            // Shuffle across all albums
            const allTracks = [];
            albums.forEach((album, albumIdx) => {
              album.tracks.forEach((track, trackIdx) => {
                allTracks.push({ ...track, originalAlbumIndex: albumIdx, originalTrackIndex: trackIdx });
              });
            });
            if (allTracks.length > 0) {
              const randomTrackInfo = allTracks[Math.floor(Math.random() * allTracks.length)];
              currentAlbumIndex = randomTrackInfo.originalAlbumIndex; // Update currentAlbumIndex
              selectTrack(randomTrackInfo.src, randomTrackInfo.title, randomTrackInfo.originalTrackIndex);
            }
          } else { // shuffleScope === 'album'
            const randomIndex = Math.floor(Math.random() * albums[currentAlbumIndex].tracks.length);
            selectTrack(
              albums[currentAlbumIndex].tracks[randomIndex].src,
              albums[currentAlbumIndex].tracks[randomIndex].title,
              randomIndex
            );
          }
        } else { // No shuffle
          currentTrackIndex = (currentTrackIndex + 1) % albums[currentAlbumIndex].tracks.length;
          selectTrack(
            albums[currentAlbumIndex].tracks[currentTrackIndex].src,
            albums[currentAlbumIndex].tracks[currentTrackIndex].title,
            currentTrackIndex
          );
        }
        setTimeout(() => {
          playMusic();
        }, 1000);
      }
    });

    audioPlayer.addEventListener('play', manageVinylRotation);
    audioPlayer.addEventListener('pause', manageVinylRotation);
    audioPlayer.addEventListener('ended', manageVinylRotation);

audioPlayer.addEventListener('playing', () => {
  audioPlayer.removeEventListener('timeupdate', updateTrackTime); // clear old listener
  audioPlayer.addEventListener('timeupdate', updateTrackTime);    // reattach freshly
  updateTrackTime();  // update UI instantly
  manageVinylRotation(); // spin the album cover if needed
  console.log(`🎧 Time tracking active: ${trackInfo.textContent}`);
});

function switchTrack(direction) {
  if (currentRadioIndex !== -1) {
    const stationCount = radioStations.length;
    let newIndex;
    if (shuffleMode) {
      newIndex = Math.floor(Math.random() * stationCount);
    } else {
      newIndex = (currentRadioIndex + direction + stationCount) % stationCount;
    }
    const station = radioStations[newIndex];
    selectRadio(station.url, `${station.name} - ${station.location}`, newIndex, station.logo);
  } else {
    if (shuffleMode) {
      if (shuffleScope === 'all') {
        const allTracks = [];
        albums.forEach((album, albumIdx) => {
          album.tracks.forEach((track, trackIdx) => {
            allTracks.push({ ...track, originalAlbumIndex: albumIdx, originalTrackIndex: trackIdx });
          });
        });
        if (allTracks.length > 0) {
          const randomTrackInfo = allTracks[Math.floor(Math.random() * allTracks.length)];
          currentAlbumIndex = randomTrackInfo.originalAlbumIndex;
          selectTrack(randomTrackInfo.src, randomTrackInfo.title, randomTrackInfo.originalTrackIndex);
        }
      } else { // shuffleScope === 'album'
        const trackCount = albums[currentAlbumIndex].tracks.length;
        const newIndex = Math.floor(Math.random() * trackCount);
        selectTrack(
          albums[currentAlbumIndex].tracks[newIndex].src,
          albums[currentAlbumIndex].tracks[newIndex].title,
          newIndex
        );
      }
    } else { // No shuffle
      const trackCount = albums[currentAlbumIndex].tracks.length;
      currentTrackIndex = (currentTrackIndex + direction + trackCount) % trackCount;
      selectTrack(
        albums[currentAlbumIndex].tracks[currentTrackIndex].src,
        albums[currentAlbumIndex].tracks[currentTrackIndex].title,
        currentTrackIndex
      );
    }
  }

  if (!audioPlayer.paused) {
    audioPlayer.addEventListener('canplay', function canPlayListener() {
      audioPlayer.play();
      manageVinylRotation();
      audioPlayer.removeEventListener('canplay', canPlayListener);
    });
  }
  updateMediaSession();
}

function nextTrack() {
  switchTrack(1);
  showNowPlayingToast(trackInfo.textContent);
}

function previousTrack() {
  switchTrack(-1);
  showNowPlayingToast(trackInfo.textContent);
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
    const iframe = wordSearchGameContainer.querySelector('iframe');
    if (iframe && iframe.contentWindow && typeof iframe.contentWindow.startGame === 'function') {
        iframe.contentWindow.startGame();
    }
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

    function startDrag(clientX) {
        isDragging = true;
        initialX = clientX;
        initialRight = parseInt(window.getComputedStyle(edgePanel).right, 10);
        edgePanel.style.transition = 'none'; // Disable transition during drag
    }

    function onDrag(clientX) {
        if (isDragging) {
            const dx = clientX - initialX;
            edgePanel.style.right = `${initialRight - dx}px`;
        }
    }

    function endDrag() {
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
    }

    edgePanelHandle.addEventListener('mousedown', (e) => startDrag(e.clientX));
    edgePanelHandle.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        if (touch) startDrag(touch.clientX);
    });

    document.addEventListener('mousemove', (e) => onDrag(e.clientX));
    document.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        if (touch) onDrag(touch.clientX);
    });

    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);

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
