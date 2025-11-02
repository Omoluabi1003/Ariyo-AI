// Bump cache prefix to force clients to refresh old caches
const CACHE_PREFIX = 'ariyo-ai-cache-v8';
let CACHE_NAME;
let RUNTIME_CACHE_NAME;

self.addEventListener('message', event => {
  if (!event.data) {
    return;
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const CORE_ASSETS = [
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
  'apps/tetris/tetris-color-scheme.js',
  'apps/word-search/word-search.html',
  'apps/word-search/word-search.css',
  'apps/word-search/word-search.js',
  'apps/word-search/word-search-grid.js',
  'apps/connect-four/connect-four.html',
  'apps/connect-four/connect-four.css',
  'apps/connect-four/connect-four.js',
  'apps/cycle-precision/cycle-precision.html'
];

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

async function openRuntimeCache() {
  await cacheNameReady;
  if (!RUNTIME_CACHE_NAME) {
    ensureFallbackCacheNames();
  }
  return caches.open(RUNTIME_CACHE_NAME);
}

async function limitCacheSize(cache) {
  const keys = await cache.keys();
  if (keys.length > 50) {
    await cache.delete(keys[0]);
    return limitCacheSize(cache);
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
        setCacheNames(data.version);
      } catch (error) {
        console.error('Failed to fetch version during install:', error);
        await cacheNameReady;
        ensureFallbackCacheNames();
      }

      const cache = await caches.open(CACHE_NAME);
      return cache.addAll(CORE_ASSETS);
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
          setCacheNames(data.version);
        } catch (error) {
          console.error('Failed to refresh version during activate:', error);
          ensureFallbackCacheNames();
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

      if (hadExistingCaches) {
        try {
          const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          const versionIdentifier = CACHE_NAME && CACHE_NAME.startsWith(`${CACHE_PREFIX}-`)
            ? CACHE_NAME.slice(`${CACHE_PREFIX}-`.length)
            : null;
          clients.forEach(client => client.postMessage({
            type: 'SERVICE_WORKER_UPDATED',
            version: versionIdentifier
          }));
        } catch (error) {
          console.error('Failed to broadcast service worker update to clients:', error);
        }
      }

      return self.clients.claim();
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

