// Minimal boot-time catalog to keep initial render fast on slow networks.
/**
 * @typedef {Object} CulturalNote
 * @property {string} yo
 * @property {string} en
 */
/**
 * @typedef {Object} Storyliner
 * @property {string} [origin]
 * @property {string} [inspiration]
 * @property {string} [whyItMatters]
 */
/**
 * @typedef {Object} Track
 * @property {string} title
 * @property {string} src
 * @property {CulturalNote} [culturalNote]
 */
/**
 * @typedef {Object} Album
 * @property {string} name
 * @property {string} cover
 * @property {Storyliner} [storyliner]
 * @property {Track[]} tracks
 */
(function () {
  const BASE_URL = (() => {
    if (typeof window === 'undefined') return './';
    const path = window.location.pathname || '';
    if (path.includes('/apps/')) return '../../';
    return './';
  })();
  const PLAYLIST_STORAGE_KEY = 'userPlaylist';

  const albums = [
    {
      name: 'Kindness',
      cover: `${BASE_URL}Kindness%20Cover%20Art.jpg`,
      storyliner: {
        origin: 'Lagos and Port Harcourt sessions shaped by community storytelling circles.',
        inspiration: 'Street wisdom, family conversations, and everyday resilience.',
        whyItMatters: 'Keeps community memory alive while spotlighting contemporary Afrobeats truth-telling.'
      },
      tracks: [
        { src: `${BASE_URL}A%20Very%20Good%20Bad%20Guy%20v3.mp3`, title: 'A Very Good Bad Guy v3' },
        { src: `${BASE_URL}Dem%20Wan%20Shut%20Me%20Up.mp3`, title: 'Dem Wan Shut Me Up' },
        { src: `${BASE_URL}EFCC.mp3`, title: 'EFCC' },
        {
          src: `${BASE_URL}Locked%20Away.mp3`,
          title: 'Locked Away',
          culturalNote: {
            yo: "Ọ̀rọ̀ ọdún kì í tán l'ọ́jọ́ kan.",
            en: "Wisdom isn't learned in a day."
          }
        }
      ]
    },
    {
      name: 'OfficialPaulInspires Spoken Word Series',
      cover: `${BASE_URL}SpokenWordSeries_Logo.png`,
      tracks: []
    }
  ];

  function loadUserPlaylist() {
    try {
      const stored = JSON.parse(localStorage.getItem(PLAYLIST_STORAGE_KEY)) || [];
      stored.forEach(track => {
        if (!track.lrc) {
          track.lrc = track.src.replace(/\.mp3$/, '.lrc');
        }
      });
      albums.push({ name: 'My Playlist', cover: `${BASE_URL}Playlist.jpg`, tracks: stored });
    } catch (error) {
      albums.push({ name: 'My Playlist', cover: `${BASE_URL}Playlist.jpg`, tracks: [] });
    }
  }

  loadUserPlaylist();

  albums.forEach(album => {
    album.tracks.forEach(track => {
      track.lrc = track.src.replace(/\.mp3$/, '.lrc');
    });
  });

  const radioStations = [
    { name: 'Naija Hits (Live)', location: 'Nigeria', url: 'https://stream.zeno.fm/thbqnu2wvmzuv', logo: `${BASE_URL}Logo.jpg` },
    { name: 'Radio Nigeria', location: 'Abuja', url: 'https://stream.radionigeria.gov.ng/live', logo: `${BASE_URL}Logo.jpg` },
    { name: 'BBC World Service', location: 'London', url: 'https://utulsa.streamguys1.com/KWGSHD3-MP3', logo: `${BASE_URL}Logo.jpg` }
  ];

  window.albums = albums;
  window.radioStations = radioStations;
  window.latestTracks = [];
  window.RSS_COLLECTIONS = [
    {
      name: 'Hip Hop / American Rap',
      category: 'Hip Hop / American Rap',
      cover: `${BASE_URL}Playlist.jpg`,
      rssFeed: true
    },
    {
      name: 'Afrobeat',
      category: 'Afrobeat',
      cover: `${BASE_URL}Playlist.jpg`,
      rssFeed: true
    },
    {
      name: 'Pop',
      category: 'Pop',
      cover: `${BASE_URL}Playlist.jpg`,
      rssFeed: true
    }
  ];
  window.RSS_DEFAULT_COVER = `${BASE_URL}Logo.jpg`;
  window.PLAYLIST_STORAGE_KEY = PLAYLIST_STORAGE_KEY;
  window.playlistAlbumIndex = albums.length - 1;
  window.libraryState = { local: albums, streams: radioStations, tracks: [] };
  window.__ariyoLibraryMode = 'lite';
  window.__ariyoLibraryHydrated = false;
  window.dispatchEvent(new CustomEvent('ariyo:library-ready', { detail: { source: 'lite' } }));
})();
