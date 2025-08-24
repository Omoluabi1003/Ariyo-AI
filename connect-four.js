const ROWS = 6;
const COLS = 7;
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let currentPlayer = 1; // 1 = red, 2 = yellow
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
  if (!gameActive) return;
  const col = parseInt(e.target.dataset.col);
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      board[r][col] = currentPlayer;
      const cell = boardDiv.querySelector(`[data-row="${r}"][data-col="${col}"]`);
      cell.classList.add(currentPlayer === 1 ? 'red' : 'yellow');
      if (checkWinner(r, col)) {
        messageDiv.textContent = `${currentPlayer === 1 ? 'Red' : 'Yellow'} wins!`;
        gameActive = false;
      } else if (board.flat().every(v => v !== 0)) {
        messageDiv.textContent = "It's a draw!";
        gameActive = false;
      } else {
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        updateMessage();
      }
      break;
    }
  }
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
  messageDiv.textContent = `${currentPlayer === 1 ? 'Red' : 'Yellow'}'s turn`;
}

function resetGame() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  currentPlayer = 1;
  gameActive = true;
  createBoard();
}

resetBtn.addEventListener('click', resetGame);

createBoard();
