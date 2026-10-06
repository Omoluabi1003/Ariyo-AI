(function (global) {
  'use strict';

  const DEFAULT_BASE_URL = 'http://127.0.0.1:17493';
  const STORAGE_KEY = 'ariyo.voice.settings.v1';

  function loadSettings() {
    try {
      return { baseUrl: DEFAULT_BASE_URL, enabled: true, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch (_) {
      return { baseUrl: DEFAULT_BASE_URL, enabled: true };
    }
  }

  function saveSettings(next) {
    const settings = { ...loadSettings(), ...next };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (_) {}
    return settings;
  }

  async function request(path, options) {
    const settings = loadSettings();
    if (!settings.enabled) throw new Error('Local voice engine is disabled');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    try {
      return await fetch(`${settings.baseUrl.replace(/\/$/, '')}${path}`, {
        ...options,
        signal: controller.signal,
        headers: { Accept: 'application/json', ...(options && options.headers) },
      });
    } finally { clearTimeout(timer); }
  }

  async function detect() {
    const candidates = ['/health', '/api/health', '/'];
    for (const path of candidates) {
      try {
        const response = await request(path, { method: 'GET' });
        if (response.ok) return { available: true, path, status: response.status, baseUrl: loadSettings().baseUrl };
      } catch (_) {}
    }
    return { available: false, baseUrl: loadSettings().baseUrl };
  }

  function browserSpeechAvailable() {
    return Boolean(global.SpeechRecognition || global.webkitSpeechRecognition);
  }

  function createBrowserDictation(options) {
    const Ctor = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!Ctor) return null;
    const recognition = new Ctor();
    recognition.lang = (options && options.language) || 'en-NG';
    recognition.interimResults = true;
    recognition.continuous = false;
    return recognition;
  }

  global.OmoluabiVoiceEngine = Object.freeze({
    provider: 'local-voicebox-compatible',
    loadSettings,
    saveSettings,
    detect,
    browserSpeechAvailable,
    createBrowserDictation,
  });
})(window);
