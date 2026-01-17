// Minimal boot-time catalog to keep initial render fast on slow networks.
(async () => {
  const BASE_URL = new URL('../../', window.location.href).pathname;
  const PLAYLIST_STORAGE_KEY = 'userPlaylist';

  const fallbackCover = `${BASE_URL}Logo.jpg`;
  const playlistCover = `${BASE_URL}Playlist.jpg`;

  const buildAlbumsFromTracks = tracks => {
    const albums = [];
    const albumMap = new Map();

    tracks.forEach(track => {
      if (!track || !track.url) return;
      const albumName = track.album || 'Omoluabi Collection';
      let album = albumMap.get(albumName);
      if (!album) {
        album = {
          name: albumName,
          cover: track.albumCover || track.artwork || fallbackCover,
          releaseYear: track.releaseYear || null,
          tracks: [],
        };
        albumMap.set(albumName, album);
        albums.push(album);
      }

      album.tracks.push({
        src: track.url,
        title: track.title,
        artist: track.artist,
        releaseYear: track.releaseYear,
        duration: track.duration,
        cover: track.artwork || track.albumCover,
        sourceType: track.sourceType,
        isLive: track.isLive,
      });
    });

    return albums;
  };

  const attachPlaylistAlbum = albums => {
    try {
      const stored = JSON.parse(localStorage.getItem(PLAYLIST_STORAGE_KEY)) || [];
      stored.forEach(track => {
        if (!track.lrc && track.src) {
          track.lrc = track.src.replace(/\.mp3$/, '.lrc');
        }
      });
      albums.push({ name: 'My Playlist', cover: playlistCover, tracks: stored });
    } catch (error) {
      albums.push({ name: 'My Playlist', cover: playlistCover, tracks: [] });
    }

    albums.forEach(album => {
      album.tracks.forEach(track => {
        if (track.src && !track.lrc) {
          track.lrc = track.src.replace(/\.mp3$/, '.lrc');
        }
      });
    });
  };

  const normalizeStations = stations =>
    stations.map(station => ({
      name: station.name,
      location: station.region || station.location || '',
      url: station.streamUrl || station.url,
      logo: station.artwork || fallbackCover,
    }));

  const hydrate = async () => {
    const [tracksResponse, stationsResponse] = await Promise.all([
      fetch('/api/tracks', { cache: 'no-store' }),
      fetch('/api/stations', { cache: 'no-store' }),
    ]);

    const tracks = tracksResponse.ok ? await tracksResponse.json() : [];
    const stations = stationsResponse.ok ? await stationsResponse.json() : [];

    const albums = buildAlbumsFromTracks(tracks.slice(0, 6));
    attachPlaylistAlbum(albums);

    window.albums = albums;
    window.radioStations = normalizeStations(stations.slice(0, 3));
    window.latestTracks = [];
    window.RSS_COLLECTIONS = [
      {
        name: 'Hip Hop / American Rap',
        category: 'Hip Hop / American Rap',
        cover: playlistCover,
        rssFeed: true,
      },
      {
        name: 'Afrobeat',
        category: 'Afrobeat',
        cover: playlistCover,
        rssFeed: true,
      },
      {
        name: 'Pop',
        category: 'Pop',
        cover: playlistCover,
        rssFeed: true,
      },
    ];
    window.RSS_DEFAULT_COVER = fallbackCover;
    window.PLAYLIST_STORAGE_KEY = PLAYLIST_STORAGE_KEY;
    window.playlistAlbumIndex = albums.length - 1;
    window.libraryState = { local: albums, streams: window.radioStations, tracks: [] };
    window.__ariyoLibraryMode = 'lite';
    window.__ariyoLibraryHydrated = true;
    window.dispatchEvent(new CustomEvent('ariyo:library-ready', { detail: { source: 'lite' } }));
  };

  try {
    await hydrate();
  } catch (error) {
    console.warn('[catalog-lite] Failed to load media catalog:', error);
    window.albums = [];
    window.radioStations = [];
    window.latestTracks = [];
    window.__ariyoLibraryMode = 'lite';
    window.__ariyoLibraryHydrated = false;
    window.dispatchEvent(new CustomEvent('ariyo:library-ready', { detail: { source: 'lite-failed' } }));
  }
})();
