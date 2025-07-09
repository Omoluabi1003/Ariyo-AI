const CACHE_VERSION = 'v3';
const STATIC_CACHE_NAME = `ariyo-ai-cache-${CACHE_VERSION}`;
const AUDIO_CACHE_NAME = `ariyo-ai-audio-cache-v2`;
const DYNAMIC_CACHE_NAME = `ariyo-ai-dynamic-${CACHE_VERSION}`;

// Static assets to cache during install
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
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo.png',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo_AI.png',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo-180x180.png',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo-144x144.png',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo-256x256.png',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo-384x384.png',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/music-player.png',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/offline-audio.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache.filter(url => url !== ''))
          .catch(err => console.error('Cache install failed for some assets:', err));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [STATIC_CACHE_NAME, AUDIO_CACHE_NAME, DYNAMIC_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => !cacheWhitelist.includes(name))
          .map(name => caches.delete(name))
      );
    })
    .then(() => self.clients.claim())
  );
});

// Utility function with retry logic
async function fetchWithRetry(request, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(request, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      return response;
    } catch (err) {
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

function fetchAndCache(request, cacheName) {
  return fetchWithRetry(request)
    .then(networkResponse => {
      if (!networkResponse || networkResponse.status !== 200) {
        return networkResponse;
      }
      const responseToCache = networkResponse.clone();
      caches.open(cacheName)
        .then(cache => cache.put(request, responseToCache));
      return networkResponse;
    })
    .catch(err => {
      console.error(`Fetch error for ${request.url}:`, err);
      throw err;
    });
}

self.addEventListener('fetch', event => {
  const requestUrl = event.request.url;

  // Handle audio files
  if (requestUrl.match(/\.(mp3|aac)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            updateAudioAccessTime(requestUrl);
            return cachedResponse;
          }
          const fetchPromise = fetchWithRetry(event.request)
            .then(networkResponse => {
              caches.open(AUDIO_CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
                updateAudioAccessTime(requestUrl);
                manageAudioCacheSize();
              });
              return networkResponse;
            })
            .catch(() => {
              return caches.match('https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/offline-audio.mp3')
                .then(fallbackAudio => fallbackAudio || new Response(
                  JSON.stringify({ error: 'Offline - Audio unavailable' }),
                  { status: 503, headers: { 'Content-Type': 'application/json' } }
                ));
            });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Audio fetch timeout')), 15000) // Increased timeout
          );

          return Promise.race([fetchPromise, timeoutPromise]);
        })
    );
    return;
  }

  // Handle images and static assets
  if (requestUrl.match(/\.(png|jpg|jpeg|svg|ico)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetchAndCache(event.request, STATIC_CACHE_NAME))
    );
    return;
  }

  // Handle Google Fonts
  if (requestUrl.includes('fonts.googleapis.com') || requestUrl.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetchWithRetry(event.request)
        .then(networkResponse => {
          if (networkResponse.ok) {
            caches.open(DYNAMIC_CACHE_NAME)
              .then(cache => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request)
            .then(cachedResponse => cachedResponse || new Response('', { status: 503 }));
        })
    );
    return;
  }

  // Handle dynamic resources
  event.respondWith(
    fetchWithRetry(event.request)
      .then(networkResponse => {
        if (networkResponse.ok) {
          caches.open(DYNAMIC_CACHE_NAME)
            .then(cache => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) return cachedResponse;
            return caches.match('/index.html')
              .then(fallback => fallback || new Response(
                '<h1>Offline</h1><p>Sorry, you are offline and this page is not available.</p>',
                { status: 503, headers: { 'Content-Type': 'text/html' } }
              ));
          });
      })
  );
});

// LRU Cache Management
const MAX_AUDIO_CACHE_SIZE = 10;
const audioAccessTimes = new Map();

function updateAudioAccessTime(url) {
  audioAccessTimes.set(url, Date.now());
}

async function manageAudioCacheSize() {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const keys = await cache.keys();
  if (keys.length > MAX_AUDIO_CACHE_SIZE) {
    const sortedEntries = Array.from(audioAccessTimes.entries())
      .filter(([url]) => keys.some(key => key.url === url))
      .sort((a, b) => a[1] - b[1]);
    const urlsToDelete = sortedEntries.slice(0, keys.length - MAX_AUDIO_CACHE_SIZE);
    for (const [url] of urlsToDelete) {
      await cache.delete(url);
      audioAccessTimes.delete(url);
    }
  }
}

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CACHE_TRACK') {
    const trackUrl = event.data.url;
    caches.open(AUDIO_CACHE_NAME)
      .then(cache => {
        return fetchWithRetry(new Request(trackUrl))
          .then(response => {
            if (response.ok) {
              cache.put(trackUrl, response.clone());
              updateAudioAccessTime(trackUrl);
              manageAudioCacheSize();
              self.clients.matchAll().then(clients => {
                clients.forEach(client => client.postMessage({ type: 'TRACK_CACHED', url: trackUrl }));
              });
            }
          })
          .catch(err => console.error(`Failed to cache track ${trackUrl}:`, err));
      });
  }
});

self.addEventListener('sync', event => {
  if (event.tag === 'sync-streak') {
    event.waitUntil(
      console.log('Syncing streak data')
      // Add sync logic here if needed
    );
  }
});
