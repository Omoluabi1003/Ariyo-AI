/* MUSIC PLAYER LOGIC */
    const audioPlayer = new Audio();
    audioPlayer.id = 'audioPlayer';
    audioPlayer.preload = 'auto';
    document.body.appendChild(audioPlayer);
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
    const progressBar = document.getElementById('progressBar').querySelector('div');
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
      closeAlbumList();
      savePlayerState();
      document.getElementById('main-content').innerHTML = '';
    }

function selectTrack(src, title, index) {
      console.log(`Selecting track: ${title} from album: ${albums[currentAlbumIndex].name}`);
      currentTrackIndex = index;
      currentRadioIndex = -1;
      lastTrackSrc = src;
      lastTrackTitle = title;
      lastTrackIndex = index;
      audioPlayer.src = src + '?t=' + new Date().getTime();
      audioPlayer.currentTime = 0;
      trackInfo.textContent = title;
      trackArtist.textContent = 'Artist: Omoluabi';
      trackYear.textContent = 'Release Year: 2025';
      trackAlbum.textContent = `Album: ${albums[currentAlbumIndex].name}`; // Display album name
      albumCover.src = albums[currentAlbumIndex].cover; // Ensure album cover updates
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
      console.log(`Selecting radio: ${title}`);
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
        console.error(`Timeout: ${title} failed to buffer within 8 seconds`);
      }, 8000);

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
      loadingSpinner.style.display = 'none';
      albumCover.style.display = 'block';
      audioPlayer.play()
        .then(() => {
          manageVinylRotation();
          audioPlayer.removeEventListener('timeupdate', updateTrackTime);
          audioPlayer.addEventListener('timeupdate', updateTrackTime);
          console.log(`Playing: ${trackInfo.textContent}`);
          updateStreak();
          savePlayerState();
          gsap.fromTo(albumCover,
            { scale: 1 },
            { scale: 1.1, yoyo: true, repeat: 1, duration: 0.3, ease: "bounce.out" }
          );
          isFirstPlay = false;
        })
        .catch(error => handlePlayError(error, trackInfo.textContent));
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
