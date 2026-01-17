const fs = require('fs');
const path = require('path');
const vm = require('vm');

const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL || '/media').replace(/\/$/, '');
const ASSET_BASE_URL = (process.env.ASSET_BASE_URL || '/').replace(/\/$/, '');
let cachedLibrary = null;

function normalizeMediaUrl(source) {
  if (!source) return null;
  if (/^https?:\/\//i.test(source)) return source;
  const normalized = source.replace(/^(\.\.\/)+/, '').replace(/^\/+/, '');
  return `${MEDIA_BASE_URL}/${normalized}`;
}

function normalizeAssetUrl(source) {
  if (!source) return null;
  if (/^https?:\/\//i.test(source)) return source;
  const normalized = source.replace(/^(\.\.\/)+/, '').replace(/^\/+/, '');
  return `${ASSET_BASE_URL}/${normalized}`;
}

function loadLibraryData() {
  if (cachedLibrary) {
    return cachedLibrary;
  }

  const dataPath = path.join(__dirname, '..', 'data', 'media-library-source.js');
  const dataSource = fs.readFileSync(dataPath, 'utf8');
  const sandbox = {
    window: {},
    CustomEvent: class CustomEvent {
      constructor(type, detail) {
        this.type = type;
        this.detail = detail;
      }
    },
    console,
  };

  sandbox.window.dispatchEvent = () => {};

  vm.runInNewContext(dataSource, sandbox);
  cachedLibrary = {
    albums: sandbox.window.albums || [],
    radioStations: sandbox.window.radioStations || [],
  };
  return cachedLibrary;
}

function buildTrackManifest() {
  const { albums } = loadLibraryData();
  const tracks = [];

  albums.forEach((album, albumIndex) => {
    if (!album || !Array.isArray(album.tracks)) return;
    const albumName = album.name || album.title || `Album ${albumIndex + 1}`;
    const albumCover = normalizeAssetUrl(album.cover || album.coverImage);
    const albumArtist = album.artist || 'Omoluabi';
    const albumReleaseYear = typeof album.releaseYear !== 'undefined' ? album.releaseYear : null;

    album.tracks.forEach((track, trackIndex) => {
      if (!track) return;
      const url = normalizeMediaUrl(track.url || track.src);
      if (!url) return;
      const title = track.title || `Track ${trackIndex + 1}`;
      tracks.push({
        id: track.id || `${albumName}-${trackIndex}`.toLowerCase().replace(/\s+/g, '-'),
        title,
        artist: track.artist || albumArtist,
        artwork: normalizeAssetUrl(track.cover) || albumCover,
        url,
        duration: typeof track.duration === 'number' ? track.duration : null,
        album: albumName,
        albumCover,
        releaseYear: typeof track.releaseYear !== 'undefined' ? track.releaseYear : albumReleaseYear,
        sourceType: track.sourceType || (track.isLive ? 'stream' : 'file'),
        isLive: Boolean(track.isLive || track.sourceType === 'stream'),
      });
    });
  });

  return tracks;
}

function buildStationManifest() {
  const { radioStations } = loadLibraryData();
  return radioStations.map((station, index) => ({
    id: station.id || `${station.name || 'station'}-${index}`.toLowerCase().replace(/\s+/g, '-'),
    name: station.name,
    region: station.location || station.region || null,
    streamUrl: station.streamUrl || station.url,
    artwork: normalizeAssetUrl(station.logo || station.thumbnail),
  }));
}

module.exports = {
  buildTrackManifest,
  buildStationManifest,
};
