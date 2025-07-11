/**
 * @module ui
 * @description Handles UI interactions, DOM manipulations, and visual updates for the application.
 */

import { albums, radioStations } from './data.js';
// GSAP might be loaded via CDN. If we bundle it later, this import would change.
// For now, we assume gsap is globally available if the CDN script is in index.html.

// --- DOM Elements ---
const mainContent = document.getElementById('main-content');
const albumModal = document.getElementById('albumModal');
const trackModal = document.getElementById('trackModal');
const radioModal = document.getElementById('radioModal');
const chatbotContainer = document.getElementById('chatbotContainer');
const sabiBibleContainer = document.getElementById('sabiBibleContainer');
const contentOpacityTarget = document.getElementById('main-content');

// --- State for About Page Navigation ---
let originalMainContentHTML = '';
let aboutButtonGlobal = null;
let originalAboutButtonText = '';
let originalAboutButtonOnClick = null;

// --- Modal Functions ---

/**
 * Opens the album list modal with an animation.
 */
export function openAlbumList() {
  if (!albumModal) return;
  albumModal.style.display = 'block';
  if (typeof gsap !== 'undefined' && albumModal.querySelector('.modal-content')) {
    gsap.fromTo(albumModal.querySelector('.modal-content'),
      { scale: 0.8, opacity: 0, y: 50 },
      { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );
  }
  console.log('Album list opened');
}

/**
 * Closes the album list modal with an animation.
 */
export function closeAlbumList() {
  if (!albumModal) return;
  if (typeof gsap !== 'undefined' && albumModal.querySelector('.modal-content')) {
    gsap.to(albumModal.querySelector('.modal-content'),
      { scale: 0.8, opacity: 0, y: 50, duration: 0.3, ease: "power2.in",
        onComplete: () => { albumModal.style.display = 'none'; }
      }
    );
  } else {
    albumModal.style.display = 'none';
  }
  console.log('Album list closed');
}

/**
 * Opens the track list modal, updating its content first.
 * @param {number} currentAlbumIndex - The index of the currently selected album.
 * @param {function} selectTrackCallback - Callback function to handle track selection.
 */
export function openTrackList(currentAlbumIndex, selectTrackCallback) {
  if (!trackModal) return;
  updateTrackListModal(currentAlbumIndex, selectTrackCallback);
  trackModal.style.display = 'block';
  if (typeof gsap !== 'undefined' && trackModal.querySelector('.modal-content')) {
    gsap.fromTo(trackModal.querySelector('.modal-content'),
      { scale: 0.8, opacity: 0, y: 50 },
      { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );
  }
  console.log('Track list opened');
}

/**
 * Closes the track list modal with an animation.
 */
export function closeTrackList() {
  if (!trackModal) return;
  if (typeof gsap !== 'undefined' && trackModal.querySelector('.modal-content')) {
    gsap.to(trackModal.querySelector('.modal-content'),
      { scale: 0.8, opacity: 0, y: 50, duration: 0.3, ease: "power2.in",
        onComplete: () => { trackModal.style.display = 'none'; }
      }
    );
  } else {
    trackModal.style.display = 'none';
  }
  console.log('Track list closed');
}

/**
 * Opens the radio list modal, updating its content first.
 * @param {function} selectRadioCallback - Callback function to handle radio station selection.
 */
export function openRadioList(selectRadioCallback) {
  if (!radioModal) return;
  updateRadioListModal(selectRadioCallback);
  radioModal.style.display = 'block';
  if (typeof gsap !== 'undefined' && radioModal.querySelector('.modal-content')) {
    gsap.fromTo(radioModal.querySelector('.modal-content'),
      { scale: 0.8, opacity: 0, y: 50 },
      { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
    );
  }
  console.log('Radio list opened');
}

/**
 * Closes the radio list modal with an animation.
 */
export function closeRadioList() {
  if (!radioModal) return;
  if (typeof gsap !== 'undefined' && radioModal.querySelector('.modal-content')) {
    gsap.to(radioModal.querySelector('.modal-content'),
      { scale: 0.8, opacity: 0, y: 50, duration: 0.3, ease: "power2.in",
        onComplete: () => { radioModal.style.display = 'none'; }
      }
    );
  } else {
    radioModal.style.display = 'none';
  }
  console.log('Radio list closed');
}

// --- Track & Radio List Updates ---

/**
 * Populates the track list modal with tracks from the current album.
 * @param {number} currentAlbumIndex - Index of the current album in the `albums` array.
 * @param {function} selectTrackCallback - Function to call when a track is selected.
 */
export function updateTrackListModal(currentAlbumIndex, selectTrackCallback) {
  if (!trackModal) return;
  const trackListContainer = trackModal.querySelector('.track-list');
  if (!trackListContainer) return;

  trackListContainer.innerHTML = '';
  if (albums[currentAlbumIndex] && albums[currentAlbumIndex].tracks) {
    albums[currentAlbumIndex].tracks.forEach((track, index) => {
      const trackLink = document.createElement('a');
      trackLink.href = '#';
      trackLink.onclick = (event) => {
        event.preventDefault();
        selectTrackCallback(track.src, track.title, index);
      };
      trackLink.textContent = track.title;
      trackListContainer.appendChild(trackLink);
    });
    console.log(`Track list updated for album: ${albums[currentAlbumIndex].name}`);
  } else {
    console.warn(`Album or tracks not found for index: ${currentAlbumIndex}`);
  }
}

const stationsPerPage = 6;
let stationDisplayCounts = { nigeria: 0, westAfrica: 0, international: 0 };

/**
 * Classifies a radio station into a region.
 * @param {object} station - The radio station object.
 * @returns {string} The region ('nigeria', 'westAfrica', 'international').
 */
function classifyStation(station) {
  const nigeriaLocations = ["Nigeria", "Lagos", "Ibadan", "Abuja", "Abeokuta", "Uyo", "Jos", "Kaduna", "Nassarawa", "Abia", "Ondo", "Calabar", "Aba"];
  const westAfricaLocations = ["Accra", "Ghana", "West Africa"];

  if (nigeriaLocations.some(loc => station.location.includes(loc))) return "nigeria";
  if (westAfricaLocations.some(loc => station.location.includes(loc))) return "westAfrica";
  return "international";
}

const groupedStations = { nigeria: [], westAfrica: [], international: [] };
radioStations.forEach(station => {
  const region = classifyStation(station);
  groupedStations[region].push(station);
});

/**
 * Populates the radio list modal, categorized by region.
 * @param {function} selectRadioCallback - Function to call when a radio station is selected.
 */
export function updateRadioListModal(selectRadioCallback) {
  if (!radioModal) return;
  stationDisplayCounts = { nigeria: 0, westAfrica: 0, international: 0 };

  ["nigeria", "westAfrica", "international"].forEach(region => {
    const container = document.getElementById(`${region}-stations`);
    const button = radioModal.querySelector(`button[onclick="window.loadMoreStations('${region}')"]`);
    if (container) container.innerHTML = '';
    if (button) button.style.display = groupedStations[region].length > 0 ? 'inline-block' : 'none';
    if (groupedStations[region].length > 0) {
        loadMoreStations(region, selectRadioCallback);
    }
  });
  console.log("Grouped and displayed radio stations by region");
}

/**
 * Loads more radio stations for a specific region into the modal.
 * @param {string} region - The region to load stations for ('nigeria', 'westAfrica', 'international').
 * @param {function} selectRadioCallback - Function to call when a radio station is selected.
 */
export function loadMoreStations(region, selectRadioCallback) {
  if (!radioModal) return;
  const container = document.getElementById(`${region}-stations`);
  const stations = groupedStations[region];
  const loadButton = radioModal.querySelector(`button[onclick="window.loadMoreStations('${region}')"]`);

  if (!container || !stations || !loadButton) return;

  const start = stationDisplayCounts[region];
  const end = Math.min(start + stationsPerPage, stations.length);

  for (let i = start; i < end; i++) {
    const station = stations[i];
    const globalIndex = radioStations.findIndex(rs => rs.url === station.url && rs.name === station.name);
    const stationLink = document.createElement("a");
    stationLink.href = "#";
    stationLink.onclick = (event) => {
        event.preventDefault();
        selectRadioCallback(station.url, `${station.name} - ${station.location}`, globalIndex, station.logo);
    };
    stationLink.textContent = `${station.name} (${station.location})`;
    container.appendChild(stationLink);
  }

  stationDisplayCounts[region] = end;

  if (stationDisplayCounts[region] >= stations.length) {
    loadButton.style.display = 'none';
  } else {
    loadButton.style.display = 'inline-block';
  }
}

// --- Chatbot & Sabi Bible ---
/**
 * Toggles the visibility of the Àríyò AI chatbot.
 * Updates ARIA attributes for accessibility.
 */
export function toggleChatbot() {
  if (!chatbotContainer) return;
  const bubbleContainer = document.querySelector('.chatbot-bubble-container');
  const isHidden = chatbotContainer.style.display === 'none' || !chatbotContainer.style.display;
  chatbotContainer.style.display = isHidden ? 'block' : 'none';
  if (bubbleContainer) {
    bubbleContainer.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  }
  console.log("Chatbot toggled. Current display:", chatbotContainer.style.display);
  const chatbotEmbed = chatbotContainer.querySelector("zapier-interfaces-chatbot-embed");
  if(chatbotEmbed && window.spoofedLocation){
    chatbotEmbed.setAttribute("language", window.spoofedLocation.language);
    chatbotEmbed.setAttribute("region", window.spoofedLocation.country);
    chatbotEmbed.setAttribute("timezone", window.spoofedLocation.timezone);
  }
}

/**
 * Toggles the visibility of the Sabi Bible chatbot.
 * Updates ARIA attributes for accessibility.
 */
export function toggleSabiBible() {
  if (!sabiBibleContainer) return;
  const bubbleContainer = document.querySelector('.sabi-bible-bubble-container');
  const isHidden = sabiBibleContainer.style.display === 'none' || !sabiBibleContainer.style.display;
  sabiBibleContainer.style.display = isHidden ? 'block' : 'none';
  if (bubbleContainer) {
    bubbleContainer.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
  }
  console.log("Sabi Bible toggled. Current display:", sabiBibleContainer.style.display);
  const sabiEmbed = sabiBibleContainer.querySelector("zapier-interfaces-chatbot-embed");
  if(sabiEmbed && window.spoofedLocation){
    sabiEmbed.setAttribute("language", window.spoofedLocation.language);
    sabiEmbed.setAttribute("region", window.spoofedLocation.country);
    sabiEmbed.setAttribute("timezone", window.spoofedLocation.timezone);
  }
}

// --- Background Cycler ---
const backgrounds = [
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI.jpg',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI2.jpg',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI3.jpg'
];
let currentBgIndex = 0;

/**
 * Starts the background image cycler for the body.
 */
export function startBackgroundCycler() {
  if (document.body && backgrounds.length > 0) {
    document.body.style.backgroundImage = `url(${backgrounds[currentBgIndex]})`;
    setInterval(() => {
      currentBgIndex = (currentBgIndex + 1) % backgrounds.length;
      document.body.style.backgroundImage = `url(${backgrounds[currentBgIndex]})`;
    }, 30000);
  }
}

// --- About Page Navigation ---
/**
 * Navigates to the About page, fetching its content and displaying it.
 * @param {function} savePlayerStateCallback - Callback function to save the current player state.
 */
export async function navigateToAbout(savePlayerStateCallback) {
  if (!mainContent) return;

  if (!aboutButtonGlobal) {
      const sidebarButtons = document.querySelectorAll('.sidebar button');
      aboutButtonGlobal = Array.from(sidebarButtons).find(btn => btn.textContent.includes('About Us') || btn.textContent.includes('Back to Player'));
      if (aboutButtonGlobal && !originalAboutButtonText) {
          originalAboutButtonText = aboutButtonGlobal.textContent;
          originalAboutButtonOnClick = aboutButtonGlobal.onclick;
      }
  }

  if (!mainContent.dataset.originalContentStored) {
    originalMainContentHTML = mainContent.innerHTML;
    mainContent.dataset.originalContentStored = 'true';
  }

  if(savePlayerStateCallback) savePlayerStateCallback();

  try {
    const response = await fetch('about.html');
    if (!response.ok) {
      console.error('Failed to fetch about.html:', response.status);
      mainContent.innerHTML = '<p>Error loading About page content.</p>';
      return;
    }
    const aboutHtmlText = await response.text();
    const parser = new DOMParser();
    const aboutDoc = parser.parseFromString(aboutHtmlText, 'text/html');

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = aboutDoc.body.innerHTML;

    const albumCoversDiv = tempDiv.querySelector('.album-covers');
    if (albumCoversDiv) {
      albumCoversDiv.innerHTML = '';
      albums.forEach(album => {
        const albumLink = document.createElement('a');
        albumLink.href = album.external_url || '#';
        if (album.external_url) {
            albumLink.target = '_blank';
        }
        const img = document.createElement('img');
        img.src = album.cover;
        img.alt = `${album.name} Album Cover`;
        img.title = album.name;
        const nameParagraph = document.createElement('p');
        nameParagraph.textContent = album.name;
        nameParagraph.style.cssText = 'color: #fff; font-size: 0.8rem; margin-top: 0.5rem;';
        const albumContainer = document.createElement('div');
        albumContainer.style.textAlign = 'center';
        albumContainer.appendChild(img);
        albumContainer.appendChild(nameParagraph);
        albumLink.appendChild(albumContainer);
        albumCoversDiv.appendChild(albumLink);
      });
    }

    mainContent.innerHTML = tempDiv.innerHTML;
    mainContent.classList.add('about-page-content'); // Add class to scope styles

    if (window.location.pathname !== '/about.html') {
        let base = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
        if (base.endsWith("index.html/")) base = base.substring(0, base.length - "index.html/".length);
        if (!base.endsWith('/')) base += '/';
        history.pushState({ page: 'about' }, 'About Us', base + 'about.html');
    }

    if (aboutButtonGlobal) {
      aboutButtonGlobal.textContent = '🎵 Back to Player';
      aboutButtonGlobal.onclick = () => navigateToHome(savePlayerStateCallback);
    }
    mainContent.style.position = 'relative';
    mainContent.style.zIndex = '101';
    if (typeof gsap !== 'undefined' && contentOpacityTarget) {
        gsap.to(contentOpacityTarget, { opacity: 1, duration: 0.5 });
    } else if (contentOpacityTarget) {
        contentOpacityTarget.style.opacity = '1';
    }
  } catch (error) {
    console.error('Error navigating to About page:', error);
    if (mainContent) mainContent.innerHTML = '<p>Error loading About page content.</p>';
  }
}

/**
 * Navigates back to the home/player view from the About page.
 * @param {function} savePlayerStateCallback - Callback function to save the current player state (passed to re-assign to About Us button).
 */
export function navigateToHome(savePlayerStateCallback) {
  if (!mainContent) return;

  mainContent.innerHTML = originalMainContentHTML || '<div id="newsContainer" class="news-container" style="display: none;"></div><h2>Select an option from the sidebar</h2>';
  if(originalMainContentHTML) mainContent.dataset.originalContentStored = 'true';
  mainContent.classList.remove('about-page-content');

  let basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
  if (basePath.endsWith("about.html/")) basePath = basePath.substring(0, basePath.length - "about.html/".length);
  if (!basePath.endsWith('/')) basePath += '/';

  if (window.location.pathname.includes('about.html')) {
      history.pushState({ page: 'home' }, 'Home', basePath);
  }

  if (aboutButtonGlobal && originalAboutButtonText) { // originalAboutButtonOnClick is tricky here as it was navigateToAbout
    aboutButtonGlobal.textContent = originalAboutButtonText;
    aboutButtonGlobal.onclick = () => navigateToAbout(savePlayerStateCallback);
  }

  mainContent.style.zIndex = '';
  mainContent.style.position = '';
  if (typeof gsap !== 'undefined' && contentOpacityTarget) {
    gsap.to(contentOpacityTarget, { opacity: 1, duration: 0.5 });
  } else if (contentOpacityTarget) {
    contentOpacityTarget.style.opacity = '1';
  }
}

// --- PWA Install Button ---
let deferredInstallPrompt = null;
/**
 * Sets up handlers for PWA installation prompt.
 */
export function setupPwaInstallHandlers() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      console.log('Install prompt available');

      const existingInstallBtn = document.getElementById('installPwaButton');
      if (existingInstallBtn) existingInstallBtn.remove();

      const installBtn = document.createElement('button');
      installBtn.id = 'installPwaButton';
      installBtn.textContent = 'Install Àríyò AI';
      installBtn.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: #ff758c; color: white; padding: 10px 20px;
        border: none; border-radius: 5px; z-index: 1000; cursor: pointer;
      `;
      installBtn.onclick = () => {
        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            deferredInstallPrompt.userChoice.then((choiceResult) => {
              if (choiceResult.outcome === 'accepted') {
                console.log('User installed the app');
              }
              deferredInstallPrompt = null;
              installBtn.remove();
            });
        }
      };
      document.body.appendChild(installBtn);
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      const installBtn = document.getElementById('installPwaButton');
      if (installBtn) installBtn.remove();
      deferredInstallPrompt = null;
    });
}

// --- GSAP Animations for Sidebar Buttons ---
/**
 * Adds hover and click animations to sidebar buttons using GSAP.
 */
export function setupSidebarButtonAnimations() {
  if (typeof gsap !== 'undefined') {
    document.querySelectorAll('.sidebar button').forEach(button => {
      button.addEventListener('mouseenter', () => {
        gsap.to(button, { scale: 1.08, duration: 0.3, ease: "power2.out" });
      });
      button.addEventListener('mouseleave', () => {
        gsap.to(button, { scale: 1, duration: 0.3, ease: "power2.out" });
      });
      button.addEventListener('click', () => {
        gsap.to(button, {
          scale: 0.95,
          duration: 0.1,
          ease: "power1.in",
          onComplete: () => gsap.to(button, { scale: 1, duration: 0.2, ease: "bounce.out" })
        });
      });
    });
  }
}

/**
 * Animates the entry of the main content area.
 */
export function animateMainContentEntry() {
    if (typeof gsap !== 'undefined' && contentOpacityTarget) {
        gsap.to(contentOpacityTarget, { opacity: 1, duration: 0.5, delay: 0.2 });
    } else if (contentOpacityTarget) {
        contentOpacityTarget.style.opacity = '1';
    }
}

/**
 * Updates the player UI with track details.
 * @param {object} track - Object containing track details (title, artist, year, albumName, cover).
 */
export function updatePlayerUITrackDetails(track) {
    const trackInfoEl = document.getElementById('trackInfo');
    const trackArtistEl = document.getElementById('trackArtist');
    const trackYearEl = document.getElementById('trackYear');
    const trackAlbumEl = document.getElementById('trackAlbum');
    const albumCoverEl = document.getElementById('albumCover');

    if (trackInfoEl) trackInfoEl.textContent = track.title || 'Unknown Title';
    if (trackArtistEl) trackArtistEl.textContent = track.artist || 'Unknown Artist';
    if (trackYearEl) trackYearEl.textContent = track.year || '';
    if (trackAlbumEl) trackAlbumEl.textContent = track.albumName ? `Album: ${track.albumName}` : '';
    if (albumCoverEl && track.cover) albumCoverEl.src = track.cover;
}

/**
 * Updates the track duration display in the UI.
 * @param {string} currentTimeText - Formatted current time string.
 * @param {string} durationText - Formatted total duration string or "Live".
 */
export function updatePlayerUIDuration(currentTimeText, durationText) {
    const trackDurationEl = document.getElementById('trackDuration');
    if (trackDurationEl) trackDurationEl.textContent = `${currentTimeText} / ${durationText}`;
}

/**
 * Updates the seek bar's value.
 * @param {number} value - The new value for the seek bar (0-100).
 */
export function updateSeekBar(value) {
    const seekBarEl = document.getElementById('seekBar');
    if (seekBarEl) seekBarEl.value = value;
}

/**
 * Toggles the visibility of the seek bar.
 * @param {boolean} visible - True to show, false to hide.
 */
export function toggleSeekBarVisibility(visible) {
    const seekBarEl = document.getElementById('seekBar');
    if (seekBarEl) seekBarEl.style.display = visible ? 'block' : 'none';
}

/**
 * Shows the loading spinner and hides the album art.
 */
export function showLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    const albumArt = document.getElementById('albumCover');
    if (spinner) spinner.style.display = 'block';
    if (albumArt) albumArt.style.display = 'none';
}

/**
 * Hides the loading spinner and shows the album art.
 */
export function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    const albumArt = document.getElementById('albumCover');
    if (spinner) spinner.style.display = 'none';
    if (albumArt) albumArt.style.display = 'block';
}

/**
 * Toggles the visibility of the retry button.
 * @param {boolean} show - True to show, false to hide.
 */
export function toggleRetryButton(show) {
    const button = document.getElementById('retryButton');
    if (button) button.style.display = show ? 'block' : 'none';
}

/**
 * Toggles the visibility of the cache/download button.
 * @param {boolean} show - True to show, false to hide.
 */
export function toggleCacheButton(show) {
    const button = document.getElementById('cacheButton');
    if (button) button.style.display = show ? 'block' : 'none';
}

/**
 * Updates the width of the progress bar.
 * @param {number} percentage - The percentage width (0-100).
 */
export function updateProgressBar(percentage) {
    const bar = document.getElementById('progressBar')?.querySelector('div');
    if (bar) bar.style.width = `${percentage}%`;
}

/**
 * Toggles the visibility of the progress bar.
 * @param {boolean} show - True to show, false to hide.
 */
export function toggleProgressBarVisibility(show) {
    const barContainer = document.getElementById('progressBar');
    if (barContainer) barContainer.style.display = show ? 'block' : 'none';
}

/**
 * Updates the streak information display.
 * @param {number} streak - The current streak count.
 */
export function updateStreakInfo(streak) {
    const streakInfoEl = document.getElementById('streakInfo');
    if (streakInfoEl) streakInfoEl.textContent = `🔥 Current Streak: ${streak} days`;
}

/**
 * Updates the shuffle status display text.
 * @param {string} text - The text to display for shuffle status.
 */
export function updateShuffleStatusInfo(text) {
    const shuffleInfoEl = document.getElementById('shuffleStatusInfo');
    if (shuffleInfoEl) shuffleInfoEl.textContent = text;
}

/**
 * Updates the text content of the shuffle button.
 * @param {string} text - The new text/icon for the shuffle button.
 */
export function updateShuffleButtonText(text) {
    const shuffleBtn = document.querySelector(".music-controls.icons-only button[aria-label='Toggle shuffle']");
    if (shuffleBtn) shuffleBtn.textContent = text;
}

/**
 * Toggles the spinning animation class on the album cover.
 * @param {boolean} shouldSpin - True to add spin class, false to remove.
 */
export function toggleVinylRotation(shouldSpin) {
    const albumCoverEl = document.getElementById('albumCover');
    if (albumCoverEl) {
        if (shouldSpin) {
            albumCoverEl.classList.add('spin');
        } else {
            albumCoverEl.classList.remove('spin');
        }
    }
}

/**
 * Initializes a spoofed location object on the window for Zapier embeds.
 */
export function initializeSpoofedLocation() {
    window.spoofedLocation = {country:"US",timezone:"America/New_York",language:"en-US"};
    console.log("US Spoof Active for Zapier:", window.spoofedLocation);
}
