(function () {
  const STORAGE_KEY = 'ariyo.language';
  const DEFAULT_LANG = 'en';
  const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'pt', 'yo', 'ha', 'ig'];

  const translations = {
    en: {
      ui: {
        language: 'Language',
        launchExperience: 'Launch experience',
        installPwa: 'Install PWA',
        lightMode: 'Light mode',
        darkMode: 'Dark mode',
        loading: 'Loading',
      },
    },
    fr: {
      ui: {
        language: 'Langue',
        launchExperience: "Lancer l'expérience",
        installPwa: 'Installer la PWA',
        lightMode: 'Mode clair',
        darkMode: 'Mode sombre',
        loading: 'Chargement',
      },
    },
    es: {
      ui: {
        language: 'Idioma',
        launchExperience: 'Iniciar experiencia',
        installPwa: 'Instalar PWA',
        lightMode: 'Modo claro',
        darkMode: 'Modo oscuro',
        loading: 'Cargando',
      },
    },
    pt: {
      ui: {
        language: 'Idioma',
        launchExperience: 'Iniciar experiência',
        installPwa: 'Instalar PWA',
        lightMode: 'Modo claro',
        darkMode: 'Modo escuro',
        loading: 'Carregando',
      },
    },
    yo: {
      ui: {
        language: 'Èdè',
        launchExperience: 'Bẹ̀rẹ̀ ìrírí',
        installPwa: 'Fi PWA sori ẹrọ',
        lightMode: 'Móòdù ìmọ́lẹ̀',
        darkMode: 'Móòdù òkùnkùn',
        loading: 'Ń gbé wọlé',
      },
    },
    ha: {
      ui: {
        language: 'Harshe',
        launchExperience: 'Fara kwarewa',
        installPwa: 'Saka PWA',
        lightMode: 'Yanayin haske',
        darkMode: 'Yanayin duhu',
        loading: 'Ana lodawa',
      },
    },
    ig: {
      ui: {
        language: 'Asụsụ',
        launchExperience: 'Bido ahụmịhe',
        installPwa: 'Wụnye PWA',
        lightMode: 'Ọnọdụ ọkụ',
        darkMode: 'Ọnọdụ ọchịchịrị',
        loading: 'Na-ebudata',
      },
    },
  };

  function normalizeLanguage(language) {
    if (!language) return DEFAULT_LANG;
    const base = language.toLowerCase().split('-')[0];
    return SUPPORTED_LANGUAGES.includes(base) ? base : DEFAULT_LANG;
  }

  function detectBrowserLanguage() {
    const candidates = [...(Array.isArray(navigator.languages) ? navigator.languages : []), navigator.language].filter(
      Boolean,
    );

    for (const candidate of candidates) {
      const normalized = normalizeLanguage(candidate);
      if (SUPPORTED_LANGUAGES.includes(normalized)) {
        return normalized;
      }
    }
    return DEFAULT_LANG;
  }

  function lookup(lang, key) {
    const parts = key.split('.');
    const resolve = (source) => parts.reduce((obj, part) => (obj && obj[part] != null ? obj[part] : undefined), source);
    return resolve(translations[lang]) ?? resolve(translations[DEFAULT_LANG]) ?? key;
  }

  function applyTranslations(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = lookup(lang, el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', lookup(lang, el.dataset.i18nPlaceholder));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      el.setAttribute('aria-label', lookup(lang, el.dataset.i18nAriaLabel));
    });
  }

  function setLanguage(lang) {
    const nextLanguage = normalizeLanguage(lang);
    localStorage.setItem(STORAGE_KEY, nextLanguage);
    applyTranslations(nextLanguage);
    window.dispatchEvent(new CustomEvent('ariyo:languageChanged', { detail: { language: nextLanguage } }));
  }

  function getInitialLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return normalizeLanguage(saved);
    return detectBrowserLanguage();
  }

  function injectLanguageSelector(currentLanguage) {
    const host = document.querySelector('[data-language-switcher-host]') || document.body;
    const wrapper = document.createElement('div');
    wrapper.className = 'language-switcher';
    wrapper.innerHTML = `
      <label for="languageSelector" data-i18n="ui.language">${lookup(currentLanguage, 'ui.language')}</label>
      <select id="languageSelector" aria-label="Language selector">
        <option value="en">English</option>
        <option value="fr">Français</option>
        <option value="es">Español</option>
        <option value="pt">Português</option>
        <option value="yo">Yorùbá</option>
        <option value="ha">Hausa</option>
        <option value="ig">Igbo</option>
      </select>
    `;
    const select = wrapper.querySelector('#languageSelector');
    select.value = currentLanguage;
    select.addEventListener('change', (event) => setLanguage(event.target.value));
    host.appendChild(wrapper);
  }

  function ensureStyles() {
    if (document.getElementById('ariyo-i18n-style')) return;
    const style = document.createElement('style');
    style.id = 'ariyo-i18n-style';
    style.textContent = `.language-switcher{display:inline-flex;align-items:center;gap:.4rem;font-size:.85rem;flex-wrap:wrap}.language-switcher select{border-radius:8px;padding:.2rem .4rem;max-width:160px}`;
    document.head.appendChild(style);
  }

  function init() {
    ensureStyles();
    const lang = getInitialLanguage();
    injectLanguageSelector(lang);
    applyTranslations(lang);
  }

  window.AriyoI18n = {
    setLanguage,
    t: (key, lang = getInitialLanguage()) => lookup(lang, key),
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
