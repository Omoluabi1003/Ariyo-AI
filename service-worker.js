// service-worker.js
const CACHE_NAME = 'ariyo-ai-cache-v2'; // Updated version
const urlsToCache = [
  '/',
  '/index.html',
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

self.addEventListener('fetch', event => {
  const requestUrl = event.request.url;
  if (requestUrl.includes('.mp3')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Offline - Audio unavailable' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).then(networkResponse => {
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
      .catch(() => caches.match('/index.html')) // Offline fallback
  );
});