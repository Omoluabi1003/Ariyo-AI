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

    // Add this to your main.js file
    document.addEventListener('DOMContentLoaded', function() {
        // Your other DOM-dependent code here
    });

