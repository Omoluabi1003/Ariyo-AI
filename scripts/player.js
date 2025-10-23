/* MUSIC PLAYER LOGIC */
    const audioPlayer = new Audio();
    function setCrossOrigin(element, url) {
        try {
            const host = new URL(url, window.location.origin).hostname;
            const corsAllowedHosts = ['raw.githubusercontent.com', 'drive.google.com'];
            if (corsAllowedHosts.some(h => host.endsWith(h))) {
                element.crossOrigin = 'anonymous';
            } else {
                element.removeAttribute('crossorigin');
            }
        } catch (e) {
            element.removeAttribute('crossorigin');
        }
    }
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let isAudioContextResumed = false;

    function resumeAudioContext() {
        if (audioContext.state === 'suspended' && !isAudioContextResumed) {
            audioContext.resume().then(() => {
                isAudioContextResumed = true;
                console.log('AudioContext resumed successfully.');
            }).catch(err => console.error('AudioContext resume failed:', err));
        }
    }

    ['click', 'touchstart', 'keydown'].forEach(evt => {
        window.addEventListener(evt, resumeAudioContext, { once: true, passive: true });
    });

    audioPlayer.id = 'audioPlayer';
    audioPlayer.preload = 'auto';
    audioPlayer.volume = 1;
    audioPlayer.muted = false;
    audioPlayer.setAttribute('playsinline', '');
    audioPlayer.setAttribute('controlsList', 'nodownload');
    audioPlayer.addEventListener('contextmenu', e => e.preventDefault());
    document.body.appendChild(audioPlayer);
    const albumCover = document.getElementById('albumCover');
    const turntableDisc = document.querySelector('.turntable-disc');
    const trackInfo = document.getElementById('trackInfo');
    const trackArtist = document.getElementById('trackArtist');
    const trackYear = document.getElementById('trackYear');
    const trackAlbum = document.getElementById('trackAlbum'); // Added for album display
    const trackDuration = document.getElementById('trackDuration');
    const seekBar = document.getElementById('seekBar');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const retryButton = document.getElementById('retryButton');
    const progressBar = document.getElementById('progressBarFill');
const lyricsContainer = document.getElementById('lyrics');
let lyricLines = [];
let shuffleMode = false; // True if any shuffle is active
let shuffleScope = 'off'; // 'off', 'album', 'all', 'repeat'
let isFirstPlay = true;
let lastTrackSrc = '';
let lastTrackTitle = '';
let lastTrackIndex = 0;

    let currentAlbumIndex = 0;
    let currentTrackIndex = 0;
let currentRadioIndex = -1;
let shuffleQueue = [];
let pendingAlbumIndex = null; // Album selected from the modal but not yet playing

const networkRecoveryState = {
  active: false,
  intervalId: null,
  attemptFn: null,
  wasPlaying: false,
  resumeTime: 0,
  source: null
};

function cancelNetworkRecovery() {
  if (networkRecoveryState.intervalId) {
    clearInterval(networkRecoveryState.intervalId);
    networkRecoveryState.intervalId = null;
  }
  networkRecoveryState.active = false;
  networkRecoveryState.attemptFn = null;
  networkRecoveryState.source = null;
  networkRecoveryState.wasPlaying = false;
  networkRecoveryState.resumeTime = 0;
}

function captureCurrentSource() {
  if (!lastTrackSrc) return null;
  if (currentRadioIndex >= 0 && radioStations[currentRadioIndex]) {
    return {
      type: 'radio',
      index: currentRadioIndex,
      src: lastTrackSrc,
      title: lastTrackTitle
    };
  }
  if (
    currentAlbumIndex >= 0 &&
    albums[currentAlbumIndex] &&
    currentTrackIndex >= 0 &&
    albums[currentAlbumIndex].tracks[currentTrackIndex]
  ) {
    return {
      type: 'track',
      albumIndex: currentAlbumIndex,
      trackIndex: currentTrackIndex,
      src: lastTrackSrc,
      title: lastTrackTitle
    };
  }
  return null;
}

function finishNetworkRecovery() {
  if (networkRecoveryState.intervalId) {
    clearInterval(networkRecoveryState.intervalId);
    networkRecoveryState.intervalId = null;
  }
  networkRecoveryState.active = false;
  networkRecoveryState.attemptFn = null;
  networkRecoveryState.source = null;
  networkRecoveryState.wasPlaying = false;
  networkRecoveryState.resumeTime = 0;
}

function appendCacheBuster(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}reconnect=${Date.now()}`;
}

async function attemptNetworkResume() {
  const source = networkRecoveryState.source;
  if (!source) return false;

  return new Promise(async resolve => {
    let resolved = false;
    const resolveOnce = value => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    if (source.type === 'radio') {
      setCrossOrigin(audioPlayer, source.src);
      const reloadSrc = appendCacheBuster(source.src);
      audioPlayer.src = reloadSrc;
      audioPlayer.currentTime = 0;
      handleAudioLoad(reloadSrc, source.title, true, {
        silent: true,
        autoPlay: networkRecoveryState.wasPlaying,
        resumeTime: 0,
        onReady: () => resolveOnce(true),
        onError: () => resolveOnce(false)
      });
      return;
    }

    try {
      const album = albums[source.albumIndex];
      if (!album) return resolveOnce(false);
      const track = album.tracks[source.trackIndex];
      if (!track) return resolveOnce(false);

      const urlHost = new URL(track.src, window.location.origin).hostname;
      const isSunoHosted = urlHost.includes('suno');
      const fetchUrl = isSunoHosted ? track.src : `${track.src}?t=${Date.now()}`;
      const response = await fetch(fetchUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      audioPlayer.src = objectUrl;
      handleAudioLoad(objectUrl, track.title, false, {
        silent: true,
        autoPlay: networkRecoveryState.wasPlaying,
        resumeTime: networkRecoveryState.resumeTime,
        onReady: () => resolveOnce(true),
        onError: () => resolveOnce(false)
      });
    } catch (error) {
      console.error('Failed to fetch track during recovery:', error);
      resolveOnce(false);
    }
  });
}

function startNetworkRecovery(reason = 'network') {
  if (networkRecoveryState.active) return;

  const source = captureCurrentSource();
  if (!source) return;

  networkRecoveryState.active = true;
  networkRecoveryState.wasPlaying = !audioPlayer.paused && !audioPlayer.ended;
  networkRecoveryState.resumeTime = currentRadioIndex === -1 ? audioPlayer.currentTime || 0 : 0;
  networkRecoveryState.source = source;
  retryButton.style.display = 'none';
  loadingSpinner.style.display = 'none';
  document.getElementById('progressBar').style.display = 'none';
  console.log(`Starting network recovery due to: ${reason}`);

  const attemptReconnect = async () => {
    if (!networkRecoveryState.active) return;
    if (!navigator.onLine) {
      console.log('Waiting for network connection to return...');
      return;
    }

    const success = await attemptNetworkResume();
    if (success) {
      console.log('Network recovery successful.');
      finishNetworkRecovery();
    } else {
      console.log('Network recovery attempt failed, will retry.');
    }
  };

  networkRecoveryState.attemptFn = attemptReconnect;
  attemptReconnect();
  networkRecoveryState.intervalId = setInterval(attemptReconnect, 7000);
}

function savePlaylist() {
  localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(albums[playlistAlbumIndex].tracks));
}

function addTrackToPlaylistByIndex(albumIndex, trackIndex) {
  if (albumIndex === playlistAlbumIndex || trackIndex < 0) return;
  const track = albums[albumIndex].tracks[trackIndex];
  const playlist = albums[playlistAlbumIndex].tracks;
  if (!playlist.some(t => t.src === track.src)) {
    const trackToAdd = { ...track };
    if (!trackToAdd.lrc) {
      trackToAdd.lrc = trackToAdd.src.replace(/\.mp3$/, '.lrc');
    }
    playlist.push(trackToAdd);
    savePlaylist();
    alert('Track added to playlist!');
    if (pendingAlbumIndex === playlistAlbumIndex) {
      updateTrackListModal();
    }
  }
}

function addCurrentTrackToPlaylist() {
  addTrackToPlaylistByIndex(currentAlbumIndex, currentTrackIndex);
}

function removeTrackFromPlaylist(index) {
  const playlist = albums[playlistAlbumIndex].tracks;
  if (index >= 0 && index < playlist.length) {
    playlist.splice(index, 1);
    savePlaylist();
    if (currentAlbumIndex === playlistAlbumIndex) {
      if (index < currentTrackIndex) {
        currentTrackIndex--;
      } else if (index === currentTrackIndex) {
        stopMusic();
        currentTrackIndex = -1;
      }
    }
    updateTrackListModal();
  }
}

    function updateNextTrackInfo() {
      const nextInfo = document.getElementById('nextTrackInfo');
      if (shuffleMode && shuffleQueue.length > 0) {
        nextInfo.textContent = `Next: ${shuffleQueue[0].title}`;
      } else {
        nextInfo.textContent = '';
      }
    }

    function buildShuffleQueue() {
      shuffleQueue = [];
      if (!shuffleMode) {
        updateNextTrackInfo();
        return;
      }
      if (shuffleScope === 'all') {
        albums.forEach((album, albumIdx) => {
          album.tracks.forEach((track, trackIdx) => {
            if (!(albumIdx === currentAlbumIndex && trackIdx === currentTrackIndex)) {
              shuffleQueue.push({
                albumIndex: albumIdx,
                trackIndex: trackIdx,
                title: track.title,
                src: track.src
              });
            }
          });
        });
      } else if (shuffleScope === 'album') {
        albums[currentAlbumIndex].tracks.forEach((track, idx) => {
          if (idx !== currentTrackIndex) {
            shuffleQueue.push({
              albumIndex: currentAlbumIndex,
              trackIndex: idx,
              title: track.title,
              src: track.src
            });
          }
        });
      }
      for (let i = shuffleQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffleQueue[i], shuffleQueue[j]] = [shuffleQueue[j], shuffleQueue[i]];
      }
      updateNextTrackInfo();
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

    function loadLyrics(url) {
      lyricLines = [];
      lyricsContainer.innerHTML = '';
      if (!url) return;
      fetch(url)
        .then(res => res.text())
        .then(text => {
          try {
            const parser = new Lyric(text);
            lyricLines = parser.lines || [];
            lyricsContainer.innerHTML = lyricLines.map(l => `<p>${l.txt}</p>`).join('');
          } catch (e) {
            console.error('Lyric parse error:', e);
          }
        })
        .catch(() => {
          lyricsContainer.innerHTML = '';
        });
    }

    function highlightLyric(currentTime) {
      if (!lyricLines.length) return;
      const currentMs = currentTime * 1000;
      let active = 0;
      for (let i = 0; i < lyricLines.length; i++) {
        if (currentMs >= lyricLines[i].time) {
          active = i;
        } else {
          break;
        }
      }
      const lines = lyricsContainer.getElementsByTagName('p');
      for (let i = 0; i < lines.length; i++) {
        lines[i].classList.toggle('active', i === active);
      }
    }

    function toggleLyrics() {
      if (lyricsContainer.style.display === 'none' || !lyricsContainer.style.display) {
        lyricsContainer.style.display = 'block';
      } else {
        lyricsContainer.style.display = 'none';
      }
    }

    function updateTrackListModal() {
      const albumIndex = pendingAlbumIndex !== null ? pendingAlbumIndex : currentAlbumIndex;
      const trackListContainer = document.querySelector('.track-list');
      const trackModalTitle = document.getElementById('trackModalTitle');
      trackModalTitle.textContent = albums[albumIndex].name;
      trackListContainer.innerHTML = '';

      const banner = document.getElementById('latestTracksBanner');
      const bannerCopy = document.getElementById('latestTracksCopy');
      const bannerActions = document.getElementById('latestTracksActions');
      if (banner && bannerCopy && bannerActions) {
        bannerActions.innerHTML = '';
        if (Array.isArray(latestTracks) && latestTracks.length) {
          const albumName = albums[albumIndex].name;
          const albumHighlights = latestTracks.filter(track => track.albumName === albumName);
          const announcementList = (albumHighlights.length ? albumHighlights : latestTracks)
            .map(track => `“${track.title}”${albumHighlights.length ? '' : ` (${track.albumName})`}`)
            .join(', ');
          const intro = albumHighlights.length ? `New in ${albumName}` : 'Latest arrivals across Àríyò AI';
          bannerCopy.textContent = `${intro}: ${announcementList}. Tap a button below to play instantly.`;
          latestTracks.forEach(track => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'latest-track-button';
            button.textContent = `▶ Play “${track.title}”`;
            button.setAttribute('aria-label', `Play the latest track ${track.title}`);
            button.addEventListener('click', () => {
              const albumIdx = albums.findIndex(album => album.name === track.albumName);
              if (albumIdx === -1) {
                return;
              }
              const trackIdx = albums[albumIdx].tracks.findIndex(albumTrack => albumTrack.title === track.title && albumTrack.src === track.src);
              if (trackIdx === -1) {
                pendingAlbumIndex = albumIdx;
                currentAlbumIndex = albumIdx;
                updateTrackListModal();
                return;
              }
              currentAlbumIndex = albumIdx;
              pendingAlbumIndex = null;
              selectTrack(albums[albumIdx].tracks[trackIdx].src, albums[albumIdx].tracks[trackIdx].title, trackIdx);
            });
            bannerActions.appendChild(button);
          });
          banner.hidden = false;
        } else {
          banner.hidden = true;
          bannerCopy.textContent = '';
          bannerActions.innerHTML = '';
        }
      }

      // Build an array of track indices and shuffle them (except for playlist)
      let trackIndices = albums[albumIndex].tracks.map((_, i) => i);
      if (albumIndex !== playlistAlbumIndex) {
        for (let i = trackIndices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [trackIndices[i], trackIndices[j]] = [trackIndices[j], trackIndices[i]];
        }
      }

      trackIndices.forEach(index => {
        const track = albums[albumIndex].tracks[index];

        // Use cached duration if available, otherwise fetch it
        const displayDuration = track.duration ? ` (${formatTime(track.duration)})` : '';

        let titleSpan;
        if (albumIndex === playlistAlbumIndex) {
          const item = document.createElement('div');
          item.className = 'track-item';
          titleSpan = document.createElement('span');
          titleSpan.textContent = `${track.title}${displayDuration}`;
          item.appendChild(titleSpan);
          item.addEventListener('click', () => {
            currentAlbumIndex = albumIndex;
            pendingAlbumIndex = null;
            selectTrack(track.src, track.title, index);
          });
          const removeBtn = document.createElement('button');
          removeBtn.textContent = '✖';
          removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeTrackFromPlaylist(index);
          });
          item.appendChild(removeBtn);
          trackListContainer.appendChild(item);
        } else {
          const item = document.createElement('div');
          item.className = 'track-item';
          titleSpan = document.createElement('span');
          titleSpan.textContent = `${track.title}${displayDuration}`;
          item.appendChild(titleSpan);
          item.addEventListener('click', () => {
            currentAlbumIndex = albumIndex;
            pendingAlbumIndex = null;
            selectTrack(track.src, track.title, index);
          });
          const addBtn = document.createElement('button');
          addBtn.textContent = '➕';
          addBtn.setAttribute('aria-label', 'Add to playlist');
          addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addTrackToPlaylistByIndex(albumIndex, index);
          });
          item.appendChild(addBtn);
          trackListContainer.appendChild(item);
        }

        if (!track.duration) {
          const tempAudio = new Audio();
          tempAudio.preload = 'metadata';
          setCrossOrigin(tempAudio, track.src);
          tempAudio.src = track.src;
          tempAudio.addEventListener('loadedmetadata', () => {
            track.duration = tempAudio.duration;
            if (albumIndex === playlistAlbumIndex) {
              updateTrackListModal();
            } else if (titleSpan) {
              titleSpan.textContent = `${track.title} (${formatTime(track.duration)})`;
            }
          });
          tempAudio.addEventListener('error', () => {
            track.duration = 0;
            if (albumIndex === playlistAlbumIndex) {
              updateTrackListModal();
            } else if (titleSpan) {
              titleSpan.textContent = `${track.title} (N/A)`;
            }
          });
        }
      });
      console.log(`Track list updated for album: ${albums[albumIndex].name}`);
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
      return new Promise(resolve => {
        const testAudio = document.createElement('audio');
        let settled = false;

        const cleanup = () => {
          testAudio.removeEventListener('canplay', onCanPlay);
          testAudio.removeEventListener('error', onError);
          testAudio.src = '';
        };

        const onCanPlay = () => {
          if (!settled) {
            settled = true;
            cleanup();
            resolve('online');
          }
        };

        const onError = () => {
          if (!settled) {
            settled = true;
            cleanup();
            resolve('offline');
          }
        };

        setCrossOrigin(testAudio, url);
        testAudio.preload = 'auto';
        testAudio.addEventListener('canplay', onCanPlay, { once: true });
        testAudio.addEventListener('error', onError, { once: true });
        testAudio.src = url;
        testAudio.load();

        setTimeout(() => {
          if (!settled) {
            settled = true;
            cleanup();
            resolve('offline');
          }
        }, 10000); // fallback timeout
      });
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
    const globalIndex = radioStations.indexOf(station);
    stationLink.onclick = () => selectRadio(station.url, `${station.name} - ${station.location}`, globalIndex, station.logo);

    const statusSpan = document.createElement('span');
    statusSpan.style.marginLeft = '10px';
    statusSpan.textContent = ' (Checking...)';

    checkStreamStatus(station.url).then(status => {
        statusSpan.textContent = status === 'online' ? ' (Online)' : ' (Offline)';
        statusSpan.style.color = status === 'online' ? 'lightgreen' : 'red';
        if (status !== 'online') {
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
      pendingAlbumIndex = albumIndex;
      currentRadioIndex = -1;
      updateTrackListModal();
      openTrackList();
      document.getElementById('main-content').innerHTML = '';
    }

function selectTrack(src, title, index, rebuildQueue = true) {
      console.log(`[selectTrack] called with: src=${src}, title=${title}, index=${index}`);
      cancelNetworkRecovery();
      resumeAudioContext();
      console.log(`[selectTrack] Selecting track: ${title} from album: ${albums[currentAlbumIndex].name}`);
      currentTrackIndex = index;
      currentRadioIndex = -1;
      const params = new URLSearchParams(window.location.search);
      params.set('album', slugify(albums[currentAlbumIndex].name));
      params.set('track', slugify(title));
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
      lastTrackSrc = src;
      lastTrackTitle = title;
      lastTrackIndex = index;
      const urlHost = new URL(src, window.location.origin).hostname;
      const isSunoHosted = urlHost.includes('suno');
      setCrossOrigin(audioPlayer, src);
      trackInfo.textContent = title;
      trackArtist.textContent = `Artist: ${albums[currentAlbumIndex].artist || 'Omoluabi'}`;
      const year = albums[currentAlbumIndex].releaseYear || 2025;
      trackYear.textContent = `Release Year: ${year}`;
      trackAlbum.textContent = `Album: ${albums[currentAlbumIndex].name}`; // Display album name
      albumCover.src = albums[currentAlbumIndex].cover; // Ensure album cover updates
      loadLyrics(albums[currentAlbumIndex].tracks[currentTrackIndex].lrc);
      closeTrackList();
      loadingSpinner.style.display = 'block';
      albumCover.style.display = 'none';
      retryButton.style.display = 'none';
      document.getElementById('progressBar').style.display = 'block';
      progressBar.style.width = '0%';
      setTurntableSpin(false);
      const fetchUrl = isSunoHosted ? src : `${src}?t=${Date.now()}`;
      fetch(fetchUrl)
        .then(r => r.blob())
        .then(b => {
          const objectUrl = URL.createObjectURL(b);
          audioPlayer.src = objectUrl;
          audioPlayer.currentTime = 0;
          handleAudioLoad(objectUrl, title, false);
          updateMediaSession();
          showNowPlayingToast(title);
          if (shuffleMode && rebuildQueue) {
            buildShuffleQueue();
          }
        })
        .catch(err => {
          console.error('Error fetching track:', err);
          retryButton.style.display = 'block';
          loadingSpinner.style.display = 'none';
        });
    }

function selectRadio(src, title, index, logo) {
      console.log(`[selectRadio] called with: src=${src}, title=${title}, index=${index}`);
      cancelNetworkRecovery();
      resumeAudioContext();
      closeRadioList();
      console.log(`[selectRadio] Selecting radio: ${title}`);
      currentRadioIndex = index;
      currentTrackIndex = -1;
      shuffleQueue = [];
      updateNextTrackInfo();
      const params = new URLSearchParams(window.location.search);
      params.delete('album');
      params.delete('track');
      const newQuery = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${newQuery ? '?' + newQuery : ''}`);
      lastTrackSrc = src;
      lastTrackTitle = title;
      lastTrackIndex = index;
      setCrossOrigin(audioPlayer, src);
      audioPlayer.src = src;
      audioPlayer.currentTime = 0;
      trackInfo.textContent = title;
      trackArtist.textContent = '';
      trackYear.textContent = '';
      trackAlbum.textContent = 'Radio Stream'; // Clear album for radio
      albumCover.src = logo;
      lyricsContainer.innerHTML = '';
      lyricLines = [];
      closeRadioList();
      stopMusic();
      loadingSpinner.style.display = 'block';
      albumCover.style.display = 'none';
      retryButton.style.display = 'none';
      document.getElementById('progressBar').style.display = 'block';
      progressBar.style.width = '0%';
      setTurntableSpin(false);
      handleAudioLoad(src, title, true);
      updateMediaSession();
      showNowPlayingToast(title);
      document.getElementById('main-content').innerHTML = '';
    }

    function retryTrack() {
      if (currentRadioIndex >= 0) {
        selectRadio(lastTrackSrc, lastTrackTitle, lastTrackIndex, radioStations[currentRadioIndex].logo);
      } else {
        selectTrack(lastTrackSrc, lastTrackTitle, lastTrackIndex, false);
      }
    }

    function retryTrackWithDelay() {
      trackInfo.textContent = 'Retrying...';
      loadingSpinner.style.display = 'block';
      albumCover.style.display = 'none';
      document.getElementById('progressBar').style.display = 'none';
      retryButton.style.display = 'none';
      setTurntableSpin(false);
      setTimeout(retryTrack, 3000);
    }

    function handleAudioLoad(src, title, isInitialLoad = true, options = {}) {
      const {
        silent = false,
        autoPlay = true,
        resumeTime = null,
        onReady = null,
        onError: onErrorCallback = null
      } = options;

      // Remove all previous event listeners
      audioPlayer.removeEventListener('progress', onProgress);
      audioPlayer.removeEventListener('canplaythrough', onCanPlayThrough);
      audioPlayer.removeEventListener('canplay', onCanPlay);
      audioPlayer.removeEventListener('error', onError);

      let playTimeout = null;
      if (!silent) {
        playTimeout = setTimeout(() => {
          console.warn(`Timeout: ${title} is taking a while to buffer, retrying...`);
          retryTrackWithDelay();
        }, 15000);
      }

      const clearPlayTimeout = () => {
        if (playTimeout) {
          clearTimeout(playTimeout);
          playTimeout = null;
        }
      };

      function onProgress() {
        if (audioPlayer.buffered.length > 0 && audioPlayer.duration) {
          const bufferedEnd = audioPlayer.buffered.end(0);
          const duration = audioPlayer.duration;
          progressBar.style.width = `${(bufferedEnd / duration) * 100}%`;
        }
      }

      let readyHandled = false;

      const handleReady = () => {
        if (readyHandled) return;
        readyHandled = true;
        if (resumeTime != null && !isNaN(resumeTime)) {
          try {
            audioPlayer.currentTime = resumeTime;
          } catch (err) {
            console.warn('Failed to restore playback position:', err);
          }
        }
        updateMediaSession();
        if (autoPlay) {
          attemptPlay();
        } else {
          manageVinylRotation();
        }
        if (typeof onReady === 'function') {
          onReady();
        }
      };

      function onCanPlayThrough() {
        console.log("onCanPlayThrough called");
        clearPlayTimeout();
        if (!silent) {
          loadingSpinner.style.display = 'none';
          albumCover.style.display = 'block';
          document.getElementById('progressBar').style.display = 'none';
          console.log(`Stream ${title} can play through`);
        }
        handleReady();
      }

      function onCanPlay() {
        console.log("onCanPlay called");
        if (silent || loadingSpinner.style.display === 'block') {
          clearPlayTimeout();
          if (!silent) {
            loadingSpinner.style.display = 'none';
            albumCover.style.display = 'block';
            document.getElementById('progressBar').style.display = 'none';
            console.log(`Stream ${title} can play (fallback)`);
          }
          handleReady();
        }
      }

      function onError() {
        clearPlayTimeout();
        console.error(`Audio error for ${title}:`, audioPlayer.error);
        if (audioPlayer.error) {
          console.error(`Error code: ${audioPlayer.error.code}, Message: ${audioPlayer.error.message}`);
        }
        console.error(`Album cover src: ${albumCover.src}`);

        if (!navigator.onLine || (audioPlayer.error && audioPlayer.error.code === MediaError.MEDIA_ERR_NETWORK)) {
          startNetworkRecovery('load-error');
          if (typeof onErrorCallback === 'function') {
            onErrorCallback();
          }
          return;
        }

        if (!silent) {
          retryTrackWithDelay();
        } else if (typeof onErrorCallback === 'function') {
          onErrorCallback();
        }
      }

      audioPlayer.addEventListener('progress', onProgress);
      audioPlayer.addEventListener('canplaythrough', onCanPlayThrough, { once: true });
      audioPlayer.addEventListener('canplay', onCanPlay, { once: true });
      audioPlayer.addEventListener('error', onError, { once: true });

      audioPlayer.load(); // Force load
    }

    function setTurntableSpin(isSpinning) {
      albumCover.classList.remove('spin');
      if (!turntableDisc) return;
      turntableDisc.classList.remove('spin');
      if (isSpinning) {
        turntableDisc.classList.add('spin');
      }
    }

    function manageVinylRotation() {
      const shouldSpin = !audioPlayer.paused && !audioPlayer.ended;
      setTurntableSpin(shouldSpin);
    }

    function playMusic() {
      attemptPlay();
    }

    function attemptPlay() {
      console.log('[attemptPlay] called');
      resumeAudioContext();
      loadingSpinner.style.display = 'none';
      albumCover.style.display = 'block';
      if (typeof window !== 'undefined' && typeof window.stopYouTubePlayback === 'function') {
        try {
          window.stopYouTubePlayback();
        } catch (error) {
          console.warn('Unable to stop YouTube playback before starting media player:', error);
        }
      }
      const playPromise = audioPlayer.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('[attemptPlay] Playback started successfully.');
          manageVinylRotation();
          audioPlayer.removeEventListener('timeupdate', updateTrackTime);
          audioPlayer.addEventListener('timeupdate', updateTrackTime);
          console.log(`Playing: ${trackInfo.textContent}`);
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
      setTurntableSpin(false);
      console.error(`Error playing ${title}:`, error);

      if (!navigator.onLine || (error && error.code === MediaError.MEDIA_ERR_NETWORK)) {
        startNetworkRecovery('play-error');
        return;
      }

      retryButton.style.display = 'block';

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
          // Handle cases where error.code is undefined (e.g. DOMException from play())
          if (error.name === 'NotAllowedError') {
            trackInfo.textContent = 'Playback was blocked. Please interact with the page.';
          } else {
            trackInfo.textContent = 'Playback failed. Please try again.';
          }
          break;
      }
    }

    function pauseMusic() {
      cancelNetworkRecovery();
      audioPlayer.pause();
      manageVinylRotation();
      audioPlayer.removeEventListener('timeupdate', updateTrackTime);
      console.log('Paused');
      savePlayerState();
    }

    function stopMusic() {
      cancelNetworkRecovery();
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
  highlightLyric(currentTime);
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
        if (shuffleScope === 'repeat') {
          selectTrack(
            albums[currentAlbumIndex].tracks[currentTrackIndex].src,
            albums[currentAlbumIndex].tracks[currentTrackIndex].title,
            currentTrackIndex,
            false
          );
        } else if (shuffleMode) {
          if (shuffleQueue.length === 0) {
            buildShuffleQueue();
          }
          const next = shuffleQueue.shift();
          if (next) {
            currentAlbumIndex = next.albumIndex;
            selectTrack(next.src, next.title, next.trackIndex, false);
            updateNextTrackInfo();
          }
        } else { // No shuffle
          currentTrackIndex = (currentTrackIndex + 1) % albums[currentAlbumIndex].tracks.length;
          selectTrack(
            albums[currentAlbumIndex].tracks[currentTrackIndex].src,
            albums[currentAlbumIndex].tracks[currentTrackIndex].title,
            currentTrackIndex
          );
        }
      }
    });

    audioPlayer.addEventListener('play', manageVinylRotation);
    audioPlayer.addEventListener('pause', manageVinylRotation);
    audioPlayer.addEventListener('ended', manageVinylRotation);

audioPlayer.addEventListener('playing', () => {
  audioPlayer.removeEventListener('timeupdate', updateTrackTime); // clear old listener
  audioPlayer.addEventListener('timeupdate', updateTrackTime);    // reattach freshly
  updateTrackTime();  // update UI instantly
  manageVinylRotation(); // spin the turntable if needed
  console.log(`🎧 Time tracking active: ${trackInfo.textContent}`);
});

function handleNetworkEvent(event) {
  if (networkRecoveryState.active) return;
  if (audioPlayer.paused) return;
  if (!navigator.onLine) {
    startNetworkRecovery(event.type);
  }
}

window.addEventListener('offline', () => {
  if (!audioPlayer.paused) {
    startNetworkRecovery('offline-event');
  }
});
window.addEventListener('online', () => {
  if (networkRecoveryState.active && typeof networkRecoveryState.attemptFn === 'function') {
    networkRecoveryState.attemptFn();
  }
});

audioPlayer.addEventListener('stalled', handleNetworkEvent);
audioPlayer.addEventListener('suspend', handleNetworkEvent);
audioPlayer.addEventListener('waiting', handleNetworkEvent);

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
      if (shuffleQueue.length === 0) {
        buildShuffleQueue();
      }
      const next = shuffleQueue.shift();
      if (next) {
        currentAlbumIndex = next.albumIndex;
        selectTrack(next.src, next.title, next.trackIndex, false);
        updateNextTrackInfo();
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
