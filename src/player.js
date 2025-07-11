/**
 * @module player
 * @description Core music and radio playback logic, state management, and UI updates via callbacks.
 */

import { albums, radioStations } from './data.js';
import { formatTime } from './utils.js';
import * as ui from './ui.js'; // Import all ui functions
import * as service from './service.js'; // Import all service functions

// --- Player State ---
/**
 * @typedef {object} PlayerState
 * @property {number} currentAlbumIndex - Index of the current album.
 * @property {number} currentTrackIndex - Index of the current track within the current album.
 * @property {number} currentRadioIndex - Index of the current radio station (-1 if not in radio mode).
 * @property {boolean} shuffleMode - Whether shuffle is active.
 * @property {string} shuffleScope - Scope of shuffle ('off', 'album', 'all').
 * @property {boolean} isFirstPlay - Flag to handle initial user interaction requirement for audio.
 * @property {string} lastTrackSrc - Source URL of the last loaded track/station.
 * @property {string} lastTrackTitle - Title of the last loaded track/station.
 * @property {number} lastTrackIndexInAlbum - Index of the last music track within its album.
 * @property {number} lastRadioIndexGlobal - Global index of the last radio station.
 * @property {HTMLAudioElement} audioPlayer - The main HTML audio element.
 */

/** @type {PlayerState} */
const playerState = {
  currentAlbumIndex: 0,
  currentTrackIndex: 0,
  currentRadioIndex: -1,
  shuffleMode: false,
  shuffleScope: 'off',
  isFirstPlay: true,
  lastTrackSrc: '',
  lastTrackTitle: '',
  lastTrackIndexInAlbum: 0,
  lastRadioIndexGlobal: -1,
  audioPlayer: new Audio(),
};

const audioPlayer = playerState.audioPlayer; // Alias for convenience
audioPlayer.id = 'audioPlayerElement';
audioPlayer.preload = 'auto';
document.body.appendChild(audioPlayer);

// --- Streak Logic ---
/**
 * Updates and displays the user's listening streak.
 * Streak is incremented if the user listens on consecutive days.
 */
function updateStreak() {
  const now = new Date();
  const today = now.toDateString();
  const streakData = JSON.parse(localStorage.getItem('ariyoStreak')) || { streak: 0, lastDate: null };

  if (streakData.lastDate !== today) {
    const lastDateObj = streakData.lastDate ? new Date(streakData.lastDate) : null;
    if (lastDateObj) {
      const diffTime = now.getTime() - lastDateObj.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) streakData.streak += 1;
      else if (diffDays > 1) streakData.streak = 1;
    } else {
      streakData.streak = 1;
    }
    streakData.lastDate = today;
    localStorage.setItem('ariyoStreak', JSON.stringify(streakData));
  }
  ui.updateStreakInfo(streakData.streak);
  console.log(`Streak updated: ${streakData.streak} days`);
}

// --- Player State Persistence ---
/**
 * Saves the current player state to localStorage.
 */
export function savePlayerState() {
  const stateToSave = {
    albumIndex: playerState.currentAlbumIndex,
    trackIndex: playerState.currentTrackIndex,
    radioIndex: playerState.currentRadioIndex,
    playbackPosition: playerState.audioPlayer.currentTime,
    shuffleMode: playerState.shuffleMode,
    shuffleScope: playerState.shuffleScope,
    timestamp: new Date().getTime()
  };
  localStorage.setItem('ariyoPlayerState', JSON.stringify(stateToSave));
  console.log('Player state saved:', stateToSave);
}

/**
 * Loads player state from localStorage and applies it.
 * @returns {object|null} The loaded state object or null if no valid state found.
 */
function loadPlayerState() {
  const savedStateString = localStorage.getItem('ariyoPlayerState');
  if (savedStateString) {
    const saved = JSON.parse(savedStateString);
    const ageInHours = (new Date().getTime() - (saved.timestamp || 0)) / (1000 * 60 * 60);
    if (ageInHours < 24) {
      playerState.currentAlbumIndex = saved.albumIndex !== undefined ? saved.albumIndex : 0;
      playerState.currentTrackIndex = saved.trackIndex !== undefined ? saved.trackIndex : 0;
      playerState.currentRadioIndex = saved.radioIndex !== undefined ? saved.radioIndex : -1;
      playerState.shuffleMode = saved.shuffleMode || false;
      playerState.shuffleScope = saved.shuffleScope || 'off';
      return saved;
    }
  }
  return null;
}

// --- Core Playback Functions ---
/**
 * Handles the loading process of an audio source (track or radio).
 * Manages UI updates for loading state, spinners, and error handling.
 * @param {string} src - The URL of the audio source.
 * @param {string} title - The title of the track or station for display and logging.
 */
function handleAudioLoad(src, title) {
  ui.showLoadingSpinner();
  ui.toggleRetryButton(false);
  ui.toggleProgressBarVisibility(true);
  ui.updateProgressBar(0);

  const playTimeout = setTimeout(() => {
    ui.hideLoadingSpinner();
    ui.toggleProgressBarVisibility(false);
    ui.updatePlayerUITrackDetails({ title: 'Error: Stream failed to load (timeout)' });
    ui.toggleRetryButton(true);
    console.error(`Timeout: ${title} failed to buffer within 10 seconds`);
  }, 10000);

  playerState.audioPlayer.onprogress = () => {
    if (playerState.audioPlayer.buffered.length > 0 && playerState.audioPlayer.duration > 0 && isFinite(playerState.audioPlayer.duration)) {
      const bufferedEnd = playerState.audioPlayer.buffered.end(playerState.audioPlayer.buffered.length - 1);
      ui.updateProgressBar((bufferedEnd / playerState.audioPlayer.duration) * 100);
    } else if (playerState.audioPlayer.buffered.length > 0 && playerState.currentRadioIndex !== -1) {
      ui.updateProgressBar(50);
    }
  };

  playerState.audioPlayer.oncanplaythrough = () => {
    clearTimeout(playTimeout);
    ui.hideLoadingSpinner();
    ui.toggleProgressBarVisibility(false);
    console.log(`Stream ${title} can play through`);
    if (!playerState.isFirstPlay) attemptPlay();
  };

  playerState.audioPlayer.oncanplay = () => {
    if (document.getElementById('loadingSpinner').style.display === 'block') {
      clearTimeout(playTimeout);
      ui.hideLoadingSpinner();
      ui.toggleProgressBarVisibility(false);
      console.log(`Stream ${title} can play (canplay event)`);
      if (!playerState.isFirstPlay) attemptPlay();
    }
  };

  playerState.audioPlayer.onerror = (e) => {
    clearTimeout(playTimeout);
    ui.hideLoadingSpinner();
    ui.toggleProgressBarVisibility(false);
    let errorMsg = 'Error: Unable to load stream';
    if (playerState.audioPlayer.error) {
        switch (playerState.audioPlayer.error.code) {
            case MediaError.MEDIA_ERR_ABORTED: errorMsg = 'Playback aborted.'; break;
            case MediaError.MEDIA_ERR_NETWORK: errorMsg = 'Network error.'; break;
            case MediaError.MEDIA_ERR_DECODE: errorMsg = 'Error decoding media.'; break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg = 'Media source not supported.'; break;
            default: errorMsg = 'An unknown error occurred.';
        }
    }
    ui.updatePlayerUITrackDetails({ title: errorMsg });
    ui.toggleRetryButton(true);
    console.error(`Audio error for ${title}:`, playerState.audioPlayer.error, e);
  };

  playerState.audioPlayer.load();
}

/**
 * Attempts to play the currently loaded audio. Handles UI and state updates.
 */
function attemptPlay() {
  playerState.audioPlayer.play()
    .then(() => {
      ui.toggleVinylRotation(true);
      updateStreak();
      savePlayerState();
      playerState.isFirstPlay = false;
      ui.hideLoadingSpinner();
      ui.toggleProgressBarVisibility(false);
      console.log(`Playing: ${playerState.lastTrackTitle}`);
    })
    .catch(error => handlePlayError(error, playerState.lastTrackTitle));
}

/**
 * Handles errors during playback attempt.
 * @param {Error} error - The playback error object.
 * @param {string} title - The title of the track/station that failed to play.
 */
function handlePlayError(error, title) {
  ui.hideLoadingSpinner();
  ui.toggleProgressBarVisibility(false);
  ui.toggleRetryButton(true);
  ui.updatePlayerUITrackDetails({ title: navigator.onLine ? 'Error playing stream' : 'Offline - Stream unavailable' });
  console.error(`Error playing ${title}:`, error);
}

/**
 * Initiates playback of the current audio source.
 * If no source is set, attempts to load the first album's first track.
 */
export function playMusic() {
  if (playerState.audioPlayer.src) {
    if (playerState.isFirstPlay || playerState.audioPlayer.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
        ui.showLoadingSpinner();
        ui.toggleRetryButton(false);
        ui.toggleProgressBarVisibility(true);
        ui.updateProgressBar(0);
    }
    attemptPlay();
  } else {
      console.warn("No audio source set to play.");
      if (albums.length > 0 && albums[0].tracks.length > 0) {
          selectAlbum(0);
      }
  }
}

/**
 * Pauses the currently playing audio.
 */
export function pauseMusic() {
  playerState.audioPlayer.pause();
  ui.toggleVinylRotation(false);
  console.log('Paused');
  savePlayerState();
}

/**
 * Stops audio playback and resets current time to 0.
 */
export function stopMusic() {
  playerState.audioPlayer.pause();
  playerState.audioPlayer.currentTime = 0;
  ui.toggleVinylRotation(false);
  ui.updateSeekBar(0);
  ui.updatePlayerUIDuration(formatTime(0), formatTime(playerState.audioPlayer.duration || 0));
  console.log('Stopped');
  savePlayerState();
}

/**
 * Updates the track time display in the UI and Media Session.
 */
function updateTrackTimeUI() {
  const currentTime = playerState.audioPlayer.currentTime;
  let durationText = 'Live';

  if (playerState.currentRadioIndex === -1 && isFinite(playerState.audioPlayer.duration)) {
    const duration = playerState.audioPlayer.duration || 0;
    durationText = formatTime(duration);
    if (duration > 0) ui.updateSeekBar((currentTime / duration) * 100);
    ui.toggleSeekBarVisibility(true);
  } else {
    ui.toggleSeekBarVisibility(false);
  }
  ui.updatePlayerUIDuration(formatTime(currentTime), durationText);
  service.updateMediaSessionPositionState(playerState.audioPlayer);
}

// --- Track/Album/Radio Selection ---
/**
 * Selects an album, loads its first track, and updates UI.
 * @param {number} albumIdx - The index of the album to select.
 */
export function selectAlbum(albumIdx) {
  playerState.currentAlbumIndex = albumIdx;
  playerState.currentTrackIndex = 0;
  playerState.currentRadioIndex = -1;

  const album = albums[playerState.currentAlbumIndex];
  if (!album || !album.tracks || album.tracks.length === 0) {
    console.error("Selected album or its tracks are invalid.");
    return;
  }
  const track = album.tracks[playerState.currentTrackIndex];
  loadTrack(track.src, track.title, playerState.currentTrackIndex, album.name, album.cover);
  ui.updateTrackListModal(playerState.currentAlbumIndex, selectTrack);
  ui.closeAlbumList();
}

/**
 * Loads a specific track for playback.
 * @param {string} src - The source URL of the track.
 * @param {string} title - The title of the track.
 * @param {number} indexInAlbum - The index of the track within its album.
 * @param {string} albumName - The name of the album.
 * @param {string} coverArt - The URL of the album cover art.
 */
function loadTrack(src, title, indexInAlbum, albumName, coverArt) {
  console.log(`Loading track: ${title} from album: ${albumName}`);
  playerState.currentTrackIndex = indexInAlbum;
  playerState.currentRadioIndex = -1;
  playerState.lastTrackSrc = src;
  playerState.lastTrackTitle = title;
  playerState.lastTrackIndexInAlbum = indexInAlbum;
  playerState.audioPlayer.src = src;

  ui.updatePlayerUITrackDetails({ title, artist: 'Omoluabi', year: '2025', albumName, cover: coverArt });
  ui.toggleCacheButton(true);
  stopMusic();
  handleAudioLoad(src, title);

  const mediaMeta = { title, artist: 'Omoluabi', albumName, artwork: [{ src: coverArt, sizes: '512x512', type: 'image/jpeg' }] };
  service.updateMediaSession(mediaMeta);
}

/**
 * Selects a specific track from the current album for playback.
 * @param {string} src - The source URL of the track.
 * @param {string} title - The title of the track.
 * @param {number} indexInAlbum - The index of the track within its album.
 */
export function selectTrack(src, title, indexInAlbum) {
  const album = albums[playerState.currentAlbumIndex];
  if (!album) {
    console.error("Cannot select track: current album not found.");
    return;
  }
  loadTrack(src, title, indexInAlbum, album.name, album.cover);
  ui.closeTrackList();
}

/**
 * Selects a radio station for playback.
 * @param {string} src - The URL of the radio stream.
 * @param {string} title - The name/title of the radio station.
 * @param {number} globalRadioIdx - The global index of the radio station in the `radioStations` array.
 * @param {string} logo - The URL of the radio station's logo.
 */
export function selectRadio(src, title, globalRadioIdx, logo) {
  console.log(`Selecting radio: ${title}`);
  playerState.currentRadioIndex = globalRadioIdx;
  playerState.currentTrackIndex = -1;
  playerState.lastTrackSrc = src;
  playerState.lastTrackTitle = title;
  playerState.lastRadioIndexGlobal = globalRadioIdx;
  playerState.audioPlayer.src = src;

  ui.updatePlayerUITrackDetails({ title, artist: 'Radio Stream', year: '', albumName: 'Live Radio', cover: logo });
  ui.toggleCacheButton(false);
  stopMusic();
  handleAudioLoad(src, title);

  const mediaMeta = { title, artist: 'Radio Stream', albumName: 'Live Radio', artwork: [{ src: logo, sizes: '192x192', type: 'image/png' }] };
  service.updateMediaSession(mediaMeta);
  ui.closeRadioList();
}

/**
 * Retries loading the last played track or station.
 */
export function retryTrack() {
  if (playerState.currentRadioIndex >= 0 && radioStations[playerState.lastRadioIndexGlobal]) {
    const station = radioStations[playerState.lastRadioIndexGlobal];
    selectRadio(station.url, `${station.name} - ${station.location}`, playerState.lastRadioIndexGlobal, station.logo);
  } else if (albums[playerState.currentAlbumIndex] && albums[playerState.currentAlbumIndex].tracks[playerState.lastTrackIndexInAlbum]) {
    const track = albums[playerState.currentAlbumIndex].tracks[playerState.lastTrackIndexInAlbum];
    selectTrack(track.src, track.title, playerState.lastTrackIndexInAlbum);
  } else {
    console.warn("Could not retry track, state is unclear.");
  }
}

// --- Navigation (Next/Previous/Shuffle) ---
/**
 * Plays the next track based on current mode (shuffle or sequential).
 */
export function nextTrack() {
  if (playerState.currentRadioIndex !== -1) return;

  if (playerState.shuffleMode) {
    if (playerState.shuffleScope === 'all') {
      const allTracks = [];
      albums.forEach((album, albumIdx) => {
        album.tracks.forEach((track, trackIdx) => {
          allTracks.push({ ...track, originalAlbumIndex: albumIdx, originalTrackIndex: trackIdx });
        });
      });
      if (allTracks.length > 0) {
        const randomTrackInfo = allTracks[Math.floor(Math.random() * allTracks.length)];
        playerState.currentAlbumIndex = randomTrackInfo.originalAlbumIndex;
        selectTrack(randomTrackInfo.src, randomTrackInfo.title, randomTrackInfo.originalTrackIndex);
      }
    } else {
      const album = albums[playerState.currentAlbumIndex];
      if (album && album.tracks.length > 0) {
        const randomIndex = Math.floor(Math.random() * album.tracks.length);
        selectTrack(album.tracks[randomIndex].src, album.tracks[randomIndex].title, randomIndex);
      }
    }
  } else {
    const album = albums[playerState.currentAlbumIndex];
    if (album && album.tracks.length > 0) {
      playerState.currentTrackIndex = (playerState.currentTrackIndex + 1) % album.tracks.length;
      selectTrack(album.tracks[playerState.currentTrackIndex].src, album.tracks[playerState.currentTrackIndex].title, playerState.currentTrackIndex);
    }
  }
  if (!playerState.audioPlayer.paused || playerState.isFirstPlay) {
    playerState.audioPlayer.oncanplay = () => attemptPlay();
  }
}

/**
 * Plays the previous track based on current mode (shuffle or sequential).
 */
export function previousTrack() {
  if (playerState.currentRadioIndex !== -1) return;

  if (playerState.shuffleMode) {
    nextTrack(); // Shuffle previous is same as shuffle next
  } else {
    const album = albums[playerState.currentAlbumIndex];
    if (album && album.tracks.length > 0) {
      playerState.currentTrackIndex = (playerState.currentTrackIndex - 1 + album.tracks.length) % album.tracks.length;
      selectTrack(album.tracks[playerState.currentTrackIndex].src, album.tracks[playerState.currentTrackIndex].title, playerState.currentTrackIndex);
    }
  }
   if (!playerState.audioPlayer.paused || playerState.isFirstPlay) {
    playerState.audioPlayer.oncanplay = () => attemptPlay();
  }
}

/**
 * Toggles shuffle mode (Off -> Album -> All -> Off).
 * Updates UI and ARIA attributes accordingly.
 */
export function toggleShuffle() {
  const shuffleButton = document.querySelector(".music-controls.icons-only button[aria-label='Toggle shuffle']");

  if (playerState.shuffleScope === 'off') {
    playerState.shuffleScope = 'album';
    playerState.shuffleMode = true;
    ui.updateShuffleButtonText('🔀 Album');
    ui.updateShuffleStatusInfo('Shuffle: On (Album)');
    if (shuffleButton) shuffleButton.setAttribute('aria-pressed', 'true');
  } else if (playerState.shuffleScope === 'album') {
    playerState.shuffleScope = 'all';
    playerState.shuffleMode = true;
    ui.updateShuffleButtonText('🔀 All');
    ui.updateShuffleStatusInfo('Shuffle: On (All Tracks)');
    if (shuffleButton) shuffleButton.setAttribute('aria-pressed', 'true');
  } else {
    playerState.shuffleScope = 'off';
    playerState.shuffleMode = false;
    ui.updateShuffleButtonText('🔀 Off');
    ui.updateShuffleStatusInfo('Shuffle: Off');
    if (shuffleButton) shuffleButton.setAttribute('aria-pressed', 'false');
  }
  savePlayerState();
}

// --- Event Listeners Setup for Audio Element ---
/**
 * Sets up all necessary event listeners for the HTMLAudioElement.
 */
function setupAudioEventListeners() {
    playerState.audioPlayer.ontimeupdate = () => {
        updateTrackTimeUI();
        savePlayerState();
    };
    playerState.audioPlayer.onloadedmetadata = updateTrackTimeUI;

    playerState.audioPlayer.onended = () => {
      ui.toggleVinylRotation(false);
      if (playerState.currentRadioIndex === -1) {
        nextTrack();
      } else {
        console.log("Radio stream ended.");
        stopMusic();
      }
    };

    playerState.audioPlayer.onplay = () => ui.toggleVinylRotation(true);
    playerState.audioPlayer.onpause = () => ui.toggleVinylRotation(false);
    playerState.audioPlayer.onplaying = () => {
        ui.toggleVinylRotation(true);
        updateTrackTimeUI();
        console.log(`🎧 Playback started: ${playerState.lastTrackTitle}`);
    };
}

// --- Initialization ---
/**
 * Initializes the player: sets up event listeners, loads saved state or defaults.
 */
export function initializePlayer() {
  setupAudioEventListeners();

  service.setMediaSessionPlayerControls({
      play: playMusic,
      pause: pauseMusic,
      stop: stopMusic,
      nextTrack: nextTrack,
      previousTrack: previousTrack
  });

  const saved = loadPlayerState();
  if (saved) {
    if (playerState.currentRadioIndex >= 0 && radioStations[playerState.currentRadioIndex]) {
      const station = radioStations[playerState.currentRadioIndex];
      playerState.audioPlayer.src = station.url;
      ui.updatePlayerUITrackDetails({ title: `${station.name} - ${station.location}`, artist: '', year: '', albumName: 'Radio Stream', cover: station.logo });
      ui.toggleCacheButton(false);
      playerState.lastTrackSrc = station.url;
      playerState.lastTrackTitle = `${station.name} - ${station.location}`;
      playerState.lastRadioIndexGlobal = playerState.currentRadioIndex;
    } else if (playerState.currentAlbumIndex >=0 && albums[playerState.currentAlbumIndex] && albums[playerState.currentAlbumIndex].tracks[playerState.currentTrackIndex]) {
      const track = albums[playerState.currentAlbumIndex].tracks[playerState.currentTrackIndex];
      playerState.audioPlayer.src = track.src;
      ui.updatePlayerUITrackDetails({ title: track.title, artist: 'Omoluabi', year: '2025', albumName: albums[playerState.currentAlbumIndex].name, cover: albums[playerState.currentAlbumIndex].cover });
      ui.toggleCacheButton(true);
      playerState.lastTrackSrc = track.src;
      playerState.lastTrackTitle = track.title;
      playerState.lastTrackIndexInAlbum = playerState.currentTrackIndex;
    }

    if (playerState.audioPlayer.src && saved.playbackPosition && isFinite(saved.playbackPosition)) {
        const tempAudioPlayer = playerState.audioPlayer;
        tempAudioPlayer.onloadedmetadata = () => {
            if (isFinite(tempAudioPlayer.duration)) {
                 tempAudioPlayer.currentTime = Math.min(saved.playbackPosition, tempAudioPlayer.duration);
            } else if (playerState.currentRadioIndex !== -1) {
                // No action
            }
            updateTrackTimeUI();
            ui.toggleVinylRotation(!tempAudioPlayer.paused);
            tempAudioPlayer.onloadedmetadata = updateTrackTimeUI;
        };
    } else {
        updateTrackTimeUI();
    }

    ui.updateTrackListModal(playerState.currentAlbumIndex, selectTrack);
    ui.updateShuffleStatusInfo(playerState.shuffleMode ? (playerState.shuffleScope === 'all' ? 'Shuffle: On (All Tracks)' : 'Shuffle: On (Album)') : 'Shuffle: Off');
    ui.updateShuffleButtonText(playerState.shuffleMode ? (playerState.shuffleScope === 'all' ? '🔀 All' : '🔀 Album') : '🔀 Off');
    console.log('Player restored from saved state.');
  } else {
    ui.updateShuffleStatusInfo('Shuffle: Off');
    ui.updateShuffleButtonText('🔀 Off');
    selectAlbum(0);
    console.log('No saved state found, initialized with default.');
  }
  updateStreak();
}

/**
 * @typedef {object} PlayerControls
 * @property {function} selectAlbum
 * @property {function} selectTrack
 * @property {function} selectRadio
 * @property {function} retryTrack
 * @property {function} playMusic
 * @property {function} pauseMusic
 * @property {function} stopMusic
 * @property {function} nextTrack
 * @property {function} previousTrack
 * @property {function} toggleShuffle
 * @property {function} savePlayerState
 * @property {function} getAudioPlayerElement - Returns the HTMLAudioElement instance.
 * @property {function} getCurrentTrackMetadata - Returns metadata for the current track/station.
 */

/**
 * Exported player controls for use by main.js or other modules.
 * @type {PlayerControls}
 */
export const playerControls = {
    selectAlbum,
    selectTrack,
    selectRadio,
    retryTrack,
    playMusic,
    pauseMusic,
    stopMusic,
    nextTrack,
    previousTrack,
    toggleShuffle,
    savePlayerState,
    getAudioPlayerElement: () => playerState.audioPlayer,
    getCurrentTrackMetadata: () => {
        if (playerState.currentRadioIndex !== -1 && radioStations[playerState.currentRadioIndex]) {
            const station = radioStations[playerState.currentRadioIndex];
            return { title: `${station.name} - ${station.location}`, artist: 'Radio Stream', albumName: 'Live Radio', artwork: [{ src: station.logo, sizes: '192x192', type: 'image/png' }], src: station.url };
        } else if (albums[playerState.currentAlbumIndex] && albums[playerState.currentAlbumIndex].tracks[playerState.currentTrackIndex]) {
            const album = albums[playerState.currentAlbumIndex];
            const track = album.tracks[playerState.currentTrackIndex];
            return { title: track.title, artist: 'Omoluabi', albumName: album.name, artwork: [{ src: album.cover, sizes: '512x512', type: 'image/jpeg' }], src: track.src };
        }
        return null;
    }
};

// Setup seek bar event listener
const seekBarElement = document.getElementById('seekBar');
if (seekBarElement) {
    seekBarElement.addEventListener('input', () => {
        if (playerState.audioPlayer.duration && playerState.currentRadioIndex === -1 && isFinite(playerState.audioPlayer.duration)) {
            const newTime = (seekBarElement.value / 100) * playerState.audioPlayer.duration;
            playerState.audioPlayer.currentTime = newTime;
            updateTrackTimeUI();
        }
    });
}

/**
 * Provides essential player state information needed by other modules (e.g., UI for track list modal).
 * @returns {{currentAlbumIndex: number}}
 */
export function getPlayerStateForUI() {
    return {
        currentAlbumIndex: playerState.currentAlbumIndex,
    };
}
