// service-worker.js
const CACHE_NAME = 'ariyo-ai-cache-v2'; // Cache for app shell and static assets
const AUDIO_CACHE_NAME = 'ariyo-ai-audio-cache-v1'; // Separate cache for audio files
const urlsToCache = [
  '/', // Root URL
  '/index.html', // Main HTML file
  '/manifest.json', // PWA manifest
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&family=Montserrat:wght@400;700&display=swap', // Google Fonts
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/js/all.min.js', // Font Awesome
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js', // GSAP
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI.jpg', // Background image 1
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI2.jpg', // Background image 2
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI3.jpg', // Background image 3
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Kindness%20Cover%20Art.jpg', // Album cover 1
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Street_Sense_Album_Cover.jpg', // Album cover 2
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/chatbot.png', // Chatbot icon and screenshot
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Sabi%20Bible.png', // Sabi Bible icon
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo.png', // Icon 192x192
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo_AI.png', // Icon 512x512
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo-180x180.png', // Icon 180x180
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo-144x144.png', // Icon 144x144 (NEW: Added per manifest)
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/music-player.png', // Screenshot 1
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/offline-audio.mp3' // NEW: Offline audio fallback (comment out if not added)
];

// Install event: Cache app shell and static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell and static assets');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Cache install failed:', err))
      .then(() => self.skipWaiting()) // Force immediate activation
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, AUDIO_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => !cacheWhitelist.includes(name))
          .map(name => caches.delete(name))
      );
    })
    .then(() => self.clients.claim()) // Take control of clients immediately
    .then(() => console.log('Service worker activated, old caches cleared'))
  );
});

// Fetch event: Handle requests with appropriate strategies
self.addEventListener('fetch', event => {
  const requestUrl = event.request.url;

  // Handle audio files (.mp3)
  if (requestUrl.includes('.mp3')) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            console.log(`Serving cached audio: ${requestUrl}`);
            return cachedResponse;
          }
          // Fetch from network with no-store to ensure fresh streaming
          return fetch(event.request, { cache: 'no-store' })
            .then(networkResponse => {
              console.log(`Streamed audio from network: ${requestUrl}`);
              return networkResponse;
            })
            .catch(() => {
              // Offline fallback: Use cached offline audio if available, otherwise return error
              return caches.match('https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/offline-audio.mp3')
                .then(fallbackAudio => {
                  if (fallbackAudio) {
                    console.log('Serving offline audio fallback');
                    return fallbackAudio;
                  }
                  console.warn('No offline audio available, returning error');
                  return new Response(
                    new Blob([JSON.stringify({ error: 'Offline - Audio unavailable' })], { type: 'application/json' }),
                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                  );
                });
            });
        })
    );
    return;
  }

  // Handle images and other static assets
  if (requestUrl.match(/\.(png|jpg|jpeg|svg|ico)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            console.log(`Serving cached image: ${requestUrl}`);
            return response;
          }
          return fetchAndCache(event.request);
        })
    );
    return;
  }

  // Default strategy: Cache-first, fallback to network, then offline page
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log(`Serving cached resource: ${requestUrl}`);
          return response;
        }
        return fetchAndCache(event.request)
          .catch(() => {
            console.log('Offline, falling back to index.html');
            return caches.match('/index.html');
          });
      })
  );
});

// Utility function to fetch and cache responses
function fetchAndCache(request) {
  return fetch(request)
    .then(networkResponse => {
      if (!networkResponse || networkResponse.status !== 200) {
        console.warn(`Fetch failed or invalid response for ${request.url}: ${networkResponse.status}`);
        return networkResponse;
      }
      const responseToCache = networkResponse.clone();
      caches.open(CACHE_NAME)
        .then(cache => {
          cache.put(request, responseToCache);
          console.log(`Cached new resource: ${request.url}`);
        })
        .catch(err => console.error(`Failed to cache ${request.url}:`, err));
      return networkResponse;
    })
    .catch(err => {
      console.error(`Fetch error for ${request.url}:`, err);
      throw err; // Let the offline fallback handle it
    });
}

// Message event: Handle dynamic caching requests from the app (e.g., for audio tracks)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CACHE_TRACK') {
    const trackUrl = event.data.url;
    caches.open(AUDIO_CACHE_NAME)
      .then(cache => {
        return fetch(trackUrl, { cache: 'no-store' })
          .then(response => {
            if (response.ok) {
              cache.put(trackUrl, response.clone());
              console.log(`Cached audio track: ${trackUrl}`);
              // Notify clients of successful caching
              self.clients.matchAll().then(clients => {
                clients.forEach(client => client.postMessage({ type: 'TRACK_CACHED', url: trackUrl }));
              });
            } else {
              console.warn(`Failed to fetch track ${trackUrl}: ${response.status}`);
            }
          })
          .catch(err => console.error(`Failed to cache track ${trackUrl}:`, err));
      });
  }
});