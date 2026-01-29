(() => {
  const normalizeText = (value) => {
    const raw = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return raw;
  };

  const match = (text, query) => {
    const normalizedText = normalizeText(text);
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
      return false;
    }

    return normalizedText.includes(normalizedQuery);
  };

  const utils = {
    normalizeText,
    match
  };

  if (typeof window !== 'undefined') {
    window.AriyoSearchUtils = utils;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = utils;
  }
})();
