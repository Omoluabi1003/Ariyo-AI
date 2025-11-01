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
    const releaseYear = album.releaseYear || '—';
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

  function setCrossOrigin(url) {
    try {
      const { hostname } = new URL(url, window.location.href);
      const allowList = ['raw.githubusercontent.com', 'githubusercontent.com', 'zeno.fm', 'streamguys1.com', 'suno.ai'];
      if (allowList.some(host => hostname.endsWith(host))) {
        audio.crossOrigin = 'anonymous';
      } else {
        audio.removeAttribute('crossorigin');
      }
    } catch (_) {
      audio.removeAttribute('crossorigin');
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
    const items = playlistElement.querySelectorAll('li');
    items.forEach(item => {
      const orderIndex = Number(item.dataset.orderIndex);
      const isActive = orderIndex === currentOrderIndex;
      if (isActive) {
        item.setAttribute('aria-current', 'true');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.removeAttribute('aria-current');
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

  function renderPlaylist() {
    playlistElement.innerHTML = '';
    playbackOrder.forEach((trackIndex, orderIndex) => {
      const track = allTracks[trackIndex];
      const listItem = document.createElement('li');
      listItem.tabIndex = 0;
      listItem.dataset.orderIndex = orderIndex;

      const title = document.createElement('p');
      title.className = 'track-title';
      title.textContent = track.title;

      const meta = document.createElement('p');
      meta.className = 'track-meta';
      meta.textContent = `${track.album} • ${track.artist}`;

      listItem.appendChild(title);
      listItem.appendChild(meta);

      listItem.addEventListener('click', () => {
        loadTrack(orderIndex, { autoplay: true });
      });
      listItem.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          loadTrack(orderIndex, { autoplay: true });
        }
      });

      playlistElement.appendChild(listItem);
    });
    updatePlaylistHighlight();
  }

  function updatePlaybackOrder(newOrder) {
    const currentTrackId = playbackOrder[currentOrderIndex];
    playbackOrder = [...newOrder];
    currentOrderIndex = Math.max(0, playbackOrder.indexOf(currentTrackId));
    renderPlaylist();
    updateNextTrackLabel();
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
    audio.load();
    updatePlaylistHighlight();
    updateNextTrackLabel();
    postPanelStatus('loading', track.title);

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
  });

  renderPlaylist();
  loadTrack(currentOrderIndex, { autoplay: false });
})();
