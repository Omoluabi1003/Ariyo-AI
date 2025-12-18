(() => {
  const statusEl = document.getElementById('notificationStatus');
  const toast = document.getElementById('notificationToast');
  const approveBtn = document.getElementById('notificationApprove');
  const laterBtn = document.getElementById('notificationLater');
  const closeBtn = document.getElementById('notificationClose');
  const titleEl = document.getElementById('notificationToastTitle');
  const copyEl = document.getElementById('notificationToastCopy');

  const STORAGE_KEY = 'ariyo-notification-prompt';
  const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
  const unsupported = !('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window);

  const copyVariants = [
    {
      title: 'Get instant alerts when your favorite artists release new music.',
      copy: 'We only ping for the releases you follow—no spam, no noise.'
    },
    {
      title: 'Never miss a midnight premiere again.',
      copy: 'Turn on music alerts to hear about new tracks, remixes, and playlists as soon as they go live.'
    }
  ];

  let playbackTimer;
  let promptOpen = false;
  let lastFocus = null;

  const setStatus = (message, state = 'info') => {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.dataset.state = state;
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const fetchPublicKey = async () => {
    const response = await fetch('/api/push/public-key');
    if (!response.ok) {
      throw new Error('Unable to load VAPID public key.');
    }
    const data = await response.json();
    if (!data.publicKey) {
      throw new Error('VAPID public key missing.');
    }
    return data.publicKey;
  };

  const sendSubscriptionToServer = async (subscription) => {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Subscription save failed');
    }
  };

  const readPromptMeta = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('Unable to read notification preference', error);
      return null;
    }
  };

  const writePromptMeta = (decision, reason = 'user') => {
    try {
      const payload = { decision, reason, timestamp: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to persist notification preference', error);
    }
  };

  const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  const cooldownActive = () => {
    const meta = readPromptMeta();
    if (!meta) return false;
    if (meta.decision === 'denied' || meta.decision === 'granted' || meta.decision === 'unsupported') {
      return true;
    }
    if (!meta.timestamp) return false;
    return Date.now() - meta.timestamp < COOLDOWN_MS;
  };

  const shouldGateForIos = () => isIos() && !isStandalone();

  const ensureSubscribed = async () => {
    const permission = Notification.permission;
    if (permission === 'denied') {
      setStatus('Notifications are blocked. Enable them in your browser settings.', 'error');
      writePromptMeta('denied', 'system');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      setStatus('Notifications are active. You will hear about new releases.', 'success');
      return;
    }

    const publicKey = await fetchPublicKey();
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
    await sendSubscriptionToServer(subscription);
    setStatus('Notifications enabled. We will ping you for new music.', 'success');
    writePromptMeta('granted', 'subscribe');
  };

  const permissionReady = () => {
    if (unsupported) {
      setStatus('Push notifications are not supported on this device.', 'error');
      writePromptMeta('unsupported', 'system');
      return false;
    }

    if (Notification.permission === 'granted') {
      ensureSubscribed().catch((error) => console.error('Auto-subscribe failed', error));
      writePromptMeta('granted', 'system');
      return false;
    }

    if (Notification.permission === 'denied') {
      setStatus('Notifications are blocked in your browser settings.', 'error');
      writePromptMeta('denied', 'system');
      return false;
    }

    if (cooldownActive()) {
      return false;
    }

    if (shouldGateForIos()) {
      setStatus('Add Ariyo to your Home Screen to enable music alerts on iOS.', 'info');
      return false;
    }

    return true;
  };

  const applyCopyVariant = () => {
    if (!titleEl || !copyEl) return;
    const variant = copyVariants[Math.floor(Math.random() * copyVariants.length)];
    titleEl.textContent = variant.title;
    copyEl.textContent = variant.copy;
  };

  const handleKeydown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closeToast('dismissed');
    }
  };

  const openToast = () => {
    if (!toast || promptOpen) return;
    applyCopyVariant();
    toast.hidden = false;
    requestAnimationFrame(() => {
      toast.classList.add('is-open');
    });
    promptOpen = true;
    lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    approveBtn?.focus();
    document.addEventListener('keydown', handleKeydown);
    setStatus('Ready to enable music alerts.', 'info');
  };

  const closeToast = (decision) => {
    if (!toast || !promptOpen) return;
    toast.classList.remove('is-open');
    const hide = () => {
      toast.hidden = true;
    };
    toast.addEventListener('transitionend', hide, { once: true });
    promptOpen = false;
    document.removeEventListener('keydown', handleKeydown);
    if (decision) {
      writePromptMeta(decision, 'toast');
    }
    if (lastFocus) {
      lastFocus.focus();
    }
  };

  const recordEngagement = () => {
    if (!permissionReady()) {
      return;
    }
    openToast();
  };

  const startAudioEngagementTracking = () => {
    const audioEls = Array.from(document.querySelectorAll('audio'));
    if (!audioEls.length) return;

    audioEls.forEach((audio) => {
      const startTimer = () => {
        window.clearTimeout(playbackTimer);
        playbackTimer = window.setTimeout(() => {
          recordEngagement();
        }, 15000);
      };

      const clearTimer = () => {
        window.clearTimeout(playbackTimer);
      };

      audio.addEventListener('play', startTimer);
      ['pause', 'ended', 'seeking', 'waiting', 'stalled'].forEach((eventName) => {
        audio.addEventListener(eventName, clearTimer);
      });
    });
  };

  const wireAdditionalEngagementSignals = () => {
    document.getElementById('profileForm')?.addEventListener('submit', () => recordEngagement());

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-engagement-trigger]');
      if (trigger) {
        recordEngagement();
      }
    });

    document.addEventListener('ariyo:engagement', () => recordEngagement());
  };

  const handleApprove = async () => {
    if (unsupported) {
      setStatus('Push notifications are not supported on this device.', 'error');
      writePromptMeta('unsupported', 'system');
      closeToast('unsupported');
      return;
    }

    try {
      setStatus('Requesting permission…');
      approveBtn?.setAttribute('aria-busy', 'true');
      const permission = await Notification.requestPermission();
      approveBtn?.removeAttribute('aria-busy');

      if (permission !== 'granted') {
        setStatus('All good—we will ask again after a break.', 'info');
        closeToast('denied');
        return;
      }

      await ensureSubscribed();
      closeToast('granted');
    } catch (error) {
      approveBtn?.removeAttribute('aria-busy');
      console.error('Push enable failed', error);
      setStatus('Unable to enable notifications right now. Please try again.', 'error');
    }
  };

  const init = () => {
    if (unsupported) {
      setStatus('Push notifications are not supported on this device.', 'error');
      writePromptMeta('unsupported', 'system');
      return;
    }

    if (!permissionReady()) {
      return;
    }

    approveBtn?.addEventListener('click', handleApprove);
    laterBtn?.addEventListener('click', () => {
      setStatus('We will wait a bit before asking again.', 'info');
      closeToast('later');
    });
    closeBtn?.addEventListener('click', () => closeToast('dismissed'));

    navigator.permissions?.query({ name: 'notifications' }).then((permissionStatus) => {
      permissionStatus.onchange = () => {
        if (permissionStatus.state === 'granted') {
          ensureSubscribed().catch((error) => console.error('Auto-subscribe failed', error));
          writePromptMeta('granted', 'system');
        }
        if (permissionStatus.state === 'denied') {
          writePromptMeta('denied', 'system');
          closeToast('denied');
        }
      };
    }).catch(() => {});

    startAudioEngagementTracking();
    wireAdditionalEngagementSignals();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
