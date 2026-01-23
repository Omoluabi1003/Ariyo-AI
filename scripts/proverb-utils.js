(function () {
  /**
   * @typedef {Object} CulturalNote
   * @property {string} yo
   * @property {string} en
   */

  /** @type {CulturalNote[]} */
  const PROVERB_LIBRARY = [
    { yo: 'Ọ̀rọ̀ ọdún kì í tán l\'ọ́jọ́ kan.', en: "Wisdom isn't learned in a day." },
    { yo: 'Tí a bá ní í wò òrìṣà, a ò fi ojú kan wò ẹ.', en: 'Respect must be shared, never half-given.' },
    { yo: 'Ìwà l\'ẹwà.', en: 'Character is beauty.' },
    { yo: 'Ìbàjẹ́ ọ̀rẹ́ kò dá ọ̀tá dúró.', en: 'A broken friendship does not stop an enemy.' },
    { yo: 'A kì í fi ọwọ́ kan ẹnu mù, ká tún fi ọwọ́ kan tìkára wa.', en: 'One hand cannot cover the whole mouth.' },
    { yo: 'Bí ọmọ bá mọ̀ wẹ, yóò bá àgbà jọ jẹun.', en: 'When a child learns to wash, they dine with elders.' },
    { yo: 'Bí ọwọ́ bá bá ọwọ́ wé, ìdí yóò mọ́.', en: 'When hands wash each other, they become clean.' },
    { yo: 'Àgbà tó bá fẹ́ràn ọmọ, kì í gbé e sórí òkúta.', en: 'An elder who loves a child does not place them on a stone.' },
    { yo: 'Ọ̀pẹ́ là ń fi gbé ọmọ ní ńlá.', en: 'A child is raised with gratitude.' },
    { yo: 'Ìrìn àjò kì í jẹ́ kí a mọ̀ọ́rẹ́ mọ́lẹ̀.', en: 'Travel broadens the heart.' },
    { yo: 'Ẹni tó bá fẹ́ràn ìtan, ó mọ̀ọ́rẹ́ sí ìmúra.', en: 'Those who love stories respect preparation.' },
    { yo: 'Ọ̀rọ̀ tó bá dùn, kì í pé.', en: 'Sweet words do not always last long.' }
  ];

  /**
   * @param {CulturalNote} note
   * @returns {boolean}
   */
  function isValidCulturalNote(note) {
    return Boolean(note && typeof note.yo === 'string' && note.yo.trim() && typeof note.en === 'string' && note.en.trim());
  }

  /**
   * @param {Date} date
   * @returns {number}
   */
  function getLocalDayNumber(date) {
    const safeDate = date instanceof Date && !Number.isNaN(date.valueOf()) ? date : new Date();
    return new Date(safeDate.getFullYear(), safeDate.getMonth(), safeDate.getDate()).getTime();
  }

  /**
   * @param {Date} [date]
   * @param {CulturalNote[]} [library]
   * @returns {CulturalNote}
   */
  function selectDailyProverb(date = new Date(), library = PROVERB_LIBRARY) {
    const source = Array.isArray(library) && library.length ? library : PROVERB_LIBRARY;
    const dayKey = getLocalDayNumber(date);
    const index = Math.abs(Math.floor(dayKey / (24 * 60 * 60 * 1000))) % source.length;
    return source[index];
  }

  /**
   * @param {Object} options
   * @param {CulturalNote | null | undefined} options.culturalNote
   * @param {Date} [options.date]
   * @returns {CulturalNote}
   */
  function resolveProverb({ culturalNote, date } = {}) {
    if (isValidCulturalNote(culturalNote)) {
      return culturalNote;
    }
    return selectDailyProverb(date);
  }

  if (typeof window !== 'undefined') {
    window.AriyoProverbUtils = {
      PROVERB_LIBRARY,
      isValidCulturalNote,
      selectDailyProverb,
      resolveProverb
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      PROVERB_LIBRARY,
      isValidCulturalNote,
      selectDailyProverb,
      resolveProverb
    };
  }
})();
