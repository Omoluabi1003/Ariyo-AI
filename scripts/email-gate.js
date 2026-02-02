(function() {
  const STORAGE_KEY = 'ariyoAccessEmail';
  const USER_ID_KEY = 'ariyoUserId';
  const ACCESS_HASH = '#email-access';
  const RETURN_URL_KEY = 'ariyoEmailGateReturnUrl';
  const NOTIFY_ENDPOINT = 'https://formsubmit.co/ajax/pakiyogun10@gmail.com';
  let pendingCallback = null;
  let inMemoryEmail = '';

  const getStoredEmail = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || '';
      if (stored) {
        inMemoryEmail = stored;
      }
      return stored || inMemoryEmail;
    } catch (error) {
      return inMemoryEmail;
    }
  };

  const setStoredEmail = (email) => {
    inMemoryEmail = email;
    try {
      localStorage.setItem(STORAGE_KEY, email);
    } catch (error) {
      // Storage not available.
    }
  };

  const getOrCreateUserId = () => {
    try {
      let userId = localStorage.getItem(USER_ID_KEY) || '';
      if (!userId && window.crypto?.randomUUID) {
        userId = window.crypto.randomUUID();
        localStorage.setItem(USER_ID_KEY, userId);
      }
      return userId;
    } catch (error) {
      return '';
    }
  };

  const getReturnUrl = () => {
    try {
      return sessionStorage.getItem(RETURN_URL_KEY) || '';
    } catch (error) {
      return '';
    }
  };

  const setReturnUrl = (url) => {
    if (!url) return;
    try {
      sessionStorage.setItem(RETURN_URL_KEY, url);
    } catch (error) {
      // Storage not available.
    }
  };

  const consumeReturnUrl = () => {
    const url = getReturnUrl();
    if (!url) return '';
    try {
      sessionStorage.removeItem(RETURN_URL_KEY);
    } catch (error) {
      // Storage not available.
    }
    return url;
  };

  const safeReturnUrl = (value) => {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return '';
      return `${url.pathname}${url.search}${url.hash}`;
    } catch (error) {
      return '';
    }
  };

  const updateStatus = (email) => {
    const status = document.getElementById('emailGateStatus');
    if (!status) return;
    if (email) {
      status.textContent = `Signed in as ${email}`;
    } else {
      status.textContent = 'Sign in with email to unlock the full experience.';
    }
  };

  const showModal = () => {
    const gate = document.getElementById('emailGate');
    if (!gate) return;
    gate.hidden = false;
    gate.setAttribute('aria-hidden', 'false');
    const input = gate.querySelector('input[type="email"]');
    if (input) {
      input.focus();
    }
  };

  const hideModal = () => {
    const gate = document.getElementById('emailGate');
    if (!gate) return;
    gate.hidden = true;
    gate.setAttribute('aria-hidden', 'true');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) {
      return;
    }
    const input = form.querySelector('input[type="email"]');
    const email = input ? input.value.trim().toLowerCase() : '';
    if (!email) return;
    setStoredEmail(email);
    updateStatus(email);
    const userId = getOrCreateUserId();
    const payload = {
      subject: 'Ariyo AI email sign-in',
      message: `Email gate sign-in: ${email}${userId ? ` (user ${userId})` : ''}`,
      email,
      userId,
      page: window.location.href
    };
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(NOTIFY_ENDPOINT, blob);
    } else {
      fetch(NOTIFY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    }
    hideModal();
    const returnUrl = safeReturnUrl(consumeReturnUrl());
    if (returnUrl) {
      window.location.assign(returnUrl);
      return;
    }
    if (pendingCallback) {
      pendingCallback(email);
      pendingCallback = null;
    }
  };

  window.requireEmailAccess = (onSuccess) => {
    const storedEmail = getStoredEmail();
    if (storedEmail) {
      updateStatus(storedEmail);
      if (typeof onSuccess === 'function') {
        onSuccess(storedEmail);
      }
      return;
    }
    pendingCallback = typeof onSuccess === 'function' ? onSuccess : null;
    showModal();
  };

  document.addEventListener('DOMContentLoaded', () => {
    const gate = document.getElementById('emailGate');
    const form = document.getElementById('emailGateForm');
    const closeButton = gate ? gate.querySelector('.email-gate__close') : null;
    const storedEmail = getStoredEmail();
    updateStatus(storedEmail);

    if (form) {
      form.addEventListener('submit', handleSubmit);
    }

    if (closeButton) {
      closeButton.addEventListener('click', () => {
        hideModal();
        pendingCallback = null;
      });
    }

    if (gate && window.location.hash === ACCESS_HASH) {
      showModal();
    }

    if (storedEmail) {
      const pendingReturn = safeReturnUrl(getReturnUrl());
      if (pendingReturn) {
        consumeReturnUrl();
        window.location.replace(pendingReturn);
      }
    }

    if (document.body?.dataset.page === 'main' && !storedEmail) {
      const returnUrl = safeReturnUrl(window.location.pathname + window.location.search + window.location.hash);
      setReturnUrl(returnUrl);
      window.location.replace(`index.html${ACCESS_HASH}`);
    }
  });
})();
