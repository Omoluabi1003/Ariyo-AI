// service-worker.js
const CACHE_NAME = 'ariyo-ai-cache-v1';
const urlsToCache = [
  '/', // Cache the root index.html
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&family=Montserrat:wght@400;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/js/all.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI.jpg',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI2.jpg',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI3.jpg',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Kindness%20Cover%20Art.jpg',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Street_Sense_Album_Cover.jpg',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/chatbot.png',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Sabi%20Bible.png',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo.png',
  'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Ariyo_AI.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Cache install failed:', err))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

// Fetch event - serve cached assets or fetch from network
self.addEventListener('fetch', event => {
  const requestUrl = event.request.url;

  // Bypass caching for audio files entirely
  if (requestUrl.includes('.mp3')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }) // Force fresh fetch, no browser cache
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Offline or network error - Audio unavailable' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
      .catch(() => {
        return caches.match('/'); // Fallback to cached index.html
      })
  );
});