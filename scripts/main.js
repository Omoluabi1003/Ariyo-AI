    function ensureHttps(url) {
      return url.startsWith('https://')
        ? url
        : `https://${url.replace(/^https?:\/\//i, '')}`;
    }

    let pendingSharedPlayback = null;

    /**
     * Builds a standardized, title-first share payload for music and radio experiences.
     * - Always bolds the heading and places it on the first line.
     * - Uses the "Title by Artist" phrasing to keep the artist close to the track name.
     * - Keeps the URL out of the share text to avoid duplicate links in some share targets.
     * - Ensures the URL is normalized to HTTPS and placed on its own line in QR payloads.
     *
     * @param {string} title - The track or station title; falls back to "Àríyò AI" when empty.
     * @param {string} [artist] - Optional artist name appended to the title with "by".
     * @param {string} url - The share target URL, automatically converted to HTTPS.
     * @returns {{ heading: string, url: string, shareText: string, qrText: string }}
     */
    function formatMusicSharePayload(title, artist, url) {
      const safeUrl = ensureHttps(url);
      const safeTitle = (title || 'Àríyò AI').trim();
      const safeArtist = (artist || '').trim();
      const heading = safeArtist ? `${safeTitle} by ${safeArtist}` : safeTitle;
      const boldHeading = `**${heading}**`;

      return {
        heading,
        url: safeUrl,
        shareText: boldHeading,
        qrText: `${boldHeading}\n${safeUrl}`
      };
    }

    function normalizeShareTargetPath(url) {
      const target = new URL(url);

      if (target.pathname.endsWith('/about.html')) {
        target.pathname = target.pathname.replace(/about\.html$/, '/main.html');
      } else if (target.pathname === '/' || target.pathname.endsWith('/index.html')) {
        target.pathname = target.pathname.replace(/index\.html$/, 'main.html').replace(/\/$/, '/main.html');
      }

      return target;
    }

    function derivePlaybackFromUrl(url) {
      const params = new URL(url).searchParams;
      const stationParam = params.get('station');
      const albumParam = params.get('album');
      const trackParam = params.get('track');

      if (stationParam) {
        const stationIndex = radioStations.findIndex(s => slugify(s.name) === stationParam);
        if (stationIndex !== -1) {
          return { type: 'radio', index: stationIndex };
        }
      }

      if (albumParam && trackParam) {
        const albumIndex = albums.findIndex(a => slugify(a.name) === albumParam);
        if (albumIndex !== -1) {
          const trackIndex = albums[albumIndex].tracks.findIndex(t => slugify(t.title) === trackParam);
          if (trackIndex !== -1) {
            return { type: 'track', albumIndex, trackIndex };
          }
        }
      }

      return null;
    }

    function deriveActivePlaybackContext() {
      const livePlayback = typeof captureCurrentSource === 'function' ? captureCurrentSource() : null;
      const derivedPlayback = derivePlaybackFromUrl(window.location.href);
      const playback = livePlayback || derivedPlayback;

      if (playback && playback.type === 'track') {
        const album = albums[playback.albumIndex];
        const track = album && album.tracks ? album.tracks[playback.trackIndex] : null;
        if (album && track) {
          return {
            type: 'track',
            title: track.title,
            artist: track.artist || album.artist,
            albumSlug: slugify(album.name),
            trackSlug: slugify(track.title)
          };
        }
      }

      if (playback && playback.type === 'radio') {
        const station = Array.isArray(radioStations) ? radioStations[playback.index] : null;
        if (station) {
          return {
            type: 'radio',
            title: station.name,
            albumSlug: null,
            trackSlug: null,
            artist: null,
            stationSlug: slugify(station.name)
          };
        }
      }

      return null;
    }

    function trySharedTrackPlayback(albumSlug, trackSlug) {
      const albumIndex = albums.findIndex(a => slugify(a.name) === albumSlug);
      if (albumIndex === -1) return false;

      const album = albums[albumIndex];
      const trackIndex = album.tracks.findIndex(t => slugify(t.title) === trackSlug);
      if (trackIndex === -1) return false;

      currentAlbumIndex = albumIndex;
      updateTrackListModal();
      selectTrack(album.tracks[trackIndex].src, album.tracks[trackIndex].title, trackIndex);
      pendingSharedPlayback = null;
      return true;
    }

    /* SHARE BUTTON (Web Share API) */
    async function shareContent() {
      const shareTarget = normalizeShareTargetPath(window.location.href);
      shareTarget.search = '';

      const playbackContext = deriveActivePlaybackContext();
      const defaultTitle = "Àríyò AI - Smart Naija AI";
      let shareInfo = formatMusicSharePayload(defaultTitle, null, ensureHttps(shareTarget.toString()));

      if (playbackContext && playbackContext.type === 'track') {
        shareTarget.searchParams.set('album', playbackContext.albumSlug);
        shareTarget.searchParams.set('track', playbackContext.trackSlug);
        shareInfo = formatMusicSharePayload(
          playbackContext.title,
          playbackContext.artist,
          shareTarget.toString()
        );
      } else if (playbackContext && playbackContext.type === 'radio') {
        shareTarget.searchParams.set('station', playbackContext.stationSlug);
        shareTarget.searchParams.delete('album');
        shareTarget.searchParams.delete('track');
        shareInfo = formatMusicSharePayload(playbackContext.title, null, shareTarget.toString());
      }

      showQRCode(shareInfo.url, shareInfo.heading, shareInfo.qrText);

      const sharePayload = {
        title: shareInfo.heading,
        text: shareInfo.shareText,
        url: shareInfo.url
      };

      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareInfo.qrText)}`;

      if (navigator.canShare) {
        try {
          const response = await fetch(qrCodeUrl);
          const blob = await response.blob();
          const file = new File([blob], 'qr-code.png', { type: 'image/png' });

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ ...sharePayload, files: [file] });
            return;
          }
        } catch (err) {
          console.error('QR share failed:', err);
        }
      }

      if (navigator.share) {
        navigator.share(sharePayload).catch((err) => console.error("Share failed:", err));
      } else {
        alert("This browser keeps sharing simple—copy the link and keep the vibe moving.");
      }
    }

    function showQRCode(url, heading, text) {
      const modal = document.getElementById('qrModal');
      const img = document.getElementById('qrImage');
      const trackName = document.getElementById('qrTrackName');
      const shareDetails = document.getElementById('qrShareDetails');
      const safeHeading = heading || 'Àríyò AI';
      const safeUrl = ensureHttps(url);
      const formattedText = text || `**${safeHeading}**\n${safeUrl}`;
      trackName.innerHTML = `<strong>${safeHeading}</strong>`;

      if (shareDetails) {
        shareDetails.innerHTML = `
          <p class="qr-share-heading"><strong>${safeHeading}</strong></p>
          <p class="qr-share-links"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a></p>
        `;
      }

      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(formattedText)}`;
      modal.classList.add('active');
    }

    function closeQRModal() {
      const modal = document.getElementById('qrModal');
      modal.classList.remove('active');
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
    let aboutButtonGlobal = null;
    let originalAboutButtonText = '';
    let originalAboutButtonOnClick;
    let currentVersion;
    let pendingReloadVersion = null;
    let shouldReloadOnControllerChange = false;
    let reloadFallbackTimeoutId = null;

    const cancelPendingReloadFallback = () => {
      if (reloadFallbackTimeoutId) {
        clearTimeout(reloadFallbackTimeoutId);
        reloadFallbackTimeoutId = null;
      }
    };

    const ensureAboutButtonReference = () => {
      if (aboutButtonGlobal) {
        return;
      }

      const sidebarButtons = document.querySelectorAll('.sidebar button');
      aboutButtonGlobal = Array.from(sidebarButtons).find(btn => btn.textContent.includes('About Us'));
      if (aboutButtonGlobal) {
        originalAboutButtonText = aboutButtonGlobal.textContent;
        originalAboutButtonOnClick = aboutButtonGlobal.onclick;
      }
    };

    const scheduleAppReload = (version) => {
      const normalizedVersion = version || 'immediate';
      if (pendingReloadVersion === normalizedVersion) {
        return;
      }

      pendingReloadVersion = normalizedVersion;

      if (!('serviceWorker' in navigator)) {
        window.location.reload();
        return;
      }

      shouldReloadOnControllerChange = true;
      cancelPendingReloadFallback();

      const swVersionSuffix = version ? `?v=${encodeURIComponent(version)}` : '';
      navigator.serviceWorker.register(`/service-worker.js${swVersionSuffix}`).then(registration => {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(reg => {
            if (registration && reg.scope !== registration.scope) {
              reg.unregister();
              return;
            }
            reg.update().catch(err => console.error('Service worker update failed:', err));
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }).catch(error => {
          console.error('Failed to enumerate service worker registrations:', error);
        });
      }).catch(error => {
        console.error('Service worker re-registration failed during update scheduling:', error);
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(reg => {
            reg.update().catch(err => console.error('Service worker update failed:', err));
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }).catch(listError => {
          console.error('Failed to enumerate service worker registrations after registration error:', listError);
        });
      });

      reloadFallbackTimeoutId = setTimeout(() => {
        if (shouldReloadOnControllerChange) {
          window.location.reload();
        }
      }, 10000);
    };

    let aboutViewActive = false;

    function ensureHomeViewForSharedPlayback() {
      if (typeof closeAboutModal === 'function') {
        closeAboutModal();
      }
      aboutViewActive = false;

      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.classList.remove('about-us-active');
        mainContent.style.opacity = '1';
      }

      const currentPath = window.location.pathname;
      if (currentPath.endsWith('/about.html')) {
        const normalizedPath = currentPath.replace(/about\.html$/, '') || '/';
        history.replaceState({ page: 'home' }, 'Home', normalizedPath + window.location.search);
      }
    }

    function navigateToAbout(pushState = true) {
      ensureAboutButtonReference();
      const mainContent = document.getElementById('main-content');

      savePlayerState();

      let modalOpened = false;
      if (typeof openAboutModal === 'function') {
        openAboutModal();
        modalOpened = true;
      }

      if (!modalOpened) {
        window.location.href = 'about.html';
        return;
      }

      if (pushState && window.location.pathname !== '/about.html') {
        history.pushState({ page: 'about' }, 'About Us', 'about.html');
      }

      if (aboutButtonGlobal) {
        aboutButtonGlobal.textContent = '🎵 Back to Player';
        aboutButtonGlobal.onclick = () => navigateToHome();
      }

      if (mainContent) {
        mainContent.classList.add('about-us-active');
        mainContent.style.opacity = '1';
      }

      aboutViewActive = true;
    }

    function navigateToHome(pushState = true) {
      ensureAboutButtonReference();
      const mainContent = document.getElementById('main-content');

      if (!aboutViewActive) {
        if (pushState && window.location.pathname.endsWith('/about.html')) {
          const basePath = window.location.pathname.replace(/about\.html$/, '');
          history.replaceState({ page: 'home' }, 'Home', basePath || '/');
        }
        return;
      }

      if (typeof closeAboutModal === 'function') {
        closeAboutModal();
      }

      if (aboutButtonGlobal && originalAboutButtonText) {
        aboutButtonGlobal.textContent = originalAboutButtonText;
        if (typeof originalAboutButtonOnClick === 'function') {
          aboutButtonGlobal.onclick = originalAboutButtonOnClick;
        } else {
          aboutButtonGlobal.onclick = null;
        }
      }

      if (pushState) {
        let currentPath = window.location.pathname;
        if (currentPath.endsWith('/about.html')) {
          currentPath = currentPath.substring(0, currentPath.length - 'about.html'.length);
        }
        if (!currentPath) {
          currentPath = '/';
        }
        history.replaceState({ page: 'home' }, 'Home', currentPath);
      }

      if (mainContent) {
        mainContent.classList.remove('about-us-active');
        if (window.gsap) {
          window.gsap.to(mainContent, { opacity: 1, duration: 0.5 });
        } else {
          mainContent.style.opacity = '1';
        }
      }

      if (typeof updateEdgePanelHeight === 'function') {
        requestAnimationFrame(updateEdgePanelHeight);
      }

      aboutViewActive = false;
    }

    window.navigateToAbout = navigateToAbout;
    window.navigateToHome = navigateToHome;

    /* BACKGROUND CYCLER */
    const backgrounds = [
      'Naija AI1.png',
      'Naija AI2.png',
      'Naija AI3.png'
    ];

    // Preload background images to prevent flashing
    const preloadedBackgrounds = backgrounds.map(src => {
      const img = new Image();
      img.src = src;
      return img;
    });

    let currentBgIndex = 0;
    document.body.style.backgroundImage = `url('${backgrounds[currentBgIndex]}')`;

    const changeBackground = () => {
      const nextIndex = (currentBgIndex + 1) % backgrounds.length;
      const nextImage = preloadedBackgrounds[nextIndex];

      const applyBackground = () => {
        document.body.style.backgroundImage = `url('${backgrounds[nextIndex]}')`;
        currentBgIndex = nextIndex;
      };

      if (nextImage.complete) {
        applyBackground();
      } else {
        nextImage.onload = applyBackground;
      }
    };

    setInterval(changeBackground, 30000);

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
          artist: currentRadioIndex === -1
            ? (typeof deriveTrackArtist === 'function'
              ? deriveTrackArtist(albums[currentAlbumIndex].artist, track.title)
              : (albums[currentAlbumIndex].artist || 'Omoluabi'))
            : '',
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
      const stationParam = params.get('station');
      const albumParam = params.get('album');
      const trackParam = params.get('track');
      if (stationParam) {
        ensureHomeViewForSharedPlayback();
        const stationIndex = radioStations.findIndex(s => slugify(s.name) === stationParam);
        if (stationIndex !== -1) {
          const station = radioStations[stationIndex];
          selectRadio(
            station.url,
            `${station.name} - ${station.location}`,
            stationIndex,
            station.logo
          );
          return;
        }
      }
      if (albumParam && trackParam) {
        ensureHomeViewForSharedPlayback();
        const foundTrack = trySharedTrackPlayback(albumParam, trackParam);
        if (foundTrack) return;

        pendingSharedPlayback = { albumSlug: albumParam, trackSlug: trackParam };
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
          setCrossOrigin(audioPlayer, station.url);
          audioHealer.trackSource(station.url, station.name, { live: true });
          trackInfo.textContent = `${station.name} - ${station.location}`;
          trackArtist.textContent = '';
          trackYear.textContent = '';
          trackAlbum.textContent = 'Radio Stream'; // Clear album for radio
          handleAudioLoad(station.url, `${station.name} - ${station.location}`, true, {
            autoPlay: false,
            resumeTime: savedState.playbackPosition,
            onReady: () => {
              updateTrackTime();
              manageVinylRotation();
            }
          });
        } else {
          albumCover.src = albums[currentAlbumIndex].cover;
          const track = albums[currentAlbumIndex].tracks[currentTrackIndex];
          applyTrackUiState(currentAlbumIndex, currentTrackIndex);
          const streamUrl = buildTrackFetchUrl(track.src);
          setCrossOrigin(audioPlayer, streamUrl);
          audioHealer.trackSource(streamUrl, track.title, { live: false });
          handleAudioLoad(streamUrl, track.title, false, {
            autoPlay: false,
            resumeTime: savedState.playbackPosition,
            onReady: () => {
              updateTrackTime();
              manageVinylRotation();
            },
            onError: () => {
              audioPlayer.src = streamUrl;
            }
          });
        }
        updateTrackListModal();
        const controls = document.querySelector(".music-controls.icons-only");
        // Updated section for shuffle button text:
        const shuffleBtn = controls.querySelector("button[aria-label='Toggle shuffle']");
        const shuffleStatusInfo = document.getElementById('shuffleStatusInfo');

        shuffleMode = savedState.shuffleMode;
        shuffleScope = savedState.shuffleScope;

        if (shuffleScope === 'repeat') {
          shuffleMode = false;
          shuffleBtn.innerHTML = '🔂 <span class="shuffle-indicator">1</span>';
          shuffleStatusInfo.textContent = 'Repeat: On (Single Track)';
        } else if (shuffleScope === 'album') {
          shuffleBtn.innerHTML = '🔀 <span class="shuffle-indicator">2</span>';
          shuffleStatusInfo.textContent = 'Shuffle: On (Album)';
        } else if (shuffleScope === 'all') {
          shuffleBtn.innerHTML = '🔀 <span class="shuffle-indicator">3</span>';
          shuffleStatusInfo.textContent = 'Shuffle: On (All Tracks)';
        } else { // off
          shuffleBtn.innerHTML = '🔀';
          shuffleStatusInfo.textContent = 'Shuffle: Off';
        }
        buildShuffleQueue();
        console.log('Player restored from saved state:', savedState);
      } else {
        // Default state for a new session if no saved state
        shuffleScope = 'off';
        shuffleMode = false;
        document.getElementById('shuffleStatusInfo').textContent = 'Shuffle: Off';
        document.querySelector(".music-controls.icons-only button[aria-label='Toggle shuffle']").innerHTML = '🔀';
        buildShuffleQueue();
        selectAlbum(0);
        console.log('No saved state found, initialized with default');
      }
      updateMediaSession();
    }

    // GSAP Sidebar Button Animations
    document.querySelectorAll('.sidebar button').forEach(button => {
      button.addEventListener('mouseenter', () => {
        if (window.gsap) {
          window.gsap.to(button, { scale: 1.08, duration: 0.3, ease: "power2.out" });
        }
      });
      button.addEventListener('mouseleave', () => {
        if (window.gsap) {
          window.gsap.to(button, { scale: 1, duration: 0.3, ease: "power2.out" });
        }
      });
      button.addEventListener('click', () => {
        if (window.gsap) {
          window.gsap.to(button, {
            scale: 0.95,
            duration: 0.1,
            ease: "power1.in",
            onComplete: () => window.gsap.to(button, { scale: 1, duration: 0.2, ease: "bounce.out" })
          });
        }
      });
    });

    document.addEventListener('podcastHydrated', event => {
      if (!pendingSharedPlayback) return;

      const hydratedAlbumSlug = slugify(event.detail?.albumName || '');
      if (hydratedAlbumSlug && hydratedAlbumSlug === pendingSharedPlayback.albumSlug) {
        trySharedTrackPlayback(pendingSharedPlayback.albumSlug, pendingSharedPlayback.trackSlug);
      }
    });

    // Initialize player
    initializePlayer();

    // Save state before unloading
    window.addEventListener('beforeunload', savePlayerState);

    // PWA Install Prompt
    if ('serviceWorker' in navigator) {
      // Reload the page when a new service worker activates
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing || !shouldReloadOnControllerChange) {
          return;
        }
        refreshing = true;
        cancelPendingReloadFallback();
        window.location.reload();
      });
      navigator.serviceWorker.addEventListener('message', event => {
        if (!event.data || event.data.type !== 'SERVICE_WORKER_UPDATED') {
          return;
        }
        scheduleAppReload(event.data.version || null);
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
        const swUrl = version ? `/service-worker.js?v=${encodeURIComponent(version)}` : '/service-worker.js';
        navigator.serviceWorker.register(swUrl).then(function(registration) {
          console.log('Service Worker registered with scope:', registration.scope);
          navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(reg => {
              if (reg.scope !== registration.scope) {
                reg.unregister();
              }
            });
          });
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
      if (event.state && event.state.page === 'about') {
        navigateToAbout(false);
        return;
      }

      if (window.location.pathname.endsWith('/about.html')) {
        navigateToAbout(false);
      } else {
        navigateToHome(false);
      }
    });
    // Dynamic Edge Panel Height
    const rootElement = document.documentElement;
    const mainEdgePanel = document.getElementById('edgePanel');
    const mainEdgePanelContent = document.querySelector('.edge-panel-content');
    const musicPlayerElement = document.querySelector('.music-player');

    const BASE_EDGE_PANEL_APPS_VISIBLE = 4;
    const EDGE_PANEL_MIN_HEIGHT = 480;

    const updateEdgePanelHeight = () => {
        if (!mainEdgePanel || !mainEdgePanelContent) return;

        const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const computedRoot = getComputedStyle(rootElement);
        const topOffset = parseFloat(computedRoot.getPropertyValue('--edge-panel-top-offset')) || 24;
        const isCompactLayout = window.matchMedia('(max-width: 900px)').matches;
        if (!isCompactLayout) {
            mainEdgePanelContent.style.paddingBottom = '';
        }

        if (isCompactLayout) {
            const measuredPlayerHeight = Math.ceil(musicPlayerElement?.getBoundingClientRect()?.height || 0);
            const guardTarget = Math.max(measuredPlayerHeight + 48, EDGE_PANEL_MIN_HEIGHT);
            const compactTop = Math.max(topOffset, 16);
            const maximumBottom = Math.max(viewportHeight - compactTop - EDGE_PANEL_MIN_HEIGHT, 0);
            const isVeryNarrowViewport = window.matchMedia('(max-width: 600px)').matches;
            const relaxedGuard = isVeryNarrowViewport
                ? Math.max(Math.round(measuredPlayerHeight * 0.55) + 32, EDGE_PANEL_MIN_HEIGHT * 0.7)
                : guardTarget;
            const guardPreference = isVeryNarrowViewport
                ? Math.min(guardTarget, relaxedGuard)
                : guardTarget;
            const compactBottom = Math.max(0, Math.min(guardPreference, maximumBottom));
            const compactMaxHeight = Math.max(viewportHeight - compactTop - compactBottom, EDGE_PANEL_MIN_HEIGHT);

            rootElement.style.setProperty('--edge-panel-bottom-guard', `${compactBottom}px`);
            rootElement.style.setProperty('--edge-panel-max-height', `${compactMaxHeight}px`);

            const rawCompactSpace = viewportHeight - compactTop - compactBottom;
            const compactHeightTarget = Math.max(rawCompactSpace, EDGE_PANEL_MIN_HEIGHT);
            const compactHeight = Math.max(Math.min(compactMaxHeight, compactHeightTarget), EDGE_PANEL_MIN_HEIGHT);
            const availableTopSpace = Math.max(viewportHeight - compactHeight, 0);
            const centeredTop = availableTopSpace / 2;
            const lowerBias = centeredTop + Math.max(0, compactHeight * 0.08);
            const maxTop = Math.max(viewportHeight - compactHeight - compactBottom, compactTop);
            const safeTop = Math.min(Math.max(compactTop, lowerBias), maxTop);
            const centerTarget = Math.min(Math.max(compactTop, centeredTop), maxTop);
            const blendedTop = isVeryNarrowViewport
                ? Math.min(Math.max(compactTop, (safeTop + centerTarget) / 2), maxTop)
                : safeTop;

            mainEdgePanel.style.height = '';
            mainEdgePanel.style.transform = 'none';
            mainEdgePanel.style.bottom = '';
            mainEdgePanel.style.top = `${Math.round(blendedTop)}px`;
            mainEdgePanelContent.style.maxHeight = '';
            mainEdgePanelContent.style.overflowY = 'auto';

            const privacyNote = mainEdgePanelContent.querySelector('.edge-panel-privacy');
            if (privacyNote) {
                const noteHeight = Math.ceil(privacyNote.getBoundingClientRect()?.height || 0);
                const extraGap = Math.max(noteHeight, 72);
                const currentPadding = parseFloat(window.getComputedStyle(mainEdgePanelContent).paddingBottom) || 0;
                if (extraGap > currentPadding) {
                    mainEdgePanelContent.style.paddingBottom = `${extraGap}px`;
                }
                const currentScrollPadding = parseFloat(window.getComputedStyle(mainEdgePanelContent).scrollPaddingBottom) || 0;
                const desiredScrollPadding = Math.max(Math.round(extraGap * 0.75), 64);
                if (desiredScrollPadding > currentScrollPadding) {
                    mainEdgePanelContent.style.scrollPaddingBottom = `${desiredScrollPadding}px`;
                }
            }
            return;
        }

        const verticalMargin = Math.max(topOffset, 24);
        const availableHeight = Math.max(viewportHeight - 2 * verticalMargin, EDGE_PANEL_MIN_HEIGHT);

        rootElement.style.setProperty('--edge-panel-bottom-guard', `${verticalMargin}px`);
        rootElement.style.setProperty('--edge-panel-max-height', `${availableHeight}px`);

        const contentStyles = window.getComputedStyle(mainEdgePanelContent);
        const paddingTop = parseFloat(contentStyles.paddingTop) || 0;
        const paddingBottom = parseFloat(contentStyles.paddingBottom) || 0;
        const gapValue = parseFloat(contentStyles.rowGap || contentStyles.gap || 0) || 0;
        const introEl = mainEdgePanelContent.querySelector('.edge-panel-intro');
        let introHeight = 0;
        let introMargins = 0;
        if (introEl) {
            const introRect = introEl.getBoundingClientRect();
            introHeight = introRect?.height || 0;
            const introStyles = window.getComputedStyle(introEl);
            introMargins = (parseFloat(introStyles.marginTop) || 0) + (parseFloat(introStyles.marginBottom) || 0);
        }

        const launcherItems = Array.from(mainEdgePanelContent.querySelectorAll('.edge-panel-item'));
        const totalLauncherCount = launcherItems.length;
        const visibleCount = Math.max(totalLauncherCount, BASE_EDGE_PANEL_APPS_VISIBLE);
        let launcherHeight = 0;
        if (launcherItems.length) {
            const itemRect = launcherItems[0].getBoundingClientRect();
            launcherHeight = itemRect?.height || 0;
            if (!launcherHeight) {
                const itemStyles = window.getComputedStyle(launcherItems[0]);
                launcherHeight = parseFloat(itemStyles.minHeight) || 56;
            }
        }
        if (!launcherHeight) {
            launcherHeight = 56;
        }

        const itemsHeight = visibleCount > 0
            ? (visibleCount * launcherHeight) + Math.max(0, visibleCount - 1) * gapValue
            : 0;
        const desiredContentHeight = paddingTop + paddingBottom + introHeight + introMargins + itemsHeight;
        const contentMaxHeight = Math.min(availableHeight, Math.max(desiredContentHeight, EDGE_PANEL_MIN_HEIGHT));

        mainEdgePanelContent.style.maxHeight = `${contentMaxHeight}px`;
        const needsScroll = mainEdgePanelContent.scrollHeight > contentMaxHeight + 1;
        mainEdgePanelContent.style.overflowY = needsScroll ? 'auto' : 'hidden';
        mainEdgePanelContent.style.scrollPaddingBottom = '';

        mainEdgePanel.style.height = '';
        mainEdgePanel.style.bottom = '';
        mainEdgePanel.style.top = '50%';
        mainEdgePanel.style.transform = 'translateY(-50%)';

        const panelRect = mainEdgePanel.getBoundingClientRect();
        const measuredHeight = panelRect.height || contentMaxHeight;
        const centeredTop = (viewportHeight - measuredHeight) / 2;
        const maxTop = viewportHeight - measuredHeight - verticalMargin;
        const safeTop = Math.max(verticalMargin, Math.min(centeredTop, maxTop));

        if (Number.isFinite(safeTop)) {
            mainEdgePanel.style.top = `${safeTop}px`;
            mainEdgePanel.style.transform = 'none';
        }
    };

    if (mainEdgePanel && mainEdgePanelContent) {
        updateEdgePanelHeight();
        requestAnimationFrame(updateEdgePanelHeight);
        window.addEventListener('resize', updateEdgePanelHeight);
        window.addEventListener('orientationchange', updateEdgePanelHeight);
        window.addEventListener('load', updateEdgePanelHeight);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateEdgePanelHeight);
        }
        if ('ResizeObserver' in window && musicPlayerElement) {
            const playerResizeObserver = new ResizeObserver(updateEdgePanelHeight);
            playerResizeObserver.observe(musicPlayerElement);
        }
    }

    const sidebarNav = document.getElementById('sidebarNavigation');
    if (sidebarNav) {
        sidebarNav.removeAttribute('aria-hidden');
        sidebarNav.removeAttribute('tabindex');
    }

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
                    scheduleAppReload(data.version);
                }
                currentVersion = data.version;
            })
            .catch(error => console.error('Error checking for updates:', error));
    }

    // Check for updates every 30 seconds for faster syncing
    setInterval(checkForUpdates, 30000);

    // Initial check
    checkForUpdates();
