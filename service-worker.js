importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// Bump cache prefix to force clients to refresh old caches
const CACHE_PREFIX = 'ariyo-ai-cache-v14';
const FALLBACK_VERSION = '1.16.1';
const UPDATE_CHANNEL_NAME = 'ariyo-app-updates';
let CACHE_NAME;
let RUNTIME_CACHE_NAME;
let ACTIVE_VERSION = null;

const INSTALL_TIMEOUT_MS = 8000;
const MEDIA_PREFETCH_TIMEOUT_MS = 5000;

async function notifyClientsOfUpdate(versionIdentifier) {
  const payload = {
    type: 'APP_UPDATE_READY',
    version: versionIdentifier || null
  };

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(UPDATE_CHANNEL_NAME);
      channel.postMessage(payload);
      channel.close();
    } catch (error) {
      console.error('Failed to broadcast update message:', error);
    }
  }

  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map(async client => {
      try {
        client.postMessage(payload);
        client.postMessage({
          type: 'SERVICE_WORKER_UPDATED',
          version: versionIdentifier || null
        });
      } catch (messageError) {
        console.error('Failed to notify client of service worker update:', messageError);
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

  if (event.data.type === 'REQUEST_APP_VERSION') {
    if (event.source && typeof event.source.postMessage === 'function') {
      event.source.postMessage({
        type: 'APP_VERSION',
        version: ACTIVE_VERSION
      });
    }
  }
});

const CORE_ASSETS = self.__WB_MANIFEST || [
  '/',
  '/index.html',
  '/main.html',
  '/about.html',
  '/share.html',
  '/offline-audio.mp3',
  'style.css',
  'color-scheme.css',
  'scripts/data-lite.js',
  'scripts/data-loader.js',
  'scripts/player.js',
  'scripts/ui.js',
  'scripts/news.js',
  'scripts/main.js',
  'scripts/idle-utils.js',
  'scripts/proverb-utils.js',
  'scripts/player-state-utils.js',
  'scripts/vinyl-state-utils.js',
  'scripts/seo.js',
  'scripts/share-card.js',
  'scripts/audio-recovery-utils.js',
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

// Avoid prefetching large media during install; streaming should stay network-first.
const PREFETCH_MEDIA = [];
const PREFETCH_MEDIA_SET = new Set(PREFETCH_MEDIA);

function fetchWithTimeout(url, options = {}, timeout = INSTALL_TIMEOUT_MS) {
  if (typeof AbortController === 'undefined') {
    return fetch(url, options);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  return fetch(url, { ...options, signal: controller.signal })
    .catch(error => {
      if (controller.signal.aborted) {
        console.warn('Fetch timed out:', url);
      }
      throw error;
    })
    .finally(() => clearTimeout(timer));
}

function setCacheNames(version) {
  const safeVersion = version || FALLBACK_VERSION;
  ACTIVE_VERSION = safeVersion;
  CACHE_NAME = `${CACHE_PREFIX}-${safeVersion}`;
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
    ({ request, url }) => request.destination === 'audio' || /\.(mp3|aac|m3u8|ts|ogg|opus)$/i.test(url.pathname),
    new workbox.strategies.NetworkOnly()
  );

  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/proxy-audio') || url.pathname.startsWith('/api/radio/proxy'),
    new workbox.strategies.NetworkOnly()
  );

  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'document' && request.url.includes('playlist'),
    new workbox.strategies.NetworkFirst({ cacheName: `${CACHE_PREFIX}-playlist-pages` })
  );

  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/podcasts'),
    new workbox.strategies.StaleWhileRevalidate({ cacheName: `${CACHE_PREFIX}-podcasts` })
  );

  workbox.routing.registerRoute(
    ({ url }) => url.pathname === '/api/news',
    new workbox.strategies.NetworkFirst({
      cacheName: `${CACHE_PREFIX}-news`,
      networkTimeoutSeconds: 8,
    })
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
  event.waitUntil(
    (async () => {
      try {
        const response = await fetchWithTimeout('/version.json', { cache: 'no-store' });
        const data = await response.json();
        setCacheNames(data.version || FALLBACK_VERSION);
      } catch (error) {
        console.error('Failed to fetch version during install:', error);
        setCacheNames(FALLBACK_VERSION);
      }

      const cache = await caches.open(CACHE_NAME);

      try {
        await Promise.race([
          cache.addAll(CORE_ASSETS),
          new Promise((_, reject) => setTimeout(() => reject(new Error('core cache timeout')), INSTALL_TIMEOUT_MS))
        ]);
      } catch (error) {
        console.warn('Core assets cache warming timed out; continuing with available files.', error);
      }

      const runtimeCache = await openRuntimeCache();
      (async () => {
        await Promise.allSettled(PREFETCH_MEDIA.map(async (url) => {
          try {
            const response = await fetchWithTimeout(url, { cache: 'no-store' }, MEDIA_PREFETCH_TIMEOUT_MS);
            if (response && response.ok) {
              await runtimeCache.put(url, response.clone());
            }
          } catch (error) {
            console.warn('Skipping slow media prefetch:', url, error);
          }
        }));
      })();
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

      const versionIdentifier = CACHE_NAME && CACHE_NAME.startsWith(`${CACHE_PREFIX}-`)
        ? CACHE_NAME.slice(`${CACHE_PREFIX}-`.length)
        : ACTIVE_VERSION;

      if (hadExistingCaches && versionIdentifier) {
        await notifyClientsOfUpdate(versionIdentifier);
      }
    })()
  );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    const hasRangeRequest = event.request.headers.has('range');
    const isStreamPath = /\.(m3u8|ts|aac|mp3|flac|ogg|opus)(\?|$)/i.test(url.pathname);
    const isAudioDestination = event.request.destination === 'audio';
    if (isAudioDestination || isStreamPath || hasRangeRequest) {
        event.respondWith(fetch(event.request, { cache: 'no-store' }));
        return;
    }

    // Always fetch manifest and icon assets from the network to avoid stale installs
    if (url.pathname.endsWith('manifest.json') || url.pathname.includes('/icons/')) {
        event.respondWith(fetch(event.request, { cache: 'no-store' }));
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

  const title = data.title || 'New playlist update';
  const body = data.body || 'Fresh Naija vibes are ready. Tap to jump back in.';
  const url = data.url || '/';
  const options = {
    body,
    icon: '/icons/Ariyo.png',
    badge: '/icons/Ariyo.png',
    tag: 'ariyo-ai-alert',
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
