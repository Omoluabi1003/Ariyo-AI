const TIMEOUT_MS = 12000;

const createActionLink = (href, text, className = '') => {
  const link = document.createElement('a');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.className = `embed-button ${className}`.trim();
  link.textContent = text;
  return link;
};

export const createGameEmbedCard = (game) => {
  const card = document.createElement('article');
  card.className = 'game-card is-loading';

  const heading = document.createElement('h2');
  heading.textContent = game.title;

  const description = document.createElement('p');
  description.textContent = game.description;

  const embed = document.createElement('div');
  embed.className = 'game-embed';

  const iframe = document.createElement('iframe');
  iframe.src = game.url;
  iframe.title = `${game.title} embed`;
  iframe.loading = 'lazy';
  iframe.allowFullscreen = true;

  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'embed-loading';
  loadingOverlay.innerHTML = `
    <div class="spinner" aria-hidden="true"></div>
    <p class="embed-note">Loading ${game.title}...</p>
  `;

  const errorOverlay = document.createElement('div');
  errorOverlay.className = 'embed-error';
  errorOverlay.innerHTML = `
    <p class="embed-note">We couldn't load ${game.title} here. Your browser may be blocking the embed.</p>
  `;
  const errorButton = createActionLink(game.url, `Open ${game.title} in a new tab`);
  errorOverlay.appendChild(errorButton);

  const actions = document.createElement('div');
  actions.className = 'embed-actions';
  const openButton = createActionLink(game.url, `Open ${game.title} in a new tab`, 'secondary');
  actions.appendChild(openButton);

  embed.append(iframe, loadingOverlay, errorOverlay);

  let isLoading = true;
  let hasError = false;

  const setLoaded = () => {
    if (hasError) return;
    isLoading = false;
    card.classList.remove('is-loading');
  };

  const setError = () => {
    if (hasError) return;
    hasError = true;
    isLoading = false;
    card.classList.remove('is-loading');
    card.classList.add('has-error');
  };

  const timeoutId = window.setTimeout(() => {
    if (isLoading) {
      setError();
    }
  }, TIMEOUT_MS);

  iframe.addEventListener('load', () => {
    window.clearTimeout(timeoutId);
    if (isLoading) {
      setLoaded();
    }
  });

  iframe.addEventListener('error', () => {
    window.clearTimeout(timeoutId);
    setError();
  });

  card.append(heading, description, embed, actions);
  return card;
};
