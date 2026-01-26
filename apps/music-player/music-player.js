(() => {
  const resolveSunoAudioSrc = window.resolveSunoAudioSrc || (async src => src);
  const audioEngine = window.audioEngine;

  const albumCover = document.getElementById('albumCover');
  const turntableDisc = document.querySelector('.turntable-disc');
  const turntableGrooves = document.querySelector('.turntable-grooves');
  const turntableSheen = document.querySelector('.turntable-sheen');
  const albumGrooveOverlay = document.querySelector('.album-groove-overlay');
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
  const djToggle = document.getElementById('djToggle');
  const crossfadeDurationSelect = document.getElementById('crossfadeDuration');
  const crossfadeStatus = document.getElementById('crossfadeStatus');

  const SOURCE_RESOLVE_TIMEOUT_MS = 1200;
  const PROGRESS_UPDATE_FPS = 30;
  const MIN_SPIN_GRACE_MS = 450;

  if (!audioEngine) {
    statusMessage.textContent = 'Audio engine failed to initialize.';
    [playButton, pauseButton, stopButton, prevButton, nextButton].forEach(btn => btn.disabled = true);
    return;
  }

  const deriveTrackArtist = (baseArtist, trackTitle) => {
    const artistName = baseArtist || 'Omoluabi';
    if (!trackTitle) return artistName;

    const match = trackTitle.match(/ft\.?\s+(.+)/i);
    if (match && match[1]) {
      return `${artistName} ft. ${match[1].trim()}`;
    }

    return artistName;
  };

  const hasAlbums = typeof albums !== 'undefined' && Array.isArray(albums) && albums.length;
  if (!hasAlbums) {
    statusMessage.textContent = 'No tracks available. Please refresh the page.';
    shuffleButton.disabled = true;
    refreshButton.disabled = true;
    [playButton, pauseButton, stopButton, prevButton, nextButton].forEach(btn => btn.disabled = true);
    return;
  }

  const albumTrackMap = new Map();
  const trackDurationLabels = new Map();
  const allTracks = [];
  const fallbackCover = typeof NAIJA_HITS_COVER !== 'undefined' ? NAIJA_HITS_COVER : '../../Logo.jpg';

  albums.forEach((album, albumIndex) => {
    if (!album || !Array.isArray(album.tracks)) {
      return;
    }

    const artist = album.artist || 'Omoluabi';
    const releaseYear = typeof album.releaseYear !== 'undefined' ? album.releaseYear : null;
    const cover = album.cover || album.coverImage || fallbackCover;
    const albumName = album.name || album.title || `Album ${albumIndex + 1}`;
    const collectedTracks = [];

    album.tracks.forEach((track, trackIndex) => {
      if (!track) {
        return;
      }

      const trackSrc = track.src || track.url;
      if (!trackSrc) {
        return;
      }

      const title = track.title || `Track ${trackIndex + 1}`;
      const trackData = {
        title,
        src: trackSrc,
        cover,
        album: albumName,
        artist: deriveTrackArtist(track.artist || artist, title),
        releaseYear: typeof track.releaseYear !== 'undefined' ? track.releaseYear : releaseYear,
        albumIndex,
        albumTrackIndex: trackIndex,
        isLive: Boolean(track.isLive || track.sourceType === 'stream'),
        sourceType: track.sourceType || (track.isLive ? 'stream' : 'file'),
        duration: typeof track.duration === 'number' ? track.duration : null,
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

  const isLiveStreamTrack = track => Boolean(track && (track.isLive || track.sourceType === 'stream'));

  let playbackOrder = allTracks.map((_, index) => index);
  const baseOrder = [...playbackOrder];
  let currentOrderIndex = 0;
  let isShuffleEnabled = false;
  let userSeeking = false;
  let isLoading = false;
  let currentTrack = allTracks[playbackOrder[currentOrderIndex]];
  let currentDuration = currentTrack && currentTrack.duration ? currentTrack.duration : 0;
  let currentSourceId = null;
  let progressFrame = null;
  let pendingSeekValue = 0;
  let sourceRequestId = 0;
  let playIntent = false;
  let userPauseRequested = false;
  let spinGraceUntil = 0;
  let spinGraceTimeout = null;

  const formatTime = seconds => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  };

  const setStatus = message => {
    statusMessage.textContent = message;
  };

  const scheduleSpinGraceUpdate = () => {
    if (spinGraceTimeout) {
      window.clearTimeout(spinGraceTimeout);
      spinGraceTimeout = null;
    }
    const remaining = spinGraceUntil - Date.now();
    if (remaining > 0) {
      spinGraceTimeout = window.setTimeout(() => {
        spinGraceTimeout = null;
        updateSpinState();
      }, remaining);
    }
  };

  const showLoading = message => {
    isLoading = true;
    loadingSpinner.style.display = 'inline-block';
    setStatus(message);
    spinGraceUntil = Date.now() + MIN_SPIN_GRACE_MS;
    scheduleSpinGraceUpdate();
    updateSpinState();
  };

  const hideLoading = () => {
    isLoading = false;
    loadingSpinner.style.display = 'none';
    scheduleSpinGraceUpdate();
    updateSpinState();
  };

  const spinController = window.AriyoVinylSpinController;
  const applySpinState = spinController && spinController.updateVinylSpinState
    ? spinController.updateVinylSpinState
    : (elements, isSpinning, options = {}) => {
      const { spinClass = 'spin', activeClass = 'spinning' } = options;
      const list = Array.isArray(elements) ? elements : [elements];
      list.forEach(element => {
        if (!element) return;
        if (spinClass) {
          element.classList.toggle(spinClass, isSpinning);
        }
        if (activeClass) {
          element.classList.toggle(activeClass, isSpinning);
        }
        element.style.animationPlayState = isSpinning ? 'running' : 'paused';
      });
    };

  const vinylElements = [turntableDisc, turntableGrooves, turntableSheen, albumGrooveOverlay, albumCover];

  const updateVinylSpinState = isSpinning => {
    applySpinState(vinylElements, isSpinning, { spinClass: 'spin', activeClass: 'spinning' });
  };

  const updateSpinState = () => {
    const state = audioEngine.getState();
    const now = Date.now();
    const isSpinning = state === 'playing'
      || isLoading
      || now < spinGraceUntil
      || (playIntent && state !== 'error');
    updateVinylSpinState(isSpinning);
  };

  const updateNextTrackLabel = () => {
    if (!nextTrackInfo) return;
    if (playbackOrder.length <= 1) {
      nextTrackInfo.textContent = '';
      return;
    }
    const nextIndex = (currentOrderIndex + 1) % playbackOrder.length;
    const nextTrack = allTracks[playbackOrder[nextIndex]];
    nextTrackInfo.textContent = `Next: ${nextTrack.title}`;
  };

  const updatePlaylistHighlight = () => {
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
  };

  const updateTrackMetadata = track => {
    const isLive = isLiveStreamTrack(track);
    trackInfo.textContent = track.title;
    trackArtist.textContent = `Artist: ${track.artist}`;
    trackAlbum.textContent = `Album: ${track.album}`;
    trackYear.textContent = `Release Year: ${track.releaseYear || 'Unknown'}`;
    albumCover.src = track.cover || '../../Logo.jpg';
    progressBarFill.style.width = '0%';
    seekBar.value = 0;
    seekBar.disabled = isLive;
    seekBar.setAttribute('aria-disabled', String(isLive));
    trackDuration.textContent = isLive ? 'Live • Afrobeats' : '0:00 / 0:00';
    updatePlaylistHighlight();
    updateNextTrackLabel();
  };

  const updateProgressDisplay = (position, duration) => {
    if (audioEngine.isLive()) {
      trackDuration.textContent = 'Live • Afrobeats';
      progressBarFill.style.width = '0%';
      seekBar.value = 0;
      return;
    }
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
    const safePosition = Number.isFinite(position) ? Math.min(Math.max(position, 0), safeDuration || 0) : 0;
    const progressValue = safeDuration ? (safePosition / safeDuration) * 100 : 0;
    progressBarFill.style.width = `${progressValue}%`;
    seekBar.value = progressValue;
    trackDuration.textContent = `${formatTime(safePosition)} / ${formatTime(safeDuration)}`;
  };

  const startProgressLoop = () => {
    if (progressFrame) return;
    const frameDelay = 1000 / PROGRESS_UPDATE_FPS;

    const tick = () => {
      progressFrame = null;
      if (audioEngine.getState() !== 'playing') return;
      if (!userSeeking) {
        const position = audioEngine.seek();
        currentDuration = audioEngine.getDuration() || currentDuration;
        updateProgressDisplay(position, currentDuration);
      }
      progressFrame = window.setTimeout(tick, frameDelay);
    };

    progressFrame = window.setTimeout(tick, frameDelay);
  };

  const stopProgressLoop = () => {
    if (!progressFrame) return;
    window.clearTimeout(progressFrame);
    progressFrame = null;
  };

  const collapseAlbumGroup = group => {
    if (!group) return;
    group.classList.remove('is-open');
    const toggle = group.querySelector('.album-toggle');
    const list = group.querySelector('.album-track-list');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
    }
    if (list) {
      list.hidden = true;
      list.setAttribute('aria-hidden', 'true');
    }
  };

  const expandAlbumGroup = group => {
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
      list.setAttribute('aria-hidden', 'false');
    }
  };

  const renderPlaylist = () => {
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
      const safeYear = releaseYear || 'Unknown';
      meta.textContent = `${safeYear} • ${trackCount} track${trackCount === 1 ? '' : 's'}`;

      const durationLabel = document.createElement('span');
      durationLabel.className = 'album-duration';
      const totalDuration = tracks.every(track => Number.isFinite(track.duration))
        ? tracks.reduce((sum, track) => sum + track.duration, 0)
        : 0;
      if (totalDuration > 0) {
        durationLabel.textContent = ` • ${formatTime(totalDuration)}`;
      }
      meta.appendChild(durationLabel);

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
      trackList.setAttribute('aria-hidden', 'true');

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
        const trackLabel = isLiveStreamTrack(track)
          ? 'Live • Afrobeats'
          : `Track ${track.albumTrackIndex + 1}`;
        trackMeta.textContent = `${track.artist} • ${trackLabel}`;

        const trackDurationLabel = document.createElement('span');
        trackDurationLabel.className = 'album-track-duration';
        trackMeta.appendChild(trackDurationLabel);

        if (isLiveStreamTrack(track)) {
          trackDurationLabel.textContent = 'Live stream';
        } else if (Number.isFinite(track.duration)) {
          trackDurationLabel.textContent = formatTime(track.duration);
        } else {
          trackDurationLabel.textContent = '—';
          trackDurationLabels.set(track.src, trackDurationLabel);
        }

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

      toggle.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (albumGroup.classList.contains('is-open')) {
            collapseAlbumGroup(albumGroup);
          } else {
            expandAlbumGroup(albumGroup);
          }
        }
      });

      albumGroup.appendChild(toggle);
      albumGroup.appendChild(trackList);
      playlistElement.appendChild(albumGroup);
    });

    updatePlaylistHighlight();
  };

  const updatePlaybackOrder = newOrder => {
    const currentTrackId = playbackOrder[currentOrderIndex];
    playbackOrder = [...newOrder];
    currentOrderIndex = Math.max(0, playbackOrder.indexOf(currentTrackId));
    renderPlaylist();
    updateNextTrackLabel();
  };

  const shufflePlaybackOrder = () => {
    const shuffled = [...playbackOrder];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    updatePlaybackOrder(shuffled);
  };

  const handleLoadError = message => {
    spinGraceUntil = 0;
    hideLoading();
    setStatus(message);
    updateSpinState();
  };

  const resolveWithTimeout = (promise, timeoutMs) => new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('timeout'));
    }, timeoutMs);
    promise
      .then(value => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch(error => {
        window.clearTimeout(timer);
        reject(error);
      });
  });

  const loadTrack = async (orderIndex, { autoplay = false } = {}) => {
    const trackIndex = playbackOrder[orderIndex];
    const track = allTracks[trackIndex];
    if (!track) return;

    currentOrderIndex = orderIndex;
    currentTrack = track;
    currentDuration = track.duration || 0;
    updateTrackMetadata(track);

    const sourceRequest = ++sourceRequestId;
    if (autoplay) {
      playIntent = true;
    }
    userPauseRequested = false;
    showLoading(isLiveStreamTrack(track) ? 'Connecting to live stream…' : 'Loading track…');

    try {
      const resolvedSrc = await resolveWithTimeout(resolveSunoAudioSrc(track.src), SOURCE_RESOLVE_TIMEOUT_MS);
      if (sourceRequest !== sourceRequestId) return;

      currentSourceId = track.src;
      if (isLiveStreamTrack(track)) {
        audioEngine.loadStream({ id: track.globalIndex, url: resolvedSrc, title: track.title, region: track.album });
      } else {
        audioEngine.loadTrack({
          id: track.globalIndex,
          url: resolvedSrc,
          title: track.title,
          artist: track.artist,
          artwork: track.cover,
        });
      }

      if (autoplay) {
        audioEngine.play();
      }
    } catch (error) {
      console.warn('[player] source-resolve-failed', error);
      handleLoadError('We could not load this track right now.');
    }
  };

  const ensureTrackLoaded = async ({ autoplay = false } = {}) => {
    if (currentTrack && currentSourceId === currentTrack.src) {
      if (autoplay) {
        audioEngine.play();
      }
      return;
    }
    await loadTrack(currentOrderIndex, { autoplay });
  };

  const playCurrentTrack = async () => {
    if (!currentTrack) return;
    if (audioEngine.getState() === 'playing') return;
    playIntent = true;
    userPauseRequested = false;
    updateSpinState();
    await ensureTrackLoaded({ autoplay: true });
  };

  const stopPlayback = () => {
    playIntent = false;
    userPauseRequested = true;
    spinGraceUntil = 0;
    audioEngine.stop();
    updateProgressDisplay(0, currentDuration);
    hideLoading();
    setStatus('Playback stopped.');
  };

  const playNextTrack = async (autoAdvance = false) => {
    if (!playbackOrder.length) return;
    const nextIndex = (currentOrderIndex + 1) % playbackOrder.length;
    const shouldAutoplay = autoAdvance || audioEngine.getState() === 'playing';
    await loadTrack(nextIndex, { autoplay: shouldAutoplay });
  };

  const playPreviousTrack = async () => {
    if (!playbackOrder.length) return;
    const prevIndex = (currentOrderIndex - 1 + playbackOrder.length) % playbackOrder.length;
    const shouldAutoplay = audioEngine.getState() === 'playing';
    await loadTrack(prevIndex, { autoplay: shouldAutoplay });
  };

  const toggleShuffle = () => {
    isShuffleEnabled = !isShuffleEnabled;
    shuffleButton.setAttribute('aria-pressed', String(isShuffleEnabled));
    if (isShuffleEnabled) {
      setStatus('Shuffle enabled.');
      shufflePlaybackOrder();
    } else {
      setStatus('Shuffle disabled.');
      updatePlaybackOrder(baseOrder);
    }
  };

  const syncVolume = value => {
    audioEngine.setVolume(value);
  };

  const updateDjMixUi = () => {
    if (djToggle) {
      djToggle.checked = false;
      djToggle.disabled = true;
    }
    if (crossfadeDurationSelect) {
      crossfadeDurationSelect.disabled = true;
    }
    if (crossfadeStatus) {
      crossfadeStatus.textContent = 'DJ Mix off';
    }
  };

  playButton.addEventListener('click', playCurrentTrack);
  pauseButton.addEventListener('click', () => {
    playIntent = false;
    userPauseRequested = true;
    spinGraceUntil = 0;
    audioEngine.pause();
  });
  stopButton.addEventListener('click', stopPlayback);
  prevButton.addEventListener('click', playPreviousTrack);
  nextButton.addEventListener('click', () => playNextTrack(false));
  shuffleButton.addEventListener('click', toggleShuffle);
  refreshButton.addEventListener('click', shufflePlaybackOrder);

  volumeControl.addEventListener('input', event => {
    const value = Number(event.target.value);
    syncVolume(Number.isFinite(value) ? value : 1);
  });

  seekBar.addEventListener('input', event => {
    if (audioEngine.isLive()) return;
    userSeeking = true;
    const value = Number(event.target.value) || 0;
    const duration = currentDuration || audioEngine.getDuration();
    pendingSeekValue = duration ? (value / 100) * duration : 0;
    updateProgressDisplay(pendingSeekValue, duration);
  });

  seekBar.addEventListener('change', () => {
    if (audioEngine.isLive()) return;
    audioEngine.seek(pendingSeekValue);
    userSeeking = false;
  });

  window.addEventListener('audioengine:state', event => {
    const { state } = event.detail;
    if (state === 'loading') {
      if (!isLoading) {
        showLoading('Connecting…');
      }
      return;
    }

    if (state === 'playing') {
      hideLoading();
      setStatus(`Now playing: ${currentTrack ? currentTrack.title : ''}`.trim());
      startProgressLoop();
      playIntent = true;
      userPauseRequested = false;
      updateSpinState();
      return;
    }

    if (state === 'paused') {
      const wasUserPause = userPauseRequested;
      if (wasUserPause) {
        playIntent = false;
      }
      userPauseRequested = false;
      hideLoading();
      stopProgressLoop();
      updateSpinState();
      if (!audioEngine.isLive()) {
        updateProgressDisplay(audioEngine.seek(), audioEngine.getDuration() || currentDuration);
      }
      setStatus(wasUserPause ? 'Playback paused.' : 'Ready to play.');
      return;
    }

    if (state === 'idle') {
      hideLoading();
      stopProgressLoop();
      updateSpinState();
      return;
    }

    if (state === 'error') {
      stopProgressLoop();
      handleLoadError('Playback error. Tap play to retry.');
    }
  });

  window.addEventListener('audioengine:loaded', event => {
    if (audioEngine.isLive()) {
      currentDuration = 0;
      return;
    }
    const duration = Number(event.detail.duration);
    if (Number.isFinite(duration) && duration > 0) {
      currentDuration = duration;
      updateProgressDisplay(audioEngine.seek(), currentDuration);
      if (currentTrack && trackDurationLabels.has(currentTrack.src)) {
        trackDurationLabels.get(currentTrack.src).textContent = formatTime(duration);
        trackDurationLabels.delete(currentTrack.src);
      }
    }
  });

  window.addEventListener('audioengine:ended', () => {
    stopProgressLoop();
    hideLoading();
    setStatus('Track finished. Loading next…');
    playNextTrack(true);
  });

  updateDjMixUi();
  renderPlaylist();
  updateTrackMetadata(currentTrack);
  updateNextTrackLabel();
  syncVolume(Number(volumeControl.value || 1));
})();
