const i18nText = (key, fallback) => {
  try {
    const value = window.AriyoI18n?.t?.(key);
    return value && value !== key ? value : fallback;
  } catch (_) {
    return fallback;
  }
};

const titleEl = document.getElementById('studioGameTitle');
const descriptionEl = document.getElementById('studioGameDescription');
const statusEl = document.getElementById('studioGameStatus');
const frameEl = document.getElementById('studioGameFrame');
const directLinkEl = document.getElementById('studioGameDirect');

const params = new URLSearchParams(window.location.search);
const gameTitle = params.get('title');
const gameDescription = params.get('description');
const gameUrl = params.get('url');

if (gameTitle) {
  titleEl.textContent = gameTitle;
  document.title = `${gameTitle} | Àríyò AI Studio`;
}

if (gameDescription) {
  descriptionEl.textContent = gameDescription;
}

if (gameUrl) {
  frameEl.src = gameUrl;
  directLinkEl.href = gameUrl;
  directLinkEl.textContent = i18nText('ui.studioOpenInNewTab', 'Open game in a new tab');
  directLinkEl.target = '_blank';
  directLinkEl.rel = 'noopener noreferrer';
  statusEl.textContent = i18nText('ui.studioEnjoyWindow', 'Enjoy the full experience in a Studio-branded window.');
} else {
  frameEl.remove();
  directLinkEl.href = 'games.html';
  directLinkEl.textContent = i18nText('ui.studioBackToGames', 'Back to Games');
  statusEl.textContent = i18nText('ui.studioLaunchMissing', 'Launch parameters are missing. Return to Games and try again.');
}
