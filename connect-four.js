const ROWS = 6;
const COLS = 7;
const PLAYER1 = 1;
const PLAYER2 = 2;
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let currentPlayer = PLAYER1;
let gameActive = true;
let isVsAI = true;
let skillLevel = parseInt(localStorage.getItem('connect4Skill') || '1');
let playerMoves = 0;

const boardDiv = document.getElementById('board');
const messageDiv = document.getElementById('message');
const resetBtn = document.getElementById('reset');
const modeSelect = document.getElementById('mode');

function celebrate() {
  if (window.confetti) {
    window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  }
}

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
  if (isVsAI && currentPlayer !== PLAYER1) return;
  const col = parseInt(e.target.dataset.col);
  if (makeMove(col, currentPlayer)) {
    if (isVsAI) {
      if (currentPlayer === PLAYER1) {
        playerMoves++;
        if (gameActive) {
          currentPlayer = PLAYER2;
          updateMessage();
          setTimeout(computerMove, 500);
        }
      }
    } else if (gameActive) {
      currentPlayer = currentPlayer === PLAYER1 ? PLAYER2 : PLAYER1;
      updateMessage();
    }
  }
}

function makeMove(col, player) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      board[r][col] = player;
      const cell = boardDiv.querySelector(`[data-row="${r}"][data-col="${col}"]`);
      cell.classList.add(player === PLAYER1 ? 'red' : 'yellow');
      if (checkWinner(r, col)) {
        messageDiv.textContent = isVsAI
          ? player === PLAYER1
            ? 'You win!'
            : 'Ara wins!'
          : player === PLAYER1
            ? 'Player 1 wins!'
            : 'Player 2 wins!';
        gameActive = false;
        if (player === PLAYER1) celebrate();
        adjustSkill(player === PLAYER1);
      } else if (board.flat().every(v => v !== 0)) {
        messageDiv.textContent = "It's a draw!";
        gameActive = false;
        adjustSkill(false);
      }
      return true;
    }
  }
  return false;
}

function computerMove() {
  if (!gameActive || !isVsAI) return;
  let col = null;
  if (skillLevel >= 2) {
    col = findWinningMove(PLAYER2);
    if (col === null) col = findWinningMove(PLAYER1);
  }
  if (col === null) {
    if (skillLevel >= 3) {
      col = bestMove(PLAYER2);
    } else {
      const availableCols = [];
      for (let c = 0; c < COLS; c++) if (board[0][c] === 0) availableCols.push(c);
      col = availableCols[Math.floor(Math.random() * availableCols.length)];
    }
  }
  if (makeMove(col, PLAYER2) && gameActive) {
    currentPlayer = PLAYER1;
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

function bestMove(player) {
  let bestScore = -Infinity;
  let bestCol = null;
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] !== 0) continue;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] === 0) {
        board[r][c] = player;
        const score = scorePosition(r, c, player);
        board[r][c] = 0;
        if (score > bestScore) {
          bestScore = score;
          bestCol = c;
        }
        break;
      }
    }
  }
  if (bestCol !== null) return bestCol;
  const availableCols = [];
  for (let c = 0; c < COLS; c++) if (board[0][c] === 0) availableCols.push(c);
  return availableCols[Math.floor(Math.random() * availableCols.length)];
}

function scorePosition(r, c, player) {
  let score = 0;
  const center = Math.floor(COLS / 2);
  if (c === center) score += 3;
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];
  for (const [dr, dc] of dirs) {
    let count = 1;
    let openEnds = 0;
    for (const dir of [-1, 1]) {
      let nr = r + dr * dir;
      let nc = c + dc * dir;
      while (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
        if (board[nr][nc] === player) {
          count++;
        } else if (board[nr][nc] === 0) {
          openEnds++;
          break;
        } else {
          break;
        }
        nr += dr * dir;
        nc += dc * dir;
      }
    }
    if (count >= 4) score += 100;
    else if (count === 3 && openEnds > 0) score += 5;
    else if (count === 2 && openEnds > 0) score += 2;
  }
  return score;
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

function adjustSkill(playerWon) {
  if (!isVsAI) return;
  if (playerWon && playerMoves <= 12) {
    skillLevel = Math.min(skillLevel + 1, 3);
  } else if (!playerWon) {
    skillLevel = Math.max(skillLevel - 1, 1);
  }
  localStorage.setItem('connect4Skill', skillLevel.toString());
}

function updateMessage() {
  if (!gameActive) return;
  if (isVsAI) {
    messageDiv.textContent = currentPlayer === PLAYER1 ? "Your turn" : "Ara's turn";
  } else {
    messageDiv.textContent = currentPlayer === PLAYER1 ? "Player 1's turn" : "Player 2's turn";
  }
}

function resetGame() {
  if (window.confetti && typeof window.confetti.reset === 'function') {
    window.confetti.reset();
  }
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  currentPlayer = PLAYER1;
  playerMoves = 0;
  gameActive = true;
  createBoard();
}

resetBtn.addEventListener('click', resetGame);
modeSelect.addEventListener('change', () => {
  isVsAI = modeSelect.value === 'ai';
  resetGame();
});

createBoard();

