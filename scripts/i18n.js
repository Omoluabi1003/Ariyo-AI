(function () {
  const STORAGE_KEY = 'ariyo.language';
  const DEFAULT_LANG = 'en';
  const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'pt', 'yo', 'ha', 'ig'];

  // Centralized dictionary-based translations.
  // Add UI text here, then reference keys in markup via data-i18n* attributes.
  const translations = {
    en: {
      ui: {
        language: 'Language',
        launchExperience: 'Launch experience',
        installPwa: 'Install PWA',
        lightMode: 'Light mode',
        darkMode: 'Dark mode',
        loading: 'Loading',
        navChooseAlbum: 'Choose An Album',
        navChooseTrack: 'Choose A Track',
        navMyPlaylist: 'My Playlist',
        navRadioStations: 'Radio Stations',
        navGames: 'Games & Simulations',
        navAboutUs: 'About Us',
        searchPlaceholder: 'Search tracks or stations...',
        searchAria: 'Search tracks or radio stations',
        sharePage: 'Share this page',
        navChooseAlbumAria: 'Choose an album',
        navChooseTrackAria: 'Choose a track',
        navMyPlaylistAria: 'My playlist',
        navRadioStationsAria: 'Radio stations',
        navGamesAria: 'Games and simulations',
        navAboutUsAria: 'About us',
        titlePreviousTrack: 'Previous track',
        titlePlay: 'Play',
        titlePause: 'Pause',
        titleStop: 'Stop',
        titleNextTrack: 'Next track',
        titleShuffle: 'Toggle shuffle',
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
        navChooseAlbum: 'Choisir un album',
        navChooseTrack: 'Choisir une piste',
        navMyPlaylist: 'Ma playlist',
        navRadioStations: 'Stations radio',
        navGames: 'Jeux et simulations',
        navAboutUs: 'À propos',
        searchPlaceholder: 'Rechercher des pistes ou stations...',
        searchAria: 'Rechercher des pistes ou stations radio',
        sharePage: 'Partager cette page',
        navChooseAlbumAria: 'Choisir un album',
        navChooseTrackAria: 'Choisir une piste',
        navMyPlaylistAria: 'Ma playlist',
        navRadioStationsAria: 'Stations radio',
        navGamesAria: 'Jeux et simulations',
        navAboutUsAria: 'À propos',
        titlePreviousTrack: 'Piste précédente',
        titlePlay: 'Lire',
        titlePause: 'Pause',
        titleStop: 'Arrêter',
        titleNextTrack: 'Piste suivante',
        titleShuffle: 'Activer le mode aléatoire',
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
        navChooseAlbum: 'Elegir un álbum',
        navChooseTrack: 'Elegir una pista',
        navMyPlaylist: 'Mi lista',
        navRadioStations: 'Emisoras de radio',
        navGames: 'Juegos y simulaciones',
        navAboutUs: 'Sobre nosotros',
        searchPlaceholder: 'Buscar pistas o estaciones...',
        searchAria: 'Buscar pistas o estaciones de radio',
        sharePage: 'Compartir esta página',
        navChooseAlbumAria: 'Elegir un álbum',
        navChooseTrackAria: 'Elegir una pista',
        navMyPlaylistAria: 'Mi lista',
        navRadioStationsAria: 'Emisoras de radio',
        navGamesAria: 'Juegos y simulaciones',
        navAboutUsAria: 'Sobre nosotros',
        titlePreviousTrack: 'Pista anterior',
        titlePlay: 'Reproducir',
        titlePause: 'Pausar',
        titleStop: 'Detener',
        titleNextTrack: 'Siguiente pista',
        titleShuffle: 'Alternar aleatorio',
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
        navChooseAlbum: 'Escolher um álbum',
        navChooseTrack: 'Escolher uma faixa',
        navMyPlaylist: 'Minha playlist',
        navRadioStations: 'Estações de rádio',
        navGames: 'Jogos e simulações',
        navAboutUs: 'Sobre nós',
        searchPlaceholder: 'Buscar faixas ou estações...',
        searchAria: 'Buscar faixas ou estações de rádio',
        sharePage: 'Compartilhar esta página',
        navChooseAlbumAria: 'Escolher um álbum',
        navChooseTrackAria: 'Escolher uma faixa',
        navMyPlaylistAria: 'Minha playlist',
        navRadioStationsAria: 'Estações de rádio',
        navGamesAria: 'Jogos e simulações',
        navAboutUsAria: 'Sobre nós',
        titlePreviousTrack: 'Faixa anterior',
        titlePlay: 'Reproduzir',
        titlePause: 'Pausar',
        titleStop: 'Parar',
        titleNextTrack: 'Próxima faixa',
        titleShuffle: 'Alternar aleatório',
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
        navChooseAlbum: 'Yan àlùbùmù',
        navChooseTrack: 'Yan orin kan',
        navMyPlaylist: 'Àkójọ orin mi',
        navRadioStations: 'Àwọn ilé iṣẹ́ redio',
        navGames: 'Eré àti àfọwọ̀ṣe',
        navAboutUs: 'Nípa wa',
        searchPlaceholder: 'Wá orin tàbí redio...',
        searchAria: 'Wá orin tàbí ibùdó redio',
        sharePage: 'Pín ojúewé yìí',
        navChooseAlbumAria: 'Yan àlùbùmù',
        navChooseTrackAria: 'Yan orin kan',
        navMyPlaylistAria: 'Àkójọ orin mi',
        navRadioStationsAria: 'Àwọn ilé iṣẹ́ redio',
        navGamesAria: 'Eré àti àfọwọ̀ṣe',
        navAboutUsAria: 'Nípa wa',
        titlePreviousTrack: 'Orin tó kọjá',
        titlePlay: 'Ṣeré',
        titlePause: 'Dúró díẹ̀',
        titleStop: 'Dúró',
        titleNextTrack: 'Orin tó tẹ̀lé',
        titleShuffle: 'Yí àdàpọ̀ padà',
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
        navChooseAlbum: 'Zaɓi kundi',
        navChooseTrack: 'Zaɓi waƙa',
        navMyPlaylist: 'Jerin waƙoƙi na',
        navRadioStations: 'Tashoshin rediyo',
        navGames: 'Wasanni da kwaikwayo',
        navAboutUs: 'Game da mu',
        searchPlaceholder: 'Nemo waƙoƙi ko tashoshi...',
        searchAria: 'Nemo waƙoƙi ko tashoshin rediyo',
        sharePage: 'Raba wannan shafi',
        navChooseAlbumAria: 'Zaɓi kundi',
        navChooseTrackAria: 'Zaɓi waƙa',
        navMyPlaylistAria: 'Jerin waƙoƙi na',
        navRadioStationsAria: 'Tashoshin rediyo',
        navGamesAria: 'Wasanni da kwaikwayo',
        navAboutUsAria: 'Game da mu',
        titlePreviousTrack: 'Waƙa ta baya',
        titlePlay: 'Kunna',
        titlePause: 'Dakatar na ɗan lokaci',
        titleStop: 'Tsaya',
        titleNextTrack: 'Waƙa ta gaba',
        titleShuffle: 'Canza bazuwar',
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
        navChooseAlbum: 'Họrọ album',
        navChooseTrack: 'Họrọ egwu',
        navMyPlaylist: 'Ndepụta egwu m',
        navRadioStations: 'Ụlọọrụ redio',
        navGames: 'Egwuregwu na simulation',
        navAboutUs: 'Banyere anyị',
        searchPlaceholder: 'Chọọ egwu ma ọ bụ ụlọọrụ...',
        searchAria: 'Chọọ egwu ma ọ bụ ụlọọrụ redio',
        sharePage: 'Kekọrịta ibe a',
        navChooseAlbumAria: 'Họrọ album',
        navChooseTrackAria: 'Họrọ egwu',
        navMyPlaylistAria: 'Ndepụta egwu m',
        navRadioStationsAria: 'Ụlọọrụ redio',
        navGamesAria: 'Egwuregwu na simulation',
        navAboutUsAria: 'Banyere anyị',
        titlePreviousTrack: 'Egwu gara aga',
        titlePlay: 'Kpọọ',
        titlePause: 'Kwụsịtụ nwa oge',
        titleStop: 'Kwụsị',
        titleNextTrack: 'Egwu na-esote',
        titleShuffle: 'Gbanwee ngwakọta',
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
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.setAttribute('title', lookup(lang, el.dataset.i18nTitle));
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
    return DEFAULT_LANG;
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
