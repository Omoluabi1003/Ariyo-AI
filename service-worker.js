// service-worker.js
const CACHE_VERSION = 'v3';
const STATIC_CACHE_NAME = `ariyo-ai-cache-${CACHE_VERSION}`;
const AUDIO_CACHE_NAME = `ariyo-ai-audio-cache-v2`;
const DYNAMIC_CACHE_NAME = `ariyo-ai-dynamic-${CACHE_VERSION}`;

// Static assets to cache during install (removed Google Fonts due to CORS)
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI.jpg',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI2.jpg',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI3.jpg',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Kindness%20Cover%20Art.jpg',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Street_Sense_Album_Cover.jpg',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/chatbot-screenshot.png',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Sabi%20Bible.png',
  '/icons/Ariyo.png',
  '/icons/Ariyo_AI.png',
  '/icons/Ariyo-180x180.png',
  '/icons/Ariyo-144x144.png',
  '/icons/Ariyo-256x256.png',
  '/icons/Ariyo-384x384.png',
  '/images/radio_default_logo.jpg',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/music-player.png',
  '/audio/offline-audio.mp3' // Changed to local path
];

// Install event: Cache app shell and static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell and static assets');
        return cache.addAll(urlsToCache.filter(url => url !== ''));
      })
      .catch(err => console.error('Cache install failed:', err))
      .then(() => self.skipWaiting())
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [STATIC_CACHE_NAME, AUDIO_CACHE_NAME, DYNAMIC_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => !cacheWhitelist.includes(name))
          .map(name => {
            console.log(`Service Worker: Deleting old cache: ${name}`);
            return caches.delete(name);
          })
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
            console.log(`Service Worker: Serving cached audio: ${requestUrl}`);
            // Update access time for LRU eviction
            updateAudioAccessTime(requestUrl);
            return cachedResponse;
          }
          const fetchPromise = fetch(event.request, { cache: 'no-store' })
            .then(networkResponse => {
              console.log(`Service Worker: Streamed audio from network: ${requestUrl}`);
              caches.open(AUDIO_CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
                // Update access time and manage cache size
                updateAudioAccessTime(requestUrl);
                manageAudioCacheSize();
              });
              return networkResponse;
            })
            .catch(() => {
              console.warn(`Service Worker: Audio fetch failed for ${requestUrl}, serving fallback`);
              return caches.match('/audio/offline-audio.mp3') // Changed to local path
                .then(fallbackAudio => {
                  if (fallbackAudio) {
                    console.log('Service Worker: Serving offline audio fallback');
                    return fallbackAudio;
                  }
                  console.warn('Service Worker: No offline audio available');
                  return new Response(
                    new Blob([JSON.stringify({ error: 'Offline - Audio unavailable' })], { type: 'application/json' }),
                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                  );
                });
            });

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
            console.log(`Service Worker: Serving cached image: ${requestUrl}`);
            return response;
          }
          return fetchAndCache(event.request, STATIC_CACHE_NAME);
        })
    );
    return;
  }

  // Handle Google Fonts dynamically (network-first, cache fallback)
  if (requestUrl.includes('fonts.googleapis.com') || requestUrl.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse.ok) {
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
              console.log(`Service Worker: Cached Google Font: ${requestUrl}`);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                console.log(`Service Worker: Serving cached Google Font: ${requestUrl}`);
                return cachedResponse;
              }
              console.warn(`Service Worker: Google Font unavailable offline: ${requestUrl}`);
              return new Response('', { status: 503 });
            });
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
            console.log(`Service Worker: Cached dynamic resource: ${requestUrl}`);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              console.log(`Service Worker: Serving cached resource: ${requestUrl}`);
              return cachedResponse;
            }
            console.log('Service Worker: Offline, falling back to index.html');
            return caches.match('/index.html')
              .then(fallback => {
                if (fallback) return fallback;
                console.warn('Service Worker: No fallback available');
                return new Response(
                  '<h1>Offline</h1><p>Sorry, you are offline and this page is not available.</p>',
                  { status: 503, headers: { 'Content-Type': 'text/html' } }
                );
              });
          });
      })
  );
});

// Utility function to fetch and cache responses
function fetchAndCache(request, cacheName) {
  return fetch(request)
    .then(networkResponse => {
      if (!networkResponse || networkResponse.status !== 200) {
        console.warn(`Service Worker: Fetch failed or invalid response for ${request.url}: ${networkResponse.status}`);
        return networkResponse;
      }
      const responseToCache = networkResponse.clone();
      caches.open(cacheName)
        .then(cache => {
          cache.put(request, responseToCache);
          console.log(`Service Worker: Cached new resource in ${cacheName}: ${request.url}`);
        })
        .catch(err => console.error(`Service Worker: Failed to cache ${request.url}:`, err));
      return networkResponse;
    })
    .catch(err => {
      console.error(`Service Worker: Fetch error for ${request.url}:`, err);
      throw err;
    });
}

// LRU Cache Management for Audio
const MAX_AUDIO_CACHE_SIZE = 10; // Maximum number of audio files to cache
const audioAccessTimes = new Map(); // Track access times for LRU eviction

function updateAudioAccessTime(url) {
  audioAccessTimes.set(url, Date.now());
  console.log(`Service Worker: Updated access time for ${url}`);
}

async function manageAudioCacheSize() {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const keys = await cache.keys();
  if (keys.length > MAX_AUDIO_CACHE_SIZE) {
    const sortedEntries = Array.from(audioAccessTimes.entries())
      .filter(([url]) => keys.some(key => key.url === url))
      .sort((a, b) => a[1] - b[1]); // Sort by access time (oldest first)
    const urlsToDelete = sortedEntries.slice(0, keys.length - MAX_AUDIO_CACHE_SIZE);
    for (const [url] of urlsToDelete) {
      await cache.delete(url);
      audioAccessTimes.delete(url);
      console.log(`Service Worker: Evicted audio from cache (LRU): ${url}`);
    }
  }
}

// Message event: Handle dynamic caching requests from the app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CACHE_TRACK') {
    const trackUrl = event.data.url;
    caches.open(AUDIO_CACHE_NAME)
      .then(cache => {
        return fetch(trackUrl, { cache: 'no-store' })
          .then(response => {
            if (response.ok) {
              cache.put(trackUrl, response.clone());
              updateAudioAccessTime(trackUrl);
              manageAudioCacheSize();
              console.log(`Service Worker: Cached audio track: ${trackUrl}`);
              self.clients.matchAll().then(clients => {
                clients.forEach(client => client.postMessage({ type: 'TRACK_CACHED', url: trackUrl }));
              });
            } else {
              console.warn(`Service Worker: Failed to fetch track ${trackUrl}: ${response.status}`);
            }
          })
          .catch(err => console.error(`Service Worker: Failed to cache track ${trackUrl}:`, err));
      });
  }
});

// Background Sync: Handle streak updates or other offline actions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-streak') {
    event.waitUntil(
      console.log('Service Worker: Syncing streak data')
      // Add actual sync logic here if needed, e.g., send streak data to server
    );
  }
});
