const CACHE_PREFIX = 'ariyo-ai-cache-v5';
let CACHE_NAME;

self.addEventListener('install', event => {
  // Activate this service worker immediately after installation
  self.skipWaiting();
  event.waitUntil(
    fetch('/version.json', { cache: 'no-store' })
      .then(response => response.json())
      .then(data => {
        CACHE_NAME = `${CACHE_PREFIX}-${data.version}`;
        const urlsToCache = [
          '/',
          '/index.html',
          '/main.html',
          '/about.html',
          'style.css',
          'color-scheme.css',
          'scripts/data.js',
          'scripts/player.js',
          'scripts/ui.js',
          'scripts/main.js',
          'color-scheme.js',
          'picture-game.html',
          'picture-game.css',
          'picture-game.js',
          'tetris.html',
          'tetris.css',
          'tetris.js',
          'tetris-color-scheme.css',
          'tetris-color-scheme.js',
          'word-search.html',
          'word-search.css',
          'word-search.js',
          'word-search-grid.js'
        ];
        return caches.open(CACHE_NAME).then(cache => {
          return cache.addAll(urlsToCache);
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('/icons/') || event.request.url.includes('manifest.json')) {
        return;
    }
    if (event.request.destination === 'audio' || /\.mp3(\?|$)/.test(event.request.url)) {
        return;
    }
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                const fetchRequest = event.request.clone();
                return fetch(fetchRequest).then(
                    response => {
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        const responseToCache = response.clone();
                        // Limit cache size to avoid unbounded growth
                        caches.open(CACHE_NAME + '-runtime').then(cache => {
                            cache.keys().then(keys => {
                                if (keys.length > 50) {
                                    cache.delete(keys[0]);
                                }
                                cache.put(event.request, responseToCache);
                            });
                        });
                        return response;
                    }
                ).catch(error => {
                    console.error('Fetch failed:', error);
                    // You could return a custom offline page here
                });
            })
    );
});

