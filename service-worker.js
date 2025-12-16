importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

self.skipWaiting();
self.clientsClaim && self.clientsClaim();

// Bump cache prefix to force clients to refresh old caches
const CACHE_PREFIX = 'ariyo-ai-cache-v12';
const FALLBACK_VERSION = '1.16.0';
let CACHE_NAME;
let RUNTIME_CACHE_NAME;

async function notifyClientsOfUpdate(versionIdentifier) {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map(async client => {
      try {
        client.postMessage({
          type: 'SERVICE_WORKER_UPDATED',
          version: versionIdentifier || null
        });
      } catch (messageError) {
        console.error('Failed to notify client of service worker update:', messageError);
      }

      if (client.url && typeof client.navigate === 'function') {
        try {
          await client.navigate(client.url);
        } catch (navigateError) {
          console.error('Failed to auto-refresh client after service worker update:', navigateError);
        }
      }
    }));
  } catch (error) {
    console.error('Failed to broadcast service worker update to clients:', error);
  }
}

self.addEventListener('message', event => {
  if (!event.data) {
    return;
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const CORE_ASSETS = self.__WB_MANIFEST || [
  '/',
  '/index.html',
  '/main.html',
  '/about.html',
  '/offline-audio.mp3',
  'style.css',
  'color-scheme.css',
  'scripts/data.js',
  'scripts/player.js',
  'scripts/ui.js',
  'scripts/main.js',
  'scripts/sw-controller.js',
  'scripts/push-notifications.js',
  'scripts/experience.js',
  'scripts/deferred-init.js',
  'viewport-height.js',
  'apps/ariyo-ai-chat/ariyo-ai-chat.html',
  'apps/sabi-bible/sabi-bible.html',
  'apps/picture-game/picture-game.html',
  'apps/picture-game/picture-game.css',
  'apps/picture-game/picture-game.js',
  'apps/tetris/tetris.html',
  'apps/tetris/tetris.css',
  'apps/tetris/tetris.js',
  'apps/tetris/tetris-color-scheme.css',
  'apps/word-search/word-search.html',
  'apps/word-search/word-search.css',
  'apps/word-search/word-search.js',
  'apps/word-search/word-search-grid.js',
  'apps/connect-four/connect-four.html',
  'apps/connect-four/connect-four.css',
  'apps/connect-four/connect-four.js',
  'apps/cycle-precision/cycle-precision.html'
];

const PREFETCH_MEDIA = [
  'https://cdn1.suno.ai/4423f194-f2b3-4aea-ae4d-ed9150de2477.mp3',
  'https://cdn1.suno.ai/7578528b-34c1-492c-9e97-df93216f0cc2.mp3'
];
const PREFETCH_MEDIA_SET = new Set(PREFETCH_MEDIA);

function setCacheNames(version) {
  CACHE_NAME = `${CACHE_PREFIX}-${version}`;
  RUNTIME_CACHE_NAME = `${CACHE_NAME}-runtime`;
}

async function initializeCacheNamesFromExistingCaches() {
  if (CACHE_NAME && RUNTIME_CACHE_NAME) {
    return;
  }

  const cacheNames = await caches.keys();
  const primaryCache = cacheNames
    .filter(name => name.startsWith(`${CACHE_PREFIX}-`) && !name.endsWith('-runtime'))
    .sort()
    .pop();

  if (primaryCache) {
    CACHE_NAME = primaryCache;
    RUNTIME_CACHE_NAME = `${CACHE_NAME}-runtime`;
  }
}

function ensureFallbackCacheNames() {
  if (!CACHE_NAME) {
    CACHE_NAME = `${CACHE_PREFIX}-unknown`;
  }
  if (!RUNTIME_CACHE_NAME) {
    RUNTIME_CACHE_NAME = `${CACHE_NAME}-runtime`;
  }
}

const cacheNameReady = initializeCacheNamesFromExistingCaches();

if (self.workbox) {
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/apps/'),
    new workbox.strategies.StaleWhileRevalidate({ cacheName: `${CACHE_PREFIX}-games` })
  );

  workbox.routing.registerRoute(
    ({ url }) => url.pathname.endsWith('offline-audio.mp3') || url.pathname.endsWith('.mp3'),
    new workbox.strategies.CacheFirst({
      cacheName: `${CACHE_PREFIX}-audio-samples`,
      plugins: [new workbox.expiration.ExpirationPlugin({ maxEntries: 30 })]
    })
  );

  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'document' && request.url.includes('playlist'),
    new workbox.strategies.NetworkFirst({ cacheName: `${CACHE_PREFIX}-playlist-pages` })
  );
}

async function openRuntimeCache() {
  await cacheNameReady;
  if (!RUNTIME_CACHE_NAME) {
    ensureFallbackCacheNames();
  }
  return caches.open(RUNTIME_CACHE_NAME);
}

async function limitCacheSize(cache, maxEntries = 50) {
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await cache.delete(keys[0]);
    return limitCacheSize(cache, maxEntries);
  }
}

self.addEventListener('install', event => {
  // Activate this service worker immediately after installation
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      try {
        const response = await fetch('/version.json', { cache: 'no-store' });
        const data = await response.json();
        setCacheNames(data.version || FALLBACK_VERSION);
      } catch (error) {
        console.error('Failed to fetch version during install:', error);
        setCacheNames(FALLBACK_VERSION);
      }

      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS);

      const runtimeCache = await openRuntimeCache();
      await Promise.all(PREFETCH_MEDIA.map(async (url) => {
        try {
          const response = await fetch(url, { cache: 'no-store' });
          if (response && response.ok) {
            await runtimeCache.put(url, response.clone());
          }
        } catch (error) {
          console.error('Failed to prefetch media asset:', url, error);
        }
      }));
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      await cacheNameReady;

      if (!CACHE_NAME) {
        try {
          const response = await fetch('/version.json', { cache: 'no-store' });
          const data = await response.json();
          setCacheNames(data.version || FALLBACK_VERSION);
        } catch (error) {
          console.error('Failed to refresh version during activate:', error);
          setCacheNames(FALLBACK_VERSION);
        }
      }

      const cachesToKeep = new Set([CACHE_NAME, RUNTIME_CACHE_NAME]);
      const cacheNames = await caches.keys();
      const hadExistingCaches = cacheNames.some(name => {
        if (!name.startsWith(`${CACHE_PREFIX}-`)) {
          return false;
        }
        return name !== CACHE_NAME && name !== RUNTIME_CACHE_NAME;
      });
      await Promise.all(
        cacheNames.map(name => {
          if (!cachesToKeep.has(name)) {
            return caches.delete(name);
          }
        })
      );

      await self.clients.claim();

      try {
        await self.registration.update();
      } catch (error) {
        console.error('Service worker self-update failed:', error);
      }

      if (hadExistingCaches) {
        const versionIdentifier = CACHE_NAME && CACHE_NAME.startsWith(`${CACHE_PREFIX}-`)
          ? CACHE_NAME.slice(`${CACHE_PREFIX}-`.length)
          : null;
        await notifyClientsOfUpdate(versionIdentifier);
      }
    })()
  );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Always fetch manifest and icon assets from the network to avoid stale installs
    if (url.pathname.endsWith('manifest.json') || url.pathname.includes('/icons/')) {
        event.respondWith(fetch(event.request, { cache: 'no-store' }));
        return;
    }

    if (event.request.destination === 'audio' || /\.mp3(\?|$)/.test(event.request.url)) {
        const hasRangeRequest = event.request.headers.has('range');
        if (hasRangeRequest) {
            event.respondWith(fetch(event.request));
            return;
        }

        event.respondWith((async () => {
            const cache = await openRuntimeCache();
            const cached = await cache.match(event.request);
            if (cached) {
                return cached;
            }

            try {
                const networkResponse = await fetch(event.request, { cache: 'no-store' });
                if (networkResponse && networkResponse.ok) {
                    await cache.put(event.request, networkResponse.clone());
                    await limitCacheSize(cache, 30);
                }
                return networkResponse;
            } catch (error) {
                console.error('Audio fetch failed:', error);
                if (cached) return cached;
                throw error;
            }
        })());
        return;
    }

    event.respondWith((async () => {
        await cacheNameReady;

        if (!CACHE_NAME) {
            try {
                const response = await fetch('/version.json', { cache: 'no-store' });
                const data = await response.json();
                setCacheNames(data.version);
            } catch (error) {
                console.error('Failed to establish cache name during fetch:', error);
                ensureFallbackCacheNames();
            }
        }

        if (event.request.mode === 'navigate') {
            try {
                const networkResponse = await fetch(event.request);
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
            } catch (error) {
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                return caches.match('/index.html');
            }
        }

        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
            return cachedResponse;
        }

        try {
            const networkResponse = await fetch(event.request);
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                const runtimeCache = await openRuntimeCache();
                await limitCacheSize(runtimeCache);
                await runtimeCache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
        } catch (error) {
            console.error('Fetch failed:', error);
            const fallbackResponse = await caches.match('/index.html');
            if (fallbackResponse) {
                return fallbackResponse;
            }
        }
    })());
});

self.addEventListener('push', event => {
  const data = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch (e) {
      return {};
    }
  })();

  const title = data.title || 'New playlist drops';
  const body = data.body || 'Fresh Naija vibes are ready. Tap to jump back in.';
  const url = data.url || '/';
  const options = {
    body,
    icon: '/icons/Ariyo.png',
    badge: '/icons/Ariyo.png',
    tag: 'ariyo-ai-drop',
    renotify: true,
    data: { url },
    actions: [
      { action: 'open', title: 'Open Ariyò AI', icon: '/icons/Ariyo.png' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = new URL(event.notification?.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
      const client = clientsArr.find(c => c.url.startsWith(targetUrl));
      if (client) {
        return client.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});

