/**
 * @module main
 * @description Main entry point for the Àríyò AI application.
 * Initializes all modules, sets up global event listeners, and exposes necessary functions to the window object.
 */

import { albums } from './data.js'; // albums might be needed by navigateToAbout if not passed around
import * as ui from './ui.js';
import * as service from './service.js';
import * as player from './player.js';

// --- Initialize UI specific elements & handlers ---
ui.startBackgroundCycler();
ui.setupPwaInstallHandlers();
ui.setupSidebarButtonAnimations();
ui.animateMainContentEntry();
ui.initializeSpoofedLocation(); // For Zapier embeds

// --- Initialize Player ---
player.initializePlayer();

// --- Initialize Services ---
// service.registerServiceWorker(); // Registration now handled by vite-plugin-pwa
service.listenForServiceWorkerMessages();

// --- Global Event Listeners ---
window.addEventListener('beforeunload', player.savePlayerState);

window.addEventListener('popstate', (event) => {
    // Pass the savePlayerState function from the player module as a callback
    const saveCallback = player.savePlayerState;
    const mainContent = document.getElementById('main-content');
    const aboutPageStyles = document.getElementById('about-page-styles');

    if (event.state && event.state.page) {
        if (event.state.page === 'about') {
            if (!aboutPageStyles || (mainContent && mainContent.innerHTML.includes('<h2>Select an option from the sidebar'))) {
                 ui.navigateToAbout(saveCallback);
            }
        } else if (event.state.page === 'home') {
            if (aboutPageStyles) {
                ui.navigateToHome(saveCallback);
            }
        }
    } else {
        if (document.getElementById('about-page-styles')) {
            ui.navigateToHome(saveCallback);
        }
    }
});


// --- Expose functions to global scope for HTML onclick attributes ---
// This is generally not ideal; programmatic event listeners are preferred.
// Player controls are exposed via player.playerControls
window.playMusic = player.playerControls.playMusic;
window.pauseMusic = player.playerControls.pauseMusic;
window.stopMusic = player.playerControls.stopMusic;
window.nextTrack = player.playerControls.nextTrack;
window.previousTrack = player.playerControls.previousTrack;
window.toggleShuffle = player.playerControls.toggleShuffle;
window.selectAlbum = player.playerControls.selectAlbum;
window.selectTrack = player.playerControls.selectTrack; // Needed if track list items call this directly
window.selectRadio = player.playerControls.selectRadio; // Needed if radio list items call this directly
window.retryTrack = player.playerControls.retryTrack;

// UI functions that might be called from HTML
window.openAlbumList = ui.openAlbumList;
window.closeAlbumList = ui.closeAlbumList;
window.openTrackList = () => ui.openTrackList(player.getPlayerStateForUI().currentAlbumIndex, player.playerControls.selectTrack);
window.closeTrackList = ui.closeTrackList;
window.openRadioList = () => ui.openRadioList(player.playerControls.selectRadio);
window.closeRadioList = ui.closeRadioList;
window.navigateToAbout = () => ui.navigateToAbout(player.savePlayerState); // Pass save callback
window.toggleChatbot = ui.toggleChatbot;
window.toggleSabiBible = ui.toggleSabiBible;
window.loadMoreStations = (region) => ui.loadMoreStations(region, player.playerControls.selectRadio); // Pass selectRadio callback

// Service functions
window.shareContent = service.shareContent;
// The cacheTrackForOffline in index.html calls window.cacheTrackForOfflineGlobal()
// Let's define that to call the service function, ensuring it gets the current track URL correctly.
window.cacheTrackForOfflineGlobal = () => {
    const currentTrackMetadata = player.playerControls.getCurrentTrackMetadata();
    if (currentTrackMetadata && currentTrackMetadata.src) { // Assuming src is part of metadata or accessible
        service.cacheTrackForOffline(currentTrackMetadata.src);
    } else {
        // Attempt to get from player state if not in metadata (e.g. if src isn't directly in metadata)
        const audioEl = player.playerControls.getAudioPlayerElement();
        if (audioEl && audioEl.src && !audioEl.src.startsWith('blob:')) { // Don't cache blob URLs
             // Check if it's a radio stream; typically we don't cache live streams this way
            let isRadio = false;
            if (typeof player.getPlayerStateForUI === 'function') { // Temporary check, better to get from player state directly
                const playerState = player.getPlayerStateForUI(); // This needs to be properly designed
                // This is a placeholder, getPlayerStateForUI needs to return currentRadioIndex
                // For now, let's assume if it's not in albums, it might be a radio or unmanaged source
                // A better check: if (player.playerState.currentRadioIndex !== -1) isRadio = true;
            }
            // A more direct way to check if it's a radio stream might be needed from player.js state
            // For now, let's assume if it's not an album track, we might not want to cache it via this button.
            // This logic needs refinement based on how player state (currentRadioIndex) is exposed.
            // Simplified:
            const currentTrack = player.playerControls.getCurrentTrackMetadata(); // Re-fetch to be sure
            if (currentTrack && currentTrack.albumName !== 'Live Radio' && audioEl.src) {
                 service.cacheTrackForOffline(audioEl.src);
            } else if (currentTrack && currentTrack.albumName === 'Live Radio'){
                 alert("Live radio streams cannot be downloaded for offline use this way.");
            }
            else {
                alert("No track selected or current track source is unavailable for download.");
            }
        } else {
            alert("No track selected or current track source is unavailable for download.");
        }
    }
};

// Initial UI setup that might depend on player state being somewhat ready
// e.g., setting initial shuffle button text based on loaded state
const initialPlayerStateForUI = player.getPlayerStateForUI(); // If needed for initial UI text outside player
if (initialPlayerStateForUI) {
    // Example: ui.updateShuffleButtonText(initialPlayerStateForUI.shuffleMode ? ... : ...);
    // This is now handled within player.initializePlayer calling ui.updateShuffleButtonText
}

console.log("Àríyò AI Main Application Initialized");
