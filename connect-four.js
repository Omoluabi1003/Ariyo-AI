const ROWS = 6;
const COLS = 7;
const HUMAN = 1;
const AI = 2;
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let currentPlayer = HUMAN;
let gameActive = true;

const boardDiv = document.getElementById('board');
const messageDiv = document.getElementById('message');
const resetBtn = document.getElementById('reset');

function createBoard() {
  boardDiv.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('click', handleClick);
      boardDiv.appendChild(cell);
    }
  }
  updateMessage();
}

function handleClick(e) {
  if (!gameActive || currentPlayer !== HUMAN) return;
  const col = parseInt(e.target.dataset.col);
  if (makeMove(col, HUMAN) && gameActive) {
    currentPlayer = AI;
    updateMessage();
    setTimeout(computerMove, 500);
  }
}

function makeMove(col, player) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      board[r][col] = player;
      const cell = boardDiv.querySelector(`[data-row="${r}"][data-col="${col}"]`);
      cell.classList.add(player === HUMAN ? 'red' : 'yellow');
      if (checkWinner(r, col)) {
        messageDiv.textContent = player === HUMAN ? 'You win!' : 'Ara wins!';
        gameActive = false;
      } else if (board.flat().every(v => v !== 0)) {
        messageDiv.textContent = "It's a draw!";
        gameActive = false;
      }
      return true;
    }
  }
  return false;
}

function computerMove() {
  if (!gameActive) return;
  let col = findWinningMove(AI);
  if (col === null) col = findWinningMove(HUMAN);
  if (col === null) {
    const availableCols = [];
    for (let c = 0; c < COLS; c++) if (board[0][c] === 0) availableCols.push(c);
    col = availableCols[Math.floor(Math.random() * availableCols.length)];
  }
  if (makeMove(col, AI) && gameActive) {
    currentPlayer = HUMAN;
    updateMessage();
  }
}

function findWinningMove(player) {
  for (let c = 0; c < COLS; c++) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] === 0) {
        board[r][c] = player;
        const win = checkWinner(r, c);
        board[r][c] = 0;
        if (win) return c;
        break;
      }
    }
  }
  return null;
}

function countDirection(r, c, dr, dc) {
  const player = board[r][c];
  let count = 0;
  r += dr;
  c += dc;
  while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
    count++;
    r += dr;
    c += dc;
  }
  return count;
}

function checkWinner(r, c) {
  return (
    1 + countDirection(r, c, 0, 1) + countDirection(r, c, 0, -1) >= 4 ||
    1 + countDirection(r, c, 1, 0) + countDirection(r, c, -1, 0) >= 4 ||
    1 + countDirection(r, c, 1, 1) + countDirection(r, c, -1, -1) >= 4 ||
    1 + countDirection(r, c, 1, -1) + countDirection(r, c, -1, 1) >= 4
  );
}

function updateMessage() {
  messageDiv.textContent = currentPlayer === HUMAN ? "Your turn" : "Ara's turn";
}

function resetGame() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  currentPlayer = HUMAN;
  gameActive = true;
  createBoard();
}

resetBtn.addEventListener('click', resetGame);

createBoard();

