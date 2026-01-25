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
  directLinkEl.textContent = 'Open game in a new tab';
  directLinkEl.target = '_blank';
  directLinkEl.rel = 'noopener noreferrer';
  statusEl.textContent = 'Enjoy the full experience in a Studio-branded window.';
} else {
  frameEl.remove();
  directLinkEl.href = 'games.html';
  directLinkEl.textContent = 'Back to Games';
  statusEl.textContent = 'Launch parameters are missing. Return to Games and try again.';
}
