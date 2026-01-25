import { createGameEmbedCard } from '../components/GameEmbedCard.js';

const GAMES = [
  {
    id: 'geofs',
    title: 'GeoFS Flight Simulator',
    description: 'A free, browser-based flight simulator.',
    url: 'https://www.geo-fs.com/'
  },
  {
    id: 'myretrotvs',
    title: 'MyRetroTVs',
    description: 'A nostalgic TV simulator experience.',
    url: 'https://www.myretrotvs.com/'
  }
];

const mountGames = () => {
  const grid = document.getElementById('gamesGrid');
  if (!grid) return;

  grid.innerHTML = '';
  GAMES.forEach((game) => {
    grid.appendChild(createGameEmbedCard(game));
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountGames, { once: true });
} else {
  mountGames();
}
