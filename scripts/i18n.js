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
        logoSubtitle: 'Yoruba-inspired intelligence tuned for music, conversation, and play.',
        welcomeTitle: 'Welcome to Àríyò AI',
        heroSubtitle: 'Your pocket-sized Naija vibe curator: Music that moves, stories that stick, games that spark.',
        socialProof: 'Join 500+ Naija explorers already vibing with Ariyò.',
        ctaEnterAria: 'Enter the Àríyò AI experience',
        featureMusicTitle: 'Music journeys',
        featureMusicCopy: 'Dive into handcrafted Nigerian playlists and albums that set the tone for every mood.',
        featureChatTitle: 'Chat with Àríyò',
        featureChatCopy: 'Swap stories, discover cultural insights, and get personalized guidance from our AI host.',
        featureGamesTitle: 'Games & puzzles',
        featureGamesCopy: 'Jump into Omoluabi Tetris, Word Search, Ara Connect-4, Cycle Precision, and more.',
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
        logoSubtitle: 'Une intelligence inspirée du yoruba pour la musique, la conversation et le jeu.',
        welcomeTitle: 'Bienvenue sur Àríyò AI',
        heroSubtitle: 'Votre curateur de vibes Naija de poche : musique, histoires et jeux qui inspirent.',
        socialProof: 'Rejoignez plus de 500 explorateurs Naija déjà sur Ariyò.',
        ctaEnterAria: "Entrer dans l'expérience Àríyò AI",
        featureMusicTitle: 'Voyages musicaux',
        featureMusicCopy: 'Plongez dans des playlists et albums nigérians conçus pour chaque humeur.',
        featureChatTitle: 'Discuter avec Àríyò',
        featureChatCopy: 'Échangez, découvrez des insights culturels et recevez des conseils personnalisés.',
        featureGamesTitle: 'Jeux et puzzles',
        featureGamesCopy: 'Jouez à Omoluabi Tetris, Word Search, Ara Connect-4, Cycle Precision et plus encore.',
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
        logoSubtitle: 'Inteligencia inspirada en yoruba para música, conversación y juego.',
        welcomeTitle: 'Bienvenido a Àríyò AI',
        heroSubtitle: 'Tu curador Naija de bolsillo: música, historias y juegos que inspiran.',
        socialProof: 'Únete a más de 500 exploradores Naija que ya disfrutan Ariyò.',
        ctaEnterAria: 'Entrar a la experiencia Àríyò AI',
        featureMusicTitle: 'Rutas musicales',
        featureMusicCopy: 'Sumérgete en listas y álbumes nigerianos hechos para cada estado de ánimo.',
        featureChatTitle: 'Chatea con Àríyò',
        featureChatCopy: 'Comparte historias, descubre cultura y recibe guía personalizada de nuestra IA.',
        featureGamesTitle: 'Juegos y rompecabezas',
        featureGamesCopy: 'Juega Omoluabi Tetris, Word Search, Ara Connect-4, Cycle Precision y más.',
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
        logoSubtitle: 'Inteligência inspirada no iorubá para música, conversa e diversão.',
        welcomeTitle: 'Bem-vindo ao Àríyò AI',
        heroSubtitle: 'Seu curador Naija de bolso: música, histórias e jogos que inspiram.',
        socialProof: 'Junte-se a mais de 500 exploradores Naija já curtindo Ariyò.',
        ctaEnterAria: 'Entrar na experiência Àríyò AI',
        featureMusicTitle: 'Jornadas musicais',
        featureMusicCopy: 'Mergulhe em playlists e álbuns nigerianos feitos para cada clima.',
        featureChatTitle: 'Converse com Àríyò',
        featureChatCopy: 'Troque histórias, descubra cultura e receba orientação personalizada da nossa IA.',
        featureGamesTitle: 'Jogos e quebra-cabeças',
        featureGamesCopy: 'Jogue Omoluabi Tetris, Word Search, Ara Connect-4, Cycle Precision e mais.',
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
        logoSubtitle: 'Ọgbọ́n tí Yoruba fi hàn fún orin, ìbánisọ̀rọ̀, àti eré.',
        welcomeTitle: 'Ẹ káàbọ̀ sí Àríyò AI',
        heroSubtitle: 'Olùtọ́jú vibe Naija rẹ: orin, ìtàn, àti eré tó ń ru ẹ̀mí sókè.',
        socialProof: 'Darapọ mọ́ àwọn olùṣàwárí Naija 500+ tó ti ń gbádùn Ariyò.',
        ctaEnterAria: 'Wọlé sí ìrírí Àríyò AI',
        featureMusicTitle: 'Ìrìnàjò orin',
        featureMusicCopy: 'Rì sínú àkójọpọ̀ orin Naijiria tí a ṣe pẹ̀lú ìmọ̀lára gbogbo.',
        featureChatTitle: 'Bá Àríyò sọ̀rọ̀',
        featureChatCopy: 'Pàṣípààrò ìtàn, kó ìmọ̀ àṣà, kí o sì gba ìtọ́sọ́nà láti AI wa.',
        featureGamesTitle: 'Eré àti àdánwò',
        featureGamesCopy: 'Fo sínú Omoluabi Tetris, Word Search, Ara Connect-4, Cycle Precision, àti míì.',
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
        logoSubtitle: 'Hankali na salon Yoruba don kiɗa, tattaunawa, da wasa.',
        welcomeTitle: 'Barka da zuwa Àríyò AI',
        heroSubtitle: 'Mai tsara vibes na Naija a aljihunka: kiɗa, labarai, da wasanni.',
        socialProof: 'Shiga masu binciken Naija 500+ da suka riga suna amfani da Ariyò.',
        ctaEnterAria: 'Shiga kwarewar Àríyò AI',
        featureMusicTitle: 'Tafiyar kiɗa',
        featureMusicCopy: 'Shiga cikin jerin waƙoƙin Najeriya da kundin da suka dace da kowace yanayi.',
        featureChatTitle: 'Yi hira da Àríyò',
        featureChatCopy: 'Musayar labarai, gano al’adu, da samun jagora na musamman daga AI ɗinmu.',
        featureGamesTitle: 'Wasanni da wasanin kwakwalwa',
        featureGamesCopy: 'Shiga Omoluabi Tetris, Word Search, Ara Connect-4, Cycle Precision, da sauransu.',
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
        logoSubtitle: ' ọgụgụ isi sitere n’Yoruba maka egwu, mkparịta ụka, na egwuregwu.',
        welcomeTitle: 'Nnọọ na Àríyò AI',
        heroSubtitle: 'Onye na-ahazi vibes Naija gị: egwu, akụkọ, na egwuregwu na-akpali akpali.',
        socialProof: 'Soro ndị nchọcha Naija 500+ na-eji Ariyò ugbu a.',
        ctaEnterAria: 'Banye n’ahụmịhe Àríyò AI',
        featureMusicTitle: 'Njem egwu',
        featureMusicCopy: 'Banye n’ime playlists na album ndị Naịjirịa e mere maka ọnọdụ niile.',
        featureChatTitle: 'Kparịta ụka na Àríyò',
        featureChatCopy: 'Kekọrịta akụkọ, mụta omenala, ma nweta nduzi ahaziri iche site na AI anyị.',
        featureGamesTitle: 'Egwuregwu na mgbagwoju anya',
        featureGamesCopy: 'Gbaa Omoluabi Tetris, Word Search, Ara Connect-4, Cycle Precision, na ndị ọzọ.',
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
