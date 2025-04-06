// service-worker.js
const CACHE_VERSION = 'v3'; // Upgraded version for static cache
const STATIC_CACHE_NAME = `ariyo-ai-cache-${CACHE_VERSION}`; // Cache for app shell and static assets
const AUDIO_CACHE_NAME = `ariyo-ai-audio-cache-v2`; // Upgraded version for audio cache
const DYNAMIC_CACHE_NAME = `ariyo-ai-dynamic-${CACHE_VERSION}`; // New dynamic cache for runtime assets

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
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/chatbot-screenshot.png', // Chatbot screenshot
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Sabi%20Bible.png', // Sabi Bible icon
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo.png', // Icon 192x192
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo_AI.png', // Icon 512x512
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo-180x180.png', // Icon 180x180
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo-144x144.png', // Icon 144x144
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo-256x256.png', // NEW: Icon 256x256 from upgraded manifest
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo-384x384.png', // NEW: Icon 384x384 from upgraded manifest
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/music-player.png', // Screenshot 1
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/offline-audio.mp3' // Offline audio fallback
];

// Install event: Cache app shell and static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell and static assets');
        return cache.addAll(urlsToCache.filter(url => url !== '')); // Filter out invalid URLs
      })
      .catch(err => console.error('Cache install failed:', err))
      .then(() => self.skipWaiting()) // Force immediate activation
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [STATIC_CACHE_NAME, Fennell
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => !cacheWhitelist.includes(name))
          .map(name => caches.delete(name))
      );
    })
    .then(() => self.clients.claim())
    .then(() => console.log('Service Worker: Activated, old caches cleared'))
  );
});

// Fetch event: Handle requests with appropriate strategies
self.addEventListener('fetch', event => {
  const requestUrl = event.request.url;

  // Handle audio files (.mp3, .aac)
  if (requestUrl.match(/\.(mp3|aac)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            console.log(`Serving cached audio: ${requestUrl}`);
            return cachedResponse;
          }
          // Fetch with timeout for streaming
          const fetchPromise = fetch(event.request, { cache: 'no-store' })
            .then(networkResponse => {
              console.log(`Streamed audio from network: ${requestUrl}`);
              // Cache audio dynamically if not already cached
              caches.open(AUDIO_CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
              });
              return networkResponse;
            })
            .catch(() => {
              return caches.match('https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/offline-audio.mp3')
                .then(fallbackAudio => {
                  if (fallbackAudio) {
                    console.log('Serving offline audio fallback');
                    return fallbackAudio;
                  }
                  console.warn('No offline audio available');
                  return new Response(
                    new Blob([JSON.stringify({ error: 'Offline - Audio unavailable' })], { type: 'application/json' }),
                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                  );
                });
            });

          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Audio fetch timeout')), 10000)
          );

          return Promise.race([fetchPromise, timeoutPromise]);
        })
    );
    return;
  }

  // Handle images and static assets (cache-first)
  if (requestUrl.match(/\.(png|jpg|jpeg|svg|ico)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            console.log(`Serving cached image: ${requestUrl}`);
            return response;
          }
          return fetchAndCache(event.request, STATIC_CACHE_NAME);
        })
    );
    return;
  }

  // Handle dynamic resources (network-first with cache fallback)
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse.ok) {
          caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              console.log(`Serving cached resource: ${requestUrl}`);
              return cachedResponse;
            }
            console.log('Offline, falling back to index.html');
            return caches.match('/index.html');
          });
      })
  );
});

// Utility function to fetch and cache responses
function fetchAndCache(request, cacheName) {
  return fetch(request)
    .then(networkResponse => {
      if (!networkResponse || networkResponse.status !== 200) {
        console.warn(`Fetch failed or invalid response for ${request.url}: ${networkResponse.status}`);
        return networkResponse;
      }
      const responseToCache = networkResponse.clone();
      caches.open(cacheName)
        .then(cache => {
          cache.put(request, responseToCache);
          console.log(`Cached new resource in ${cacheName}: ${request.url}`);
        })
        .catch(err => console.error(`Failed to cache ${request.url}:`, err));
      return networkResponse;
    })
    .catch(err => {
      console.error(`Fetch error for ${request.url}:`, err);
      throw err;
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

// Background Sync: Handle streak updates or other offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-streak') {
    event.waitUntil(
      // Placeholder for streak sync logic (e.g., send to server when online)
      console.log('Service Worker: Syncing streak data')
      // Add actual sync logic here if needed
    );
  }
});