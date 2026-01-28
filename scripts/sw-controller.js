(() => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const SW_URL = '/service-worker.js';
  const VERSION_URL = '/version.json';
  const UPDATE_CHANNEL_NAME = 'ariyo-app-updates';
  const RELOAD_GUARD_KEY = 'ariyo:lastReloadedVersion';
  const IDLE_THRESHOLD_MS = 15000;

  let hasController = Boolean(navigator.serviceWorker.controller);
  let reloadScheduled = false;
  let updateIntervalId = null;
  let currentVersion = null;
  let pendingVersion = null;
  let lastInteraction = Date.now();

  const updateBanner = document.getElementById('appUpdateBanner');
  const updateCopy = document.getElementById('appUpdateCopy');
  const updateRefresh = document.getElementById('appUpdateRefresh');
  const updateDismiss = document.getElementById('appUpdateDismiss');

  const markInteraction = () => {
    lastInteraction = Date.now();
  };

  ['pointerdown', 'keydown', 'touchstart', 'mousemove'].forEach(eventName => {
    window.addEventListener(eventName, markInteraction, { passive: true });
  });
  window.addEventListener('focus', markInteraction);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      markInteraction();
    }
  });

  const getLastReloadedVersion = () => {
    try {
      return localStorage.getItem(RELOAD_GUARD_KEY);
    } catch (error) {
      return null;
    }
  };

  const setLastReloadedVersion = (version) => {
    try {
      if (version) {
        localStorage.setItem(RELOAD_GUARD_KEY, version);
      }
    } catch (error) {
      console.warn('Failed to persist last reloaded version:', error);
    }
  };

  const isMediaPlaying = () => {
    const audio = document.querySelector('audio');
    return Boolean(audio && !audio.paused && !audio.ended);
  };

  const isIdle = () => {
    if (document.hidden) {
      return true;
    }
    const idleFor = Date.now() - lastInteraction;
    return idleFor > IDLE_THRESHOLD_MS && !isMediaPlaying();
  };

  const broadcastUpdate = (payload) => {
    if (!payload) {
      return;
    }
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }
    try {
      const channel = new BroadcastChannel(UPDATE_CHANNEL_NAME);
      channel.postMessage(payload);
      channel.close();
    } catch (error) {
      console.warn('Failed to broadcast update payload:', error);
    }
  };

  const scheduleReload = (version) => {
    if (reloadScheduled) {
      return;
    }
    reloadScheduled = true;
    setLastReloadedVersion(version || 'unknown');
    broadcastUpdate({ type: 'APP_RELOAD', version: version || null });
    window.location.reload();
  };

  const showUpdateBanner = (version) => {
    if (!updateBanner) {
      return;
    }
    if (updateCopy) {
      updateCopy.textContent = 'Update available. Refresh now.';
    }
    updateBanner.hidden = false;
    updateBanner.classList.add('is-visible');
    updateBanner.dataset.version = version || '';
  };

  const hideUpdateBanner = () => {
    if (!updateBanner) {
      return;
    }
    updateBanner.classList.remove('is-visible');
    updateBanner.hidden = true;
  };

  const handleUpdateAvailable = (version, source = 'sw') => {
    const normalizedVersion = version || pendingVersion || currentVersion;
    if (normalizedVersion) {
      pendingVersion = normalizedVersion;
    }

    const lastReloaded = getLastReloadedVersion();
    if (normalizedVersion && lastReloaded === normalizedVersion) {
      return;
    }

    broadcastUpdate({ type: 'APP_UPDATE_READY', version: normalizedVersion || null, source });

    if (isIdle()) {
      scheduleReload(normalizedVersion);
      return;
    }

    showUpdateBanner(normalizedVersion);
  };

  if (updateRefresh) {
    updateRefresh.addEventListener('click', () => scheduleReload(pendingVersion || currentVersion));
  }
  if (updateDismiss) {
    updateDismiss.addEventListener('click', hideUpdateBanner);
  }

  const requestSkipWaiting = (worker) => {
    if (!worker) {
      return;
    }
    try {
      worker.postMessage({ type: 'SKIP_WAITING' });
    } catch (error) {
      console.error('Failed to request skip waiting on service worker:', error);
    }
  };

  const fetchAppVersion = async () => {
    try {
      const response = await fetch(VERSION_URL, { cache: 'no-store' });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data?.version || null;
    } catch (error) {
      console.warn('Version lookup failed:', error);
      return null;
    }
  };

  const watchInstallingWorker = (worker) => {
    if (!worker) {
      return;
    }
    worker.addEventListener('statechange', async () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        const version = await fetchAppVersion();
        if (version) {
          pendingVersion = version;
        }
        handleUpdateAvailable(pendingVersion || version, 'install');
        requestSkipWaiting(worker);
      }
    });
  };

  const attachUpdateHandlers = (registration) => {
    if (!registration) {
      return;
    }

    if (registration.waiting) {
      fetchAppVersion().then(version => {
        if (version) {
          pendingVersion = version;
        }
        handleUpdateAvailable(pendingVersion || version, 'waiting');
      });
      requestSkipWaiting(registration.waiting);
    }

    if (registration.installing) {
      watchInstallingWorker(registration.installing);
    }

    registration.addEventListener('updatefound', () => {
      watchInstallingWorker(registration.installing);
    });
  };

  const refreshRegistrationPeriodically = (registration) => {
    if (!registration || updateIntervalId) {
      return;
    }
    const runUpdate = () => {
      registration.update().catch((error) => {
        console.error('Service worker update check failed:', error);
      });
    };
    runUpdate();
    updateIntervalId = setInterval(runUpdate, 5 * 60 * 1000);
  };

  const monitorVersionDrift = () => {
    const check = async () => {
      const version = await fetchAppVersion();
      if (version && currentVersion && version !== currentVersion) {
        pendingVersion = version;
        handleUpdateAvailable(version, 'version-drift');
      }
      if (version) {
        currentVersion = version;
      }
    };
    check();
    setInterval(check, 5 * 60 * 1000);
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hasController) {
      hasController = true;
      return;
    }
    handleUpdateAvailable(pendingVersion || currentVersion, 'controllerchange');
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'APP_UPDATE_READY') {
      handleUpdateAvailable(event.data.version, 'message');
    }
    if (event.data && event.data.type === 'APP_VERSION') {
      if (event.data.version) {
        currentVersion = event.data.version;
      }
    }
  });

  const registerServiceWorker = async () => {
    const version = await fetchAppVersion();
    if (version) {
      currentVersion = version;
    }
    const versionSuffix = version ? `?v=${encodeURIComponent(version)}` : '';

    try {
      const registration = await navigator.serviceWorker.register(`${SW_URL}${versionSuffix}`);
      attachUpdateHandlers(registration);
      navigator.serviceWorker.ready
        .then((readyRegistration) => {
          attachUpdateHandlers(readyRegistration);
          refreshRegistrationPeriodically(readyRegistration);
        })
        .catch((error) => {
          console.error('Failed to wait for service worker readiness:', error);
        });
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  };

  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(UPDATE_CHANNEL_NAME);
    channel.addEventListener('message', (event) => {
      if (!event.data) {
        return;
      }
      if (event.data.type === 'APP_UPDATE_READY') {
        handleUpdateAvailable(event.data.version, 'broadcast');
      }
    });
  }

  window.addEventListener('storage', (event) => {
    if (event.key === RELOAD_GUARD_KEY && pendingVersion && event.newValue === pendingVersion) {
      hideUpdateBanner();
    }
  });

  if (document.readyState === 'complete') {
    registerServiceWorker();
    monitorVersionDrift();
  } else {
    window.addEventListener('load', () => {
      registerServiceWorker();
      monitorVersionDrift();
    }, { once: true });
  }
})();
