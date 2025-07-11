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
  'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/FaithandB.jpg', // Needs album cover
  'https://raw.githubusercontent.com/Omoluabi1003/afro-gospel-stream/main/Neo-Soul.jpg', // Holy Vibes Only album cover
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/chatbot-screenshot.png', // Assuming this is not critical for app shell
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Sabi%20Bible.png', // Assuming this is not critical for app shell
  'icons/Ariyo.png',
  'icons/Ariyo_AI.png',
  'icons/Ariyo-180x180.png',
  'icons/Ariyo-144x144.png',
  'icons/Ariyo-256x256.png',
  'icons/Ariyo-384x384.png',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/music-player.png', // Assuming this is not critical for app shell
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/offline-audio.mp3',
  '/about.html' // Add about page to cache
];

// Install event: Cache app shell and static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
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
            return caches.delete(name);
          })
      );
    })
    .then(() => self.clients.claim())
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
            // Update access time for LRU eviction
            updateAudioAccessTime(requestUrl);
            return cachedResponse;
          }
          const fetchPromise = fetch(event.request, { cache: 'no-store' })
            .then(networkResponse => {
              caches.open(AUDIO_CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
                // Update access time and manage cache size
                updateAudioAccessTime(requestUrl);
                manageAudioCacheSize();
              });
              return networkResponse;
            })
            .catch(() => {
              return caches.match('https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/offline-audio.mp3')
                .then(fallbackAudio => {
                  if (fallbackAudio) {
                    return fallbackAudio;
                  }
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
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
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
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return caches.match('/index.html')
              .then(fallback => {
                if (fallback) return fallback;
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
        return networkResponse;
      }
      const responseToCache = networkResponse.clone();
      caches.open(cacheName)
        .then(cache => {
          cache.put(request, responseToCache);
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
              self.clients.matchAll().then(clients => {
                clients.forEach(client => client.postMessage({ type: 'TRACK_CACHED', url: trackUrl }));
              });
            } else {
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
      // Add actual sync logic here if needed, e.g., send streak data to server
    );
  }
});
