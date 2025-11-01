(function () {
  const audio = document.getElementById('audio');
  const artwork = document.getElementById('artwork');
  const trackTitle = document.getElementById('trackTitle');
  const trackArtist = document.getElementById('trackArtist');
  const elapsedTime = document.getElementById('elapsedTime');
  const totalTime = document.getElementById('totalTime');
  const seekBar = document.getElementById('seekBar');
  const volumeControl = document.getElementById('volumeControl');
  const playPauseButton = document.getElementById('playPauseButton');
  const prevButton = document.getElementById('prevButton');
  const nextButton = document.getElementById('nextButton');
  const shuffleButton = document.getElementById('shuffleButton');
  const refreshButton = document.getElementById('refreshButton');
  const playlistElement = document.getElementById('playlist');
  const statusMessage = document.getElementById('statusMessage');

  const tracks = [
    {
      title: 'A Very Good Bad Guy v3',
      artist: 'Omoluabi',
      src: '../../A%20Very%20Good%20Bad%20Guy%20v3.mp3',
      cover: '../../Kindness%20Cover%20Art.jpg',
      duration: 0,
    },
    {
      title: 'Algorithm Of Life',
      artist: 'Omoluabi',
      src: '../../Algorithm%20Of%20Life.mp3',
      cover: '../../Street_Sense_Album_Cover.jpg',
      duration: 0,
    },
    {
      title: 'Holy Vibes Only',
      artist: 'Omoluabi',
      src: '../../Holy%20Vibes%20Only.mp3',
      cover: '../../Naija%20AI4.png',
      duration: 0,
    },
    {
      title: 'Multi choice palava',
      artist: 'Omoluabi',
      src: '../../Multi%20choice%20palava.mp3',
      cover: '../../Naija%20AI6.png',
      duration: 0,
    },
    {
      title: 'Street Sense',
      artist: 'Omoluabi',
      src: '../../Street%20Sense.mp3',
      cover: '../../Street_Sense_Album_Cover.jpg',
      duration: 0,
    },
    {
      title: 'Working on myself',
      artist: 'Omoluabi',
      src: '../../Working%20on%20myself.mp3',
      cover: '../../Naija%20AI2.png',
      duration: 0,
    },
  ];

  let currentIndex = 0;
  let isShuffle = false;
  let shuffleOrder = [...Array(tracks.length).keys()];
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
    const secs = Math.floor(safeSeconds % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${secs}`;
  }

  function setStatus(message, tone = 'info') {
    statusMessage.textContent = message || '';
    statusMessage.dataset.tone = tone;
  }

  function updatePlayButton() {
    if (audio.paused) {
      playPauseButton.textContent = '▶️';
      playPauseButton.setAttribute('aria-label', 'Play track');
    } else {
      playPauseButton.textContent = '⏸';
      playPauseButton.setAttribute('aria-label', 'Pause track');
    }
  }

  function getCurrentTrack() {
    return tracks[shuffleOrder[currentIndex]];
  }

  function preloadDuration(track) {
    return new Promise(resolve => {
      if (track.duration && Number.isFinite(track.duration)) {
        resolve(track.duration);
        return;
      }

      const probe = new Audio();
      probe.preload = 'metadata';
      probe.src = track.src;
      probe.addEventListener('loadedmetadata', () => {
        track.duration = probe.duration;
        resolve(track.duration);
      }, { once: true });
      probe.addEventListener('error', () => resolve(0), { once: true });
    });
  }

  function updatePlaylistActive() {
    const items = playlistElement.querySelectorAll('.playlist-item');
    items.forEach((item, index) => {
      const isActive = index === currentIndex;
      item.classList.toggle('active', isActive);
      if (isActive) {
        item.setAttribute('aria-current', 'true');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.removeAttribute('aria-current');
      }
    });
  }

  function loadTrack(index, { autoplay = false } = {}) {
    currentIndex = index;
    const track = getCurrentTrack();
    audio.src = track.src;
    audio.load();
    artwork.src = track.cover || '../../Logo.jpg';
    artwork.alt = `${track.title} cover art`;
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist || 'Àríyò Collective';
    seekBar.value = 0;
    elapsedTime.textContent = '0:00';
    totalTime.textContent = track.duration ? formatTime(track.duration) : '0:00';
    setStatus('Loading track…');
    updatePlaylistActive();

    if (autoplay) {
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => {
          updatePlayButton();
          setStatus('Tap play to start listening.', 'warning');
        });
      }
    } else {
      updatePlayButton();
    }
  }

  function playCurrent() {
    const playPromise = audio.play();
    if (playPromise) {
      playPromise
        .then(() => {
          setStatus(`Now playing: ${trackTitle.textContent}`);
          updatePlayButton();
        })
        .catch(() => {
          setStatus('Playback was blocked by your browser. Tap play again.', 'warning');
          updatePlayButton();
        });
    }
  }

  function pausePlayback() {
    audio.pause();
    updatePlayButton();
    setStatus('Playback paused.');
  }

  function playNext() {
    const nextIndex = (currentIndex + 1) % shuffleOrder.length;
    loadTrack(nextIndex, { autoplay: true });
  }

  function playPrevious() {
    const prevIndex = (currentIndex - 1 + shuffleOrder.length) % shuffleOrder.length;
    loadTrack(prevIndex, { autoplay: true });
  }

  function shuffleOrderRandomly() {
    const currentTrackIndex = shuffleOrder[currentIndex];
    shuffleOrder = shuffleOrder
      .map(value => ({ value, sortKey: Math.random() }))
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(item => item.value);
    currentIndex = shuffleOrder.indexOf(currentTrackIndex);
    updatePlaylist();
    updatePlaylistActive();
  }

  function toggleShuffle() {
    isShuffle = !isShuffle;
    shuffleButton.setAttribute('aria-pressed', String(isShuffle));
    shuffleButton.textContent = isShuffle ? 'Shuffling' : 'Shuffle';

    const currentTrackIndex = shuffleOrder[currentIndex];
    if (isShuffle) {
      shuffleOrderRandomly();
      setStatus('Shuffle mode enabled.');
    } else {
      shuffleOrder = [...Array(tracks.length).keys()];
      currentIndex = shuffleOrder.indexOf(currentTrackIndex);
      updatePlaylist();
      updatePlaylistActive();
      setStatus('Shuffle disabled.');
    }
  }

  function updatePlaylist() {
    playlistElement.innerHTML = '';

    shuffleOrder.forEach((trackIndex, orderIndex) => {
      const track = tracks[trackIndex];
      const item = document.createElement('li');
      item.className = 'playlist-item';
      item.tabIndex = 0;

      const meta = document.createElement('div');
      meta.className = 'playlist-meta';

      const titleSpan = document.createElement('span');
      titleSpan.textContent = track.title;
      meta.appendChild(titleSpan);

      const artistSpan = document.createElement('span');
      artistSpan.textContent = track.artist;
      artistSpan.className = 'playlist-artist';
      meta.appendChild(artistSpan);

      const durationSpan = document.createElement('span');
      durationSpan.className = 'playlist-duration';
      durationSpan.textContent = track.duration ? formatTime(track.duration) : '…';

      item.appendChild(meta);
      item.appendChild(durationSpan);

      item.addEventListener('click', () => {
        if (orderIndex === currentIndex) {
          playCurrent();
        } else {
          loadTrack(orderIndex, { autoplay: true });
        }
      });

      item.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (orderIndex === currentIndex) {
            playCurrent();
          } else {
            loadTrack(orderIndex, { autoplay: true });
          }
        }
      });

      playlistElement.appendChild(item);

      preloadDuration(track).then(duration => {
        if (duration) {
          durationSpan.textContent = formatTime(duration);
        }
      });
    });
  }

  audio.addEventListener('loadedmetadata', () => {
    if (!Number.isFinite(audio.duration)) {
      totalTime.textContent = '0:00';
    } else {
      totalTime.textContent = formatTime(audio.duration);
    }
    setStatus(`Ready: ${trackTitle.textContent}`);
  });

  audio.addEventListener('timeupdate', () => {
    if (userSeeking) return;
    elapsedTime.textContent = formatTime(audio.currentTime);
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      const progress = (audio.currentTime / audio.duration) * 100;
      seekBar.value = progress;
    }
  });

  audio.addEventListener('ended', () => {
    playNext();
  });

  audio.addEventListener('play', updatePlayButton);
  audio.addEventListener('pause', updatePlayButton);

  audio.addEventListener('error', () => {
    setStatus('We could not load this file. Skipping to the next track.', 'error');
    playNext();
  });

  seekBar.addEventListener('input', event => {
    userSeeking = true;
    const value = Number(event.target.value);
    if (Number.isFinite(audio.duration)) {
      const newTime = (value / 100) * audio.duration;
      elapsedTime.textContent = formatTime(newTime);
    }
  });

  seekBar.addEventListener('change', event => {
    userSeeking = false;
    const value = Number(event.target.value);
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = (value / 100) * audio.duration;
    }
  });

  volumeControl.addEventListener('input', event => {
    audio.volume = Number(event.target.value);
  });

  playPauseButton.addEventListener('click', () => {
    if (audio.paused) {
      playCurrent();
    } else {
      pausePlayback();
    }
  });

  prevButton.addEventListener('click', playPrevious);
  nextButton.addEventListener('click', playNext);
  shuffleButton.addEventListener('click', toggleShuffle);
  refreshButton.addEventListener('click', () => {
    if (!isShuffle) {
      setStatus('Enable shuffle to randomise the queue.', 'info');
      shuffleButton.focus();
      return;
    }
    shuffleOrderRandomly();
    setStatus('Playlist order refreshed.');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && !audio.paused) {
      audio.pause();
      setStatus('Playback paused while hidden. Tap play to resume.');
    }
  });

  window.addEventListener('pageshow', () => {
    updatePlayButton();
  });

  window.addEventListener('error', event => {
    postPanelStatus('error', event.message || 'Unknown error');
  });

  function initialise() {
    updatePlaylist();
    loadTrack(0);
    audio.volume = 1;
    postPanelStatus('ready');
  }

  document.addEventListener('DOMContentLoaded', initialise);
})();
