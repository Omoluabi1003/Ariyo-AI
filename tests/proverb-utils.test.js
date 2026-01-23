const {
  PROVERB_LIBRARY,
  isValidCulturalNote,
  selectDailyProverb,
  resolveProverb
} = require('../scripts/proverb-utils');

describe('proverb utilities', () => {
  test('validates cultural note shape', () => {
    expect(isValidCulturalNote({ yo: 'Ọ̀rọ̀', en: 'Wisdom' })).toBe(true);
    expect(isValidCulturalNote({ yo: '', en: 'Wisdom' })).toBe(false);
    expect(isValidCulturalNote(null)).toBe(false);
  });

  test('selects deterministic proverb for a given day', () => {
    const date = new Date(2025, 2, 10);
    const proverb = selectDailyProverb(date, PROVERB_LIBRARY);
    const proverbAgain = selectDailyProverb(date, PROVERB_LIBRARY);
    expect(proverb).toEqual(proverbAgain);
  });

  test('prefers cultural notes when available', () => {
    const culturalNote = { yo: 'Ìwà l\'ẹwà.', en: 'Character is beauty.' };
    const result = resolveProverb({ culturalNote, date: new Date(2025, 0, 1) });
    expect(result).toEqual(culturalNote);
  });
});
