import { describe, it, expect } from 'vitest';
import { albums, radioStations } from './data.js';

describe('Data Structure', () => {
  describe('albums', () => {
    it('should be an array', () => {
      expect(Array.isArray(albums)).toBe(true);
    });

    it('should not be empty if data is expected', () => {
      // This test assumes there should always be some albums.
      // Adjust if albums can be empty.
      expect(albums.length).toBeGreaterThan(0);
    });

    it('each album should have a name, cover, and tracks array', () => {
      albums.forEach(album => {
        expect(album).toHaveProperty('name');
        expect(typeof album.name).toBe('string');
        expect(album).toHaveProperty('cover');
        expect(typeof album.cover).toBe('string');
        expect(album).toHaveProperty('tracks');
        expect(Array.isArray(album.tracks)).toBe(true);
      });
    });

    it('each track within an album should have a src and title', () => {
      albums.forEach(album => {
        album.tracks.forEach(track => {
          expect(track).toHaveProperty('src');
          expect(typeof track.src).toBe('string');
          expect(track).toHaveProperty('title');
          expect(typeof track.title).toBe('string');
        });
      });
    });
  });

  describe('radioStations', () => {
    it('should be an array', () => {
      expect(Array.isArray(radioStations)).toBe(true);
    });

    it('should not be empty if data is expected', () => {
      // This test assumes there should always be some radio stations.
      expect(radioStations.length).toBeGreaterThan(0);
    });

    it('each radio station should have a name, location, url, and logo', () => {
      radioStations.forEach(station => {
        expect(station).toHaveProperty('name');
        expect(typeof station.name).toBe('string');
        expect(station).toHaveProperty('location');
        expect(typeof station.location).toBe('string');
        expect(station).toHaveProperty('url');
        expect(typeof station.url).toBe('string');
        expect(station).toHaveProperty('logo');
        expect(typeof station.logo).toBe('string');
      });
    });
  });
});
