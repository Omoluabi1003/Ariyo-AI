const { normalizeText, match } = require('../scripts/search-utils');

describe('search-utils', () => {
  test('normalizeText strips accents, punctuation, and collapses whitespace', () => {
    expect(normalizeText('  Béyoncé!!! Live @ Paris  ')).toBe('beyonce live paris');
    expect(normalizeText('A   B\tC')).toBe('a b c');
  });

  test('match performs case-insensitive, diacritic-insensitive substring matching', () => {
    expect(match('Beyoncé Knowles', 'beyonce')).toBe(true);
    expect(match('Afrobeat Station', 'beat')).toBe(true);
    expect(match('Afrobeat Station', '')).toBe(false);
    expect(match('Afrobeat Station', 'xyz')).toBe(false);
  });
});
