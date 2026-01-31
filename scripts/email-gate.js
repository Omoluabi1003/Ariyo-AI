(function() {
  const STORAGE_KEY = 'ariyoAccessEmail';
  const ACCESS_HASH = '#email-access';
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
    const email = input ? input.value.trim() : '';
    if (!email) return;
    setStoredEmail(email);
    updateStatus(email);
    hideModal();
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

    if (document.body?.dataset.page === 'main' && !storedEmail) {
      window.location.replace(`index.html${ACCESS_HASH}`);
    }
  });
})();
