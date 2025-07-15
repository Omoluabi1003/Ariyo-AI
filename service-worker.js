const CACHE_PREFIX = 'ariyo-ai-cache-v2';

self.addEventListener('install', event => {
  event.waitUntil(
    fetch('/version.json')
      .then(response => response.json())
      .then(data => {
        const CACHE_NAME = `${CACHE_PREFIX}-${data.version}`;
        const urlsToCache = [
          '/',
          '/main.html',
          '/manifest.json',
          'icons/Ariyo.png',
          'icons/Ariyo_AI.png',
          'scripts/data.js',
          'scripts/player.js',
          'scripts/ui.js',
          'scripts/main.js',
          'color-scheme.js'
        ];
        return caches.open(CACHE_NAME).then(cache => {
          return cache.addAll(urlsToCache);
        });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    fetch('/version.json')
      .then(response => response.json())
      .then(data => {
        const CACHE_NAME = `${CACHE_PREFIX}-${data.version}`;
        return caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              if (cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME) {
                return caches.delete(cacheName);
              }
            })
          );
        });
      })
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
                        caches.open(CACHE_PREFIX + '-runtime')
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                );
            })
    );
});
