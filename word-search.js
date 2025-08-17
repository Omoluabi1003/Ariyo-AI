import { generateGrid } from './word-search-grid.js';

const categories = {
  Fruits: [
    'BANANA', 'MANGO', 'ORANGE', 'PAWPAW', 'GUAVA',
    'PINEAPPLE', 'APPLE', 'GRAPE', 'PEACH', 'PLUM',
    'APRICOT', 'KIWI'
  ],
  Animals: [
    'ZEBRA', 'LION', 'GOAT', 'SNAKE', 'ELEPHANT',
    'GIRAFFE', 'CHEETAH', 'HIPPO', 'MONKEY', 'PANTHER',
    'HYENA', 'RABBIT'
  ],
  Technology: [
    'PYTHON', 'REACT', 'CODE', 'COMPUTER', 'INTERNET',
    'ALGORITHM', 'ROBOT', 'AI', 'JAVA', 'NODE',
    'SERVER', 'APP'
  ],
  'Nigerian States': [
    'LAGOS', 'KANO', 'ENUGU', 'ABIA', 'BENUE', 'DELTA',
    'KWARA', 'ONDO', 'OSUN', 'KATSINA', 'BAYELSA',
    'JIGAWA', 'KOGI', 'EKITI', 'OGUN', 'ANAMBRA',
    'EDO', 'IMO', 'SOKOTO', 'TARABA'
  ]
};

const gridSize = 15;
const gameContainer = document.getElementById('game');
const categorySelect = document.getElementById('category');
const startBtn = document.getElementById('start');

let gridEl;
let wordListEl;
let words = [];
let isMouseDown = false;
let startCell = null;
let currentPath = [];
let foundWords = new Set();

function setCellSize() {
  const dimension = Math.min(window.innerWidth, window.innerHeight) * 0.8;
  const size = Math.max(20, Math.floor(dimension / gridSize));
  document.documentElement.style.setProperty('--cell-size', `${size}px`);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function populateCategories() {
  Object.keys(categories).forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
  categorySelect.value = Object.keys(categories)[0];
}

function startGame() {
  const category = categorySelect.value || Object.keys(categories)[0];
  gameContainer.innerHTML = '';
  foundWords = new Set();
  isMouseDown = false;
  startCell = null;
  currentPath = [];

  words = categories[category].map((w) => w.toUpperCase());
  shuffle(words);

  setCellSize();

  const grid = generateGrid(words, gridSize);

  gridEl = document.createElement('div');
  wordListEl = document.createElement('div');
  gridEl.className = 'grid';
  wordListEl.className = 'word-list';
  gridEl.style.setProperty('--grid-size', gridSize);

  grid.forEach((row, r) => {
    row.forEach((letter, c) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.textContent = letter.toUpperCase();
      cell.dataset.row = r;
      cell.dataset.col = c;
      gridEl.appendChild(cell);
    });
  });

  words.forEach((word) => {
    const wEl = document.createElement('div');
    wEl.textContent = word;
    wEl.id = `word-${word}`;
    wEl.className = 'word';
    wordListEl.appendChild(wEl);
  });

  gameContainer.appendChild(gridEl);
  gameContainer.appendChild(wordListEl);

  gridEl.addEventListener('mousedown', handleMouseDown);
  gridEl.addEventListener('mouseover', handleMouseOver);
}

function clearSelection() {
  currentPath.forEach((cell) => cell.classList.remove('selected'));
  currentPath = [];
}

function getPath(start, end) {
  const sr = parseInt(start.dataset.row, 10);
  const sc = parseInt(start.dataset.col, 10);
  const er = parseInt(end.dataset.row, 10);
  const ec = parseInt(end.dataset.col, 10);

  let dr = er - sr;
  let dc = ec - sc;

  if (dr === 0 && dc === 0) return [start];

  const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
  const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

  if (dr !== 0 && dc !== 0) return null;

  const length = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
  const path = [];
  for (let i = 0; i < length; i++) {
    const r = sr + stepR * i;
    const c = sc + stepC * i;
    const cell = gridEl.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    if (!cell) return null;
    path.push(cell);
  }
  return path;
}

function checkSelection() {
  if (currentPath.length === 0) return;
  const letters = currentPath.map((c) => c.textContent).join('');
  const reversed = letters.split('').reverse().join('');
  let match = null;
  if (words.includes(letters)) match = letters;
  else if (words.includes(reversed)) match = reversed;

  if (match && !foundWords.has(match)) {
    currentPath.forEach((c) => c.classList.add('found'));
    foundWords.add(match);
    const wEl = document.getElementById(`word-${match}`);
    if (wEl) wEl.classList.add('found');
    if (foundWords.size === words.length && window.confetti) {
      window.confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
    }
  }
}

function handleMouseDown(e) {
  if (!e.target.classList.contains('cell')) return;
  isMouseDown = true;
  startCell = e.target;
  currentPath = [startCell];
  startCell.classList.add('selected');
}

function handleMouseOver(e) {
  if (!isMouseDown || !e.target.classList.contains('cell')) return;
  const path = getPath(startCell, e.target);
  if (!path) return;
  clearSelection();
  currentPath = path;
  currentPath.forEach((cell) => cell.classList.add('selected'));
}

function handleMouseUp() {
  if (!isMouseDown) return;
  isMouseDown = false;
  checkSelection();
  clearSelection();
}

document.addEventListener('mouseup', handleMouseUp);
startBtn.addEventListener('click', startGame);
categorySelect.addEventListener('change', startGame);
window.addEventListener('resize', setCellSize);

populateCategories();
startGame();

