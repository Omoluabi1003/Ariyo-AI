(function () {
  const audio = document.getElementById('audioPlayer');
  const albumCover = document.getElementById('albumCover');
  const turntableDisc = document.querySelector('.turntable-disc');
  const trackInfo = document.getElementById('trackInfo');
  const trackArtist = document.getElementById('trackArtist');
  const trackAlbum = document.getElementById('trackAlbum');
  const trackYear = document.getElementById('trackYear');
  const trackDuration = document.getElementById('trackDuration');
  const nextTrackInfo = document.getElementById('nextTrackInfo');
  const progressBarFill = document.getElementById('progressBarFill');
  const seekBar = document.getElementById('seekBar');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const statusMessage = document.getElementById('statusMessage');
  const playlistElement = document.getElementById('playlist');
  const playButton = document.getElementById('playButton');
  const pauseButton = document.getElementById('pauseButton');
  const stopButton = document.getElementById('stopButton');
  const prevButton = document.getElementById('prevButton');
  const nextButton = document.getElementById('nextButton');
  const shuffleButton = document.getElementById('shuffleButton');
  const refreshButton = document.getElementById('refreshButton');
  const volumeControl = document.getElementById('volumeControl');

  const hasAlbums = typeof albums !== 'undefined' && Array.isArray(albums) && albums.length;
  if (!hasAlbums) {
    statusMessage.textContent = 'No tracks available. Please refresh the page.';
    shuffleButton.disabled = true;
    refreshButton.disabled = true;
    [playButton, pauseButton, stopButton, prevButton, nextButton].forEach(btn => btn.disabled = true);
    return;
  }

  const allTracks = albums.flatMap((album, albumIndex) => {
    const artist = album.artist || 'Omoluabi';
    const releaseYear = typeof album.releaseYear !== 'undefined' ? album.releaseYear : '2025';
    const cover = album.cover || '../../Logo.jpg';
    return album.tracks.map((track, trackIndex) => ({
      title: track.title,
      src: track.src,
      cover,
      album: album.name,
      artist,
      releaseYear,
      albumIndex,
      trackIndex,
    }));
  }).filter(track => track && track.src);

  if (!allTracks.length) {
    statusMessage.textContent = 'No playable tracks were found.';
    return;
  }

  let playbackOrder = allTracks.map((_, index) => index);
  const baseOrder = [...playbackOrder];
  let currentOrderIndex = 0;
  let isShuffleEnabled = false;
  let userSeeking = false;

  const PREFETCH_AHEAD = 3;
  const PREFETCH_CACHE_LIMIT = 6;
  const prefetchCache = new Map();
  const prefetchOrder = [];

  function postPanelStatus(status, detail) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        source: 'edge-panel-app',
        panelId: 'musicPlayerContainer',
        status,
        detail: detail || null,
      }, '*');
    }
  }

  function formatTime(seconds) {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(seconds, 0) : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const secs = Math.floor(safeSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  }

  function setStatus(message, tone = 'info') {
    if (!statusMessage) return;
    statusMessage.textContent = message || '';
    statusMessage.dataset.tone = tone;
  }

  function setCrossOrigin(url, element = audio) {
    try {
      const { hostname } = new URL(url, window.location.href);
      const allowList = ['raw.githubusercontent.com', 'githubusercontent.com', 'zeno.fm', 'streamguys1.com', 'suno.ai'];
      if (allowList.some(host => hostname.endsWith(host))) {
        element.crossOrigin = 'anonymous';
      } else {
        element.removeAttribute('crossorigin');
      }
    } catch (_) {
      element.removeAttribute('crossorigin');
    }
  }

  function updateSpinState() {
    const shouldSpin = !audio.paused && !audio.ended && !audio.seeking;
    [turntableDisc, albumCover].forEach(element => {
      if (!element) return;
      element.classList.toggle('spin', shouldSpin);
    });
  }

  function updatePlaylistHighlight() {
    const items = playlistElement.querySelectorAll('.track-item');
    items.forEach(item => {
      const orderIndex = Number(item.dataset.orderIndex);
      const isActive = orderIndex === currentOrderIndex;
      const button = item.querySelector('.track-button');
      if (isActive) {
        item.setAttribute('aria-current', 'true');
        if (button) {
          button.setAttribute('aria-current', 'true');
        }
        const albumSection = item.closest('details');
        if (albumSection && !albumSection.open) {
          albumSection.open = true;
        }
        const target = button || item;
        target.scrollIntoView({ block: 'nearest' });
      } else {
        item.removeAttribute('aria-current');
        if (button) {
          button.removeAttribute('aria-current');
        }
      }
    });
  }

  function updateNextTrackLabel() {
    if (!nextTrackInfo) return;
    if (playbackOrder.length <= 1) {
      nextTrackInfo.textContent = '';
      return;
    }
    const nextIndex = (currentOrderIndex + 1) % playbackOrder.length;
    const nextTrack = allTracks[playbackOrder[nextIndex]];
    nextTrackInfo.textContent = `Next: ${nextTrack.title}`;
  }

  function cleanupPrefetch(url) {
    if (!url || !prefetchCache.has(url)) return;
    const element = prefetchCache.get(url);
    try {
      if (typeof element.pause === 'function') {
        element.pause();
      }
    } catch (_) {
      // Ignore pause errors for detached prefetch elements.
    }
    try {
      element.removeAttribute('src');
      element.load();
    } catch (_) {
      // Ignore load errors during cleanup.
    }
    prefetchCache.delete(url);
    const index = prefetchOrder.indexOf(url);
    if (index !== -1) {
      prefetchOrder.splice(index, 1);
    }
  }

  function prunePrefetchCache() {
    while (prefetchOrder.length > PREFETCH_CACHE_LIMIT) {
      const oldest = prefetchOrder.shift();
      if (!oldest) {
        break;
      }
      if (oldest === audio.dataset.trackSrc) {
        prefetchOrder.push(oldest);
        if (prefetchOrder.length <= PREFETCH_CACHE_LIMIT) {
          break;
        }
        continue;
      }
      cleanupPrefetch(oldest);
    }
  }

  function rememberPrefetch(url, element) {
    if (!url || prefetchCache.has(url)) return;
    prefetchCache.set(url, element);
    prefetchOrder.push(url);
    prunePrefetchCache();
  }

  function prefetchTrack(orderIndex) {
    if (!Number.isInteger(orderIndex) || playbackOrder.length <= 1) return;
    const track = allTracks[playbackOrder[orderIndex]];
    if (!track || prefetchCache.has(track.src) || track.src === audio.dataset.trackSrc) return;

    const prefetchAudio = new Audio();
    prefetchAudio.preload = 'auto';
    setCrossOrigin(track.src, prefetchAudio);
    prefetchAudio.src = track.src;

    const handleFailure = () => {
      cleanupPrefetch(track.src);
    };

    prefetchAudio.addEventListener('error', handleFailure, { once: true });

    try {
      prefetchAudio.load();
      rememberPrefetch(track.src, prefetchAudio);
    } catch (_) {
      handleFailure();
    }
  }

  function prefetchUpcomingTracks(orderIndex) {
    if (!playbackOrder.length) return;
    const maxAhead = Math.min(PREFETCH_AHEAD, playbackOrder.length - 1);
    for (let offset = 1; offset <= maxAhead; offset += 1) {
      const nextIndex = (orderIndex + offset) % playbackOrder.length;
      if (nextIndex === orderIndex) break;
      prefetchTrack(nextIndex);
    }
  }

  function renderPlaylist() {
    playlistElement.innerHTML = '';

    const trackLookup = new Map();
    playbackOrder.forEach((trackIndex, orderIndex) => {
      const track = allTracks[trackIndex];
      const key = `${track.albumIndex}:${track.trackIndex}`;
      trackLookup.set(key, { orderIndex, track });
    });

    albums.forEach((album, albumIndex) => {
      const albumTracks = (album.tracks || [])
        .map((_, trackIndex) => {
          const key = `${albumIndex}:${trackIndex}`;
          return trackLookup.get(key);
        })
        .filter(Boolean);

      if (!albumTracks.length) {
        return;
      }

      const albumItem = document.createElement('li');
      albumItem.className = 'album-group';

      const details = document.createElement('details');
      details.className = 'album-details';

      const isActiveAlbum = albumTracks.some(entry => entry.orderIndex === currentOrderIndex);
      if (isActiveAlbum) {
        details.open = true;
      }

      const summary = document.createElement('summary');
      summary.className = 'album-summary';

      const thumb = document.createElement('img');
      thumb.className = 'album-thumb';
      thumb.src = album.cover || '../../Logo.jpg';
      thumb.alt = `${album.name} album cover`;
      thumb.loading = 'lazy';

      const info = document.createElement('div');
      info.className = 'album-info';

      const title = document.createElement('p');
      title.className = 'album-title';
      title.textContent = album.name;

      const artist = album.artist || 'Omoluabi';
      const releaseYear = typeof album.releaseYear !== 'undefined' ? album.releaseYear : '2025';
      const meta = document.createElement('p');
      meta.className = 'album-meta';
      meta.textContent = `${artist} • ${releaseYear}`;

      info.appendChild(title);
      info.appendChild(meta);

      summary.appendChild(thumb);
      summary.appendChild(info);

      const trackList = document.createElement('ol');
      trackList.className = 'album-tracklist';

      albumTracks.forEach(({ orderIndex, track }) => {
        const trackItem = document.createElement('li');
        trackItem.className = 'track-item';
        trackItem.dataset.orderIndex = orderIndex;

        const trackButton = document.createElement('button');
        trackButton.type = 'button';
        trackButton.className = 'track-button';

        const trackNumber = document.createElement('span');
        trackNumber.className = 'track-number';
        trackNumber.textContent = String(track.trackIndex + 1).padStart(2, '0');

        const trackText = document.createElement('span');
        trackText.className = 'track-text';

        const trackTitle = document.createElement('span');
        trackTitle.className = 'track-title';
        trackTitle.textContent = track.title;

        const trackMeta = document.createElement('span');
        trackMeta.className = 'track-meta';
        trackMeta.textContent = track.artist;

        trackText.appendChild(trackTitle);
        trackText.appendChild(trackMeta);

        trackButton.appendChild(trackNumber);
        trackButton.appendChild(trackText);

        trackButton.addEventListener('click', () => {
          loadTrack(orderIndex, { autoplay: true });
        });

        trackItem.appendChild(trackButton);
        trackList.appendChild(trackItem);
      });

      details.appendChild(summary);
      details.appendChild(trackList);
      albumItem.appendChild(details);
      playlistElement.appendChild(albumItem);
    });

    updatePlaylistHighlight();
  }

  function updatePlaybackOrder(newOrder) {
    const currentTrackId = playbackOrder[currentOrderIndex];
    playbackOrder = [...newOrder];
    currentOrderIndex = Math.max(0, playbackOrder.indexOf(currentTrackId));
    renderPlaylist();
    updateNextTrackLabel();
    prefetchUpcomingTracks(currentOrderIndex);
  }

  function shufflePlaybackOrder() {
    const shuffled = [...playbackOrder];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    updatePlaybackOrder(shuffled);
  }

  function loadTrack(orderIndex, { autoplay = false } = {}) {
    currentOrderIndex = orderIndex;
    const track = allTracks[playbackOrder[currentOrderIndex]];
    if (!track) return;

    setStatus('Loading track…');
    loadingSpinner.style.display = 'block';
    progressBarFill.style.width = '0%';
    seekBar.value = 0;
    trackDuration.textContent = '0:00 / 0:00';

    trackInfo.textContent = track.title;
    trackArtist.textContent = `Artist: ${track.artist}`;
    trackAlbum.textContent = `Album: ${track.album}`;
    trackYear.textContent = `Release Year: ${track.releaseYear}`;
    albumCover.src = track.cover || '../../Logo.jpg';

    setCrossOrigin(track.src);
    audio.src = track.src;
    audio.dataset.trackSrc = track.src;
    audio.load();
    updatePlaylistHighlight();
    updateNextTrackLabel();
    postPanelStatus('loading', track.title);
    prefetchUpcomingTracks(currentOrderIndex);

    if (autoplay) {
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => {
          setStatus('Tap play to start listening.', 'warning');
          updateSpinState();
        });
      }
    }
  }

  function playCurrentTrack() {
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        setStatus('Playback blocked by your browser. Tap play again.', 'warning');
        updateSpinState();
      });
    }
  }

  function stopPlayback() {
    audio.pause();
    audio.currentTime = 0;
    updateSpinState();
    setStatus('Playback stopped.');
  }

  function playNextTrack(auto = false) {
    if (!playbackOrder.length) return;
    const wasPlaying = auto ? true : !audio.paused;
    currentOrderIndex = (currentOrderIndex + 1) % playbackOrder.length;
    loadTrack(currentOrderIndex, { autoplay: wasPlaying });
  }

  function playPreviousTrack() {
    if (!playbackOrder.length) return;
    const shouldAutoplay = !audio.paused;
    currentOrderIndex = (currentOrderIndex - 1 + playbackOrder.length) % playbackOrder.length;
    loadTrack(currentOrderIndex, { autoplay: shouldAutoplay });
  }

  function toggleShuffle() {
    isShuffleEnabled = !isShuffleEnabled;
    shuffleButton.setAttribute('aria-pressed', String(isShuffleEnabled));
    if (isShuffleEnabled) {
      setStatus('Shuffle enabled.');
      shufflePlaybackOrder();
    } else {
      setStatus('Shuffle disabled.');
      updatePlaybackOrder(baseOrder);
    }
  }

  playButton.addEventListener('click', playCurrentTrack);
  pauseButton.addEventListener('click', () => {
    audio.pause();
  });
  stopButton.addEventListener('click', stopPlayback);
  prevButton.addEventListener('click', playPreviousTrack);
  nextButton.addEventListener('click', () => playNextTrack(false));
  shuffleButton.addEventListener('click', toggleShuffle);
  refreshButton.addEventListener('click', shufflePlaybackOrder);

  volumeControl.addEventListener('input', event => {
    audio.volume = Number(event.target.value);
  });
  audio.volume = Number(volumeControl.value || 1);

  ['pointerdown', 'mousedown', 'touchstart'].forEach(eventName => {
    seekBar.addEventListener(eventName, () => {
      userSeeking = true;
    }, { passive: true });
  });

  ['pointerup', 'mouseup', 'touchend', 'touchcancel'].forEach(eventName => {
    seekBar.addEventListener(eventName, () => {
      userSeeking = false;
    }, { passive: true });
  });

  seekBar.addEventListener('input', event => {
    if (!audio.duration) return;
    const value = Number(event.target.value);
    const newTime = (value / 100) * audio.duration;
    trackDuration.textContent = `${formatTime(newTime)} / ${formatTime(audio.duration)}`;
    progressBarFill.style.width = `${value}%`;
  });

  seekBar.addEventListener('change', event => {
    if (!audio.duration) return;
    const value = Number(event.target.value);
    audio.currentTime = (value / 100) * audio.duration;
    userSeeking = false;
  });

  audio.addEventListener('loadedmetadata', () => {
    const total = audio.duration;
    trackDuration.textContent = `${formatTime(audio.currentTime)} / ${formatTime(total)}`;
    seekBar.value = 0;
    progressBarFill.style.width = '0%';
  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration || userSeeking) return;
    const current = audio.currentTime;
    const percent = (current / audio.duration) * 100;
    seekBar.value = percent;
    progressBarFill.style.width = `${percent}%`;
    trackDuration.textContent = `${formatTime(current)} / ${formatTime(audio.duration)}`;
  });

  audio.addEventListener('playing', () => {
    loadingSpinner.style.display = 'none';
    setStatus(`Now playing: ${trackInfo.textContent}`);
    updateSpinState();
    postPanelStatus('playing', trackInfo.textContent);
    cleanupPrefetch(audio.dataset.trackSrc);
  });

  audio.addEventListener('pause', () => {
    updateSpinState();
    if (audio.currentTime > 0 && audio.currentTime < audio.duration) {
      setStatus('Playback paused.');
      postPanelStatus('paused', trackInfo.textContent);
    }
  });

  audio.addEventListener('waiting', () => {
    loadingSpinner.style.display = 'block';
    setStatus('Buffering…', 'info');
  });

  audio.addEventListener('canplay', () => {
    loadingSpinner.style.display = 'none';
  });

  audio.addEventListener('ended', () => {
    updateSpinState();
    setStatus('Track finished. Loading next…');
    playNextTrack(true);
  });

  audio.addEventListener('error', () => {
    loadingSpinner.style.display = 'none';
    setStatus('Unable to play this track. Please try another one.', 'error');
    postPanelStatus('error', trackInfo.textContent);
    cleanupPrefetch(audio.dataset.trackSrc);
  });

  renderPlaylist();
  loadTrack(currentOrderIndex, { autoplay: false });
})();
