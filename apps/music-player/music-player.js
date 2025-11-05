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

  const albumTrackMap = new Map();
  const allTracks = [];

  albums.forEach((album, albumIndex) => {
    if (!album || !Array.isArray(album.tracks)) {
      return;
    }

    const artist = album.artist || 'Omoluabi';
    const releaseYear = typeof album.releaseYear !== 'undefined' ? album.releaseYear : '2025';
    const cover = album.cover || '../../Logo.jpg';
    const albumName = album.name || `Album ${albumIndex + 1}`;
    const collectedTracks = [];

    album.tracks.forEach((track, trackIndex) => {
      if (!track || !track.src) {
        return;
      }

      const title = track.title || `Track ${trackIndex + 1}`;
      const trackData = {
        title,
        src: track.src,
        cover,
        album: albumName,
        artist,
        releaseYear,
        albumIndex,
        albumTrackIndex: trackIndex,
      };

      allTracks.push(trackData);
      collectedTracks.push(trackData);
    });

    if (collectedTracks.length) {
      albumTrackMap.set(albumIndex, collectedTracks);
    }
  });

  allTracks.forEach((track, index) => {
    track.globalIndex = index;
  });

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

  function collapseAlbumGroup(group) {
    if (!group) return;
    group.classList.remove('is-open');
    const toggle = group.querySelector('.album-toggle');
    const list = group.querySelector('.album-track-list');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
    }
    if (list) {
      list.hidden = true;
    }
  }

  function expandAlbumGroup(group) {
    if (!group) return;
    const groups = playlistElement.querySelectorAll('.album-group');
    groups.forEach(other => {
      if (other !== group) {
        collapseAlbumGroup(other);
      }
    });
    group.classList.add('is-open');
    const toggle = group.querySelector('.album-toggle');
    const list = group.querySelector('.album-track-list');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'true');
    }
    if (list) {
      list.hidden = false;
    }
  }

  function updatePlaylistHighlight() {
    const items = playlistElement.querySelectorAll('.album-track');
    let activeItem = null;
    items.forEach(item => {
      const orderIndex = Number(item.dataset.orderIndex);
      const isActive = orderIndex === currentOrderIndex;
      if (isActive) {
        item.setAttribute('aria-current', 'true');
        activeItem = item;
      } else {
        item.removeAttribute('aria-current');
      }
    });

    if (activeItem) {
      const group = activeItem.closest('.album-group');
      if (group) {
        expandAlbumGroup(group);
      }
      activeItem.scrollIntoView({ block: 'nearest' });
    }
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
    const orderLookup = new Map();
    playbackOrder.forEach((trackIndex, orderIndex) => {
      orderLookup.set(trackIndex, orderIndex);
    });

    albumTrackMap.forEach((tracks, albumIndex) => {
      if (!tracks || !tracks.length) {
        return;
      }

      const album = albums[albumIndex] || {};
      const albumGroup = document.createElement('li');
      albumGroup.className = 'album-group';
      albumGroup.dataset.albumIndex = albumIndex;

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'album-toggle';
      toggle.setAttribute('aria-expanded', 'false');

      const trackListId = `albumTracks-${albumIndex}`;
      toggle.setAttribute('aria-controls', trackListId);

      const thumb = document.createElement('img');
      thumb.className = 'album-thumb';
      thumb.src = tracks[0].cover || album.cover || '../../Logo.jpg';
      thumb.alt = `${tracks[0].album} cover art`;
      thumb.loading = 'lazy';
      thumb.decoding = 'async';
      thumb.onerror = () => {
        thumb.onerror = null;
        thumb.src = '../../Logo.jpg';
      };

      const textWrap = document.createElement('span');
      textWrap.className = 'album-toggle-text';

      const name = document.createElement('span');
      name.className = 'album-name';
      name.textContent = tracks[0].album;

      const meta = document.createElement('span');
      meta.className = 'album-meta';
      const releaseYear = (typeof album.releaseYear !== 'undefined' && album.releaseYear) ? album.releaseYear : tracks[0].releaseYear;
      const trackCount = tracks.length;
      const safeYear = releaseYear || '2025';
      meta.textContent = `${safeYear} • ${trackCount} track${trackCount === 1 ? '' : 's'}`;

      textWrap.appendChild(name);
      textWrap.appendChild(meta);

      const icon = document.createElement('span');
      icon.className = 'album-toggle-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '▾';

      toggle.appendChild(thumb);
      toggle.appendChild(textWrap);
      toggle.appendChild(icon);

      const trackList = document.createElement('ol');
      trackList.className = 'album-track-list';
      trackList.id = trackListId;
      trackList.hidden = true;
      trackList.setAttribute('role', 'list');

      tracks.forEach(track => {
        const orderIndex = orderLookup.get(track.globalIndex);
        if (typeof orderIndex !== 'number') {
          return;
        }

        const listItem = document.createElement('li');
        listItem.className = 'album-track';
        listItem.tabIndex = 0;
        listItem.dataset.orderIndex = orderIndex;

        const title = document.createElement('span');
        title.className = 'album-track-title';
        title.textContent = track.title;

        const trackMeta = document.createElement('span');
        trackMeta.className = 'album-track-meta';
        trackMeta.textContent = `${track.artist} • Track ${track.albumTrackIndex + 1}`;

        listItem.appendChild(title);
        listItem.appendChild(trackMeta);

        listItem.addEventListener('click', () => {
          loadTrack(orderIndex, { autoplay: true });
        });
        listItem.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            loadTrack(orderIndex, { autoplay: true });
          }
        });

        trackList.appendChild(listItem);
      });

      if (!trackList.children.length) {
        return;
      }

      toggle.addEventListener('click', () => {
        if (albumGroup.classList.contains('is-open')) {
          collapseAlbumGroup(albumGroup);
        } else {
          expandAlbumGroup(albumGroup);
        }
      });

      albumGroup.appendChild(toggle);
      albumGroup.appendChild(trackList);
      playlistElement.appendChild(albumGroup);
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
