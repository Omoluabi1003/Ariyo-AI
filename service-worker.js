const CACHE_NAME = 'ariyo-ai-cache-v4';
const urlsToCache = [
    '/',
    '/index.html',
    '/main.html',
    '/manifest.json',
    'icons/Ariyo.png',
    'scripts/data.js',
    'scripts/main.js',
    'color-scheme.js',
    'word-search.html',
    'word-search.css',
    'word-search.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
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
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});
