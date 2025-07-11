/**
 * @module service
 * @description Handles browser services like Web Share, Service Worker interactions, and Media Session API.
 */

// --- Web Share API ---
/**
 * Shares the current page using the Web Share API if available.
 * Falls back to an alert if the API is not supported.
 */
export function shareContent() {
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

// --- Service Worker Communication ---
/**
 * Sends a message to the service worker to cache a specific track URL.
 * @param {string} trackUrl - The URL of the track to cache.
 */
export function cacheTrackForOffline(trackUrl) {
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

/**
 * Listens for messages from the service worker (e.g., track caching confirmation).
 */
export function listenForServiceWorkerMessages() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.onmessage = (event) => {
      if (event.data && event.data.type === 'TRACK_CACHED') {
        console.log(`Track cached successfully: ${event.data.url}`);
        alert(`Track cached for offline use: ${event.data.url.split('/').pop()}`);
      }
    };
  }
}

// --- Service Worker Registration (Now handled by vite-plugin-pwa) ---
// export function registerServiceWorker() {
//   if ('serviceWorker' in navigator) {
//     window.addEventListener('load', () => {
//       navigator.serviceWorker.register('/service-worker.js') // Path is relative to origin
//         .then(registration => {
//           console.log('Service Worker registered with scope:', registration.scope);
//         })
//         .catch(error => {
//           console.error('Service Worker registration failed:', error);
//         });
//     });
//   }
// }

// --- Media Session API ---
let mediaSessionPlayerControls = {
    play: () => console.warn("Play action not set for MediaSession"),
    pause: () => console.warn("Pause action not set for MediaSession"),
    stop: () => console.warn("Stop action not set for MediaSession"),
    nextTrack: () => console.warn("NextTrack action not set for MediaSession"),
    previousTrack: () => console.warn("PreviousTrack action not set for MediaSession"),
};

/**
 * Sets the player control callback functions for the Media Session API.
 * @param {object} controls - An object containing play, pause, stop, nextTrack, previousTrack functions.
 */
export function setMediaSessionPlayerControls(controls) {
    mediaSessionPlayerControls = {...mediaSessionPlayerControls, ...controls};
}

/**
 * Updates the Media Session metadata.
 * @param {object} metadata - The metadata for the current track/station.
 * @param {string} metadata.title - The title of the track/station.
 * @param {string} metadata.artist - The artist name.
 * @param {string} metadata.albumName - The album name.
 * @param {Array<object>} metadata.artwork - Array of artwork objects (e.g., [{ src, sizes, type }]).
 */
export function updateMediaSession(metadata) {
  if ('mediaSession' in navigator && metadata) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: metadata.title || "Àríyò AI",
      artist: metadata.artist || 'Omoluabi',
      album: metadata.albumName || 'Music', // Changed from metadata.album to metadata.albumName for consistency
      artwork: metadata.artwork || [ { src: '/icons/Ariyo.png', sizes: '192x192', type: 'image/png' }]
    });

    navigator.mediaSession.setActionHandler('play', mediaSessionPlayerControls.play);
    navigator.mediaSession.setActionHandler('pause', mediaSessionPlayerControls.pause);
    navigator.mediaSession.setActionHandler('stop', mediaSessionPlayerControls.stop);
    navigator.mediaSession.setActionHandler('nexttrack', mediaSessionPlayerControls.nextTrack);
    navigator.mediaSession.setActionHandler('previoustrack', mediaSessionPlayerControls.previousTrack);

    console.log('Media Session updated with new metadata.');
  }
}

/**
 * Updates the Media Session playback position state.
 * @param {HTMLAudioElement} audioPlayer - The audio player element.
 */
export function updateMediaSessionPositionState(audioPlayer) {
    if ('mediaSession' in navigator && audioPlayer) {
        if (audioPlayer.duration && isFinite(audioPlayer.duration)) {
            navigator.mediaSession.setPositionState({
              duration: audioPlayer.duration,
              playbackRate: audioPlayer.playbackRate,
              position: audioPlayer.currentTime
            });
        } else {
            navigator.mediaSession.setPositionState(null);
        }
    }
}
