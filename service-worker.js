const CACHE_PREFIX = 'ariyo-ai-cache-v2';
let CACHE_NAME;

self.addEventListener('install', event => {
  event.waitUntil(
    fetch('/version.json')
      .then(response => response.json())
      .then(data => {
        CACHE_NAME = `${CACHE_PREFIX}-${data.version}`;
        const urlsToCache = [
          '/',
          '/main.html',
          '/manifest.json',
          'icons/Ariyo.png',
          'scripts/data.js',
          'scripts/player.js',
          'scripts/ui.js',
          'scripts/main.js',
          'color-scheme.js',
          'word-search.html',
          'word-search.css',
          'word-search.js'
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
          if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
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
                        caches.open(CACHE_NAME + '-runtime')
                            .then(cache => {
                                cache.put(event.request, responseToCache);
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
