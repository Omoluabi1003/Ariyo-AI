(function () {
  const SETTINGS_KEY = 'ariyo_voice_settings_v1';
  const DEFAULT_SETTINGS = {
    voiceOn: false,
    autoSpeak: true,
    voiceURI: '',
    rate: 1.0,
    pitch: 1.0,
    silenceUrls: true
  };

  let settings = { ...DEFAULT_SETTINGS };
  let voices = [];
  let status = 'idle';
  let recognition = null;
  let mountConfig = null;
  let elements = {};
  let lastSpokenAssistant = '';

  function detectSupport() {
    const tts = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
    const stt = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    return { tts, stt };
  }

  function loadSettings() {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (error) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(nextSettings) {
    settings = { ...settings, ...nextSettings };
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      /* ignore storage errors */
    }
  }

  function updateStatus(nextStatus) {
    status = nextStatus;
    if (elements.statusEl) {
      elements.statusEl.textContent = status;
      elements.statusEl.dataset.state = status;
    }
  }

  function showHint(message) {
    if (!elements.hintEl) return;
    elements.hintEl.textContent = message || '';
  }

  function clearHint() {
    showHint('');
  }

  function loadVoices() {
    if (!detectSupport().tts) return [];
    voices = window.speechSynthesis.getVoices() || [];
    return voices;
  }

  function populateVoiceSelect() {
    if (!elements.voiceSelect) return;
    const selected = settings.voiceURI;
    const voiceList = loadVoices();
    elements.voiceSelect.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'System Default';
    elements.voiceSelect.appendChild(defaultOption);

    voiceList.forEach((voice) => {
      const option = document.createElement('option');
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} (${voice.lang})`;
      elements.voiceSelect.appendChild(option);
    });

    elements.voiceSelect.value = selected;
  }

  function getVoiceByURI(uri) {
    if (!uri) return null;
    return voices.find((voice) => voice.voiceURI === uri) || null;
  }

  function sanitizeText(text) {
    let cleaned = String(text || '');
    if (settings.silenceUrls) {
      cleaned = cleaned.replace(/(https?:\/\/\S+|www\.\S+)/gi, '');
    }
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    if (cleaned.length > 1000) {
      cleaned = `${cleaned.slice(0, 1000).trim()} (truncated)`;
    }
    return cleaned;
  }

  function speak(text) {
    if (!detectSupport().tts) {
      showHint('Speech synthesis not supported in this browser');
      return;
    }
    if (!settings.voiceOn) {
      showHint('Turn on Voice to enable audio');
      return;
    }

    const cleaned = sanitizeText(text);
    if (!cleaned) return;

    clearHint();
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleaned);
    const voice = getVoiceByURI(settings.voiceURI);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;

    utterance.onstart = () => updateStatus('speaking');
    utterance.onend = () => updateStatus('idle');
    utterance.onerror = () => {
      updateStatus('error');
      showHint('Tap Speak to enable audio');
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      updateStatus('error');
      showHint('Tap Speak to enable audio');
    }
  }

  function stop() {
    if (detectSupport().tts) {
      window.speechSynthesis.cancel();
      updateStatus('idle');
    }
  }

  function setupRecognition() {
    if (!detectSupport().stt) return null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognizer = new SpeechRecognition();
    recognizer.interimResults = true;
    recognizer.continuous = false;
    recognizer.lang = navigator.language || 'en-US';
    return recognizer;
  }

  function updateInputText(text) {
    if (mountConfig && typeof mountConfig.setInputText === 'function') {
      mountConfig.setInputText(text);
    }
  }

  function startListening() {
    if (!recognition) return;
    clearHint();
    updateStatus('listening');
    let interimTranscript = '';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      interimTranscript = transcript.trim();
      if (interimTranscript) {
        updateInputText(interimTranscript);
        showHint(`Listening: ${interimTranscript}`);
      }
    };

    recognition.onerror = () => {
      updateStatus('error');
      showHint('Voice typing failed');
    };

    recognition.onend = () => {
      updateStatus('idle');
      if (interimTranscript) {
        updateInputText(interimTranscript);
      }
      clearHint();
    };

    try {
      recognition.start();
    } catch (error) {
      updateStatus('error');
      showHint('Voice typing failed');
    }
  }

  function stopListening() {
    if (!recognition) return;
    try {
      recognition.stop();
    } catch (error) {
      /* ignore */
    }
  }

  function mount(config) {
    if (!config || !config.mountEl) return;
    mountConfig = config;
    settings = loadSettings();
    recognition = setupRecognition();

    const support = detectSupport();
    const root = config.mountEl;
    root.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'ariyo-voice';
    wrapper.innerHTML = `
      <div class="ariyo-voice-row ariyo-voice-toggles">
        <label class="ariyo-voice-toggle">
          <input type="checkbox" data-voice-on />
          <span>Voice On</span>
        </label>
        <label class="ariyo-voice-toggle">
          <input type="checkbox" data-auto-speak />
          <span>Auto-speak replies</span>
        </label>
      </div>
      <div class="ariyo-voice-row ariyo-voice-buttons">
        <button type="button" data-speak-last>Speak Last Reply</button>
        <button type="button" data-stop>Stop Speaking</button>
      </div>
      <div class="ariyo-voice-row ariyo-voice-select">
        <label>
          <span>Voice</span>
          <select data-voice-select></select>
        </label>
      </div>
      <div class="ariyo-voice-row ariyo-voice-sliders">
        <label>
          <span>Rate</span>
          <input type="range" min="0.8" max="1.2" step="0.05" data-rate />
        </label>
        <label>
          <span>Pitch</span>
          <input type="range" min="0.8" max="1.2" step="0.05" data-pitch />
        </label>
      </div>
      <div class="ariyo-voice-row ariyo-voice-toggles">
        <label class="ariyo-voice-toggle">
          <input type="checkbox" data-silence-urls />
          <span>Silence URLs</span>
        </label>
      </div>
      <div class="ariyo-voice-row ariyo-voice-status">
        <span class="ariyo-voice-status-label">Status: <strong data-status>idle</strong></span>
      </div>
      <div class="ariyo-voice-row ariyo-voice-stt" data-stt-row></div>
      <div class="ariyo-voice-row ariyo-voice-hint" data-hint></div>
    `;

    root.appendChild(wrapper);

    elements = {
      voiceOn: wrapper.querySelector('[data-voice-on]'),
      autoSpeak: wrapper.querySelector('[data-auto-speak]'),
      speakLast: wrapper.querySelector('[data-speak-last]'),
      stop: wrapper.querySelector('[data-stop]'),
      voiceSelect: wrapper.querySelector('[data-voice-select]'),
      rate: wrapper.querySelector('[data-rate]'),
      pitch: wrapper.querySelector('[data-pitch]'),
      silenceUrls: wrapper.querySelector('[data-silence-urls]'),
      statusEl: wrapper.querySelector('[data-status]'),
      hintEl: wrapper.querySelector('[data-hint]'),
      sttRow: wrapper.querySelector('[data-stt-row]')
    };

    elements.voiceOn.checked = settings.voiceOn;
    elements.autoSpeak.checked = settings.autoSpeak;
    elements.rate.value = settings.rate;
    elements.pitch.value = settings.pitch;
    elements.silenceUrls.checked = settings.silenceUrls;

    elements.voiceOn.addEventListener('change', (event) => {
      saveSettings({ voiceOn: event.target.checked });
      if (!settings.voiceOn) {
        stop();
      }
    });

    elements.autoSpeak.addEventListener('change', (event) => {
      saveSettings({ autoSpeak: event.target.checked });
    });

    elements.rate.addEventListener('input', (event) => {
      saveSettings({ rate: Number(event.target.value) });
    });

    elements.pitch.addEventListener('input', (event) => {
      saveSettings({ pitch: Number(event.target.value) });
    });

    elements.silenceUrls.addEventListener('change', (event) => {
      saveSettings({ silenceUrls: event.target.checked });
    });

    elements.voiceSelect.addEventListener('change', (event) => {
      saveSettings({ voiceURI: event.target.value });
    });

    elements.speakLast.addEventListener('click', () => {
      clearHint();
      if (!settings.voiceOn) {
        showHint('Turn on Voice to enable audio');
        return;
      }
      const lastText = mountConfig.getLastAssistantText ? mountConfig.getLastAssistantText() : '';
      if (!lastText) {
        showHint('No assistant reply found yet');
        return;
      }
      speak(lastText);
    });

    elements.stop.addEventListener('click', () => {
      stop();
      clearHint();
    });

    if (support.stt && recognition) {
      const micButton = document.createElement('button');
      micButton.type = 'button';
      micButton.className = 'ariyo-voice-mic';
      micButton.textContent = 'Hold to Talk';

      const start = (event) => {
        event.preventDefault();
        startListening();
      };
      const stopHandler = (event) => {
        event.preventDefault();
        stopListening();
      };

      micButton.addEventListener('pointerdown', start);
      micButton.addEventListener('pointerup', stopHandler);
      micButton.addEventListener('pointerleave', stopHandler);
      micButton.addEventListener('pointercancel', stopHandler);

      elements.sttRow.appendChild(micButton);
    } else {
      elements.sttRow.innerHTML = '<span class="ariyo-voice-stt-unsupported">Voice typing not supported on this browser</span>';
    }

    updateStatus('idle');
    populateVoiceSelect();

    if (support.tts && typeof window.speechSynthesis !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = () => {
        populateVoiceSelect();
      };
    }
  }

  function onAssistantMessage(text) {
    if (!text) return;
    lastSpokenAssistant = text;
    if (settings.voiceOn && settings.autoSpeak) {
      speak(text);
    }
  }

  window.addEventListener('beforeunload', () => {
    stop();
  });

  window.AriyoVoice = {
    detectSupport,
    loadVoices,
    speak,
    stop,
    mount,
    onAssistantMessage,
    get status() {
      return status;
    },
    get lastAssistantText() {
      return lastSpokenAssistant;
    }
  };
})();
