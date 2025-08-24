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
    const end = Date.now() + 3000;
    (function frame() {
      window.confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
      window.confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }
  playTrumpet();
}

function playTrumpet() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const freqs = [440, 554.37, 659.25];
  freqs.forEach(freq => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.2);
  });
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
            : 'Omoluabi wins!'
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
      col = minimaxMove(4);
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

function minimaxMove(depth) {
  let bestScore = -Infinity;
  let bestCol = null;
  const availableCols = getAvailableCols();
  for (const c of availableCols) {
    const r = getNextOpenRow(c);
    board[r][c] = PLAYER2;
    const score = minimax(depth - 1, false, -Infinity, Infinity);
    board[r][c] = 0;
    if (score > bestScore) {
      bestScore = score;
      bestCol = c;
    }
  }
  return bestCol !== null ? bestCol : availableCols[Math.floor(Math.random() * availableCols.length)];
}

function minimax(depth, maximizingPlayer, alpha, beta) {
  const terminal = checkTerminal();
  if (depth === 0 || terminal !== null) {
    if (terminal === PLAYER2) return 100000;
    if (terminal === PLAYER1) return -100000;
    return evaluateBoard();
  }
  const availableCols = getAvailableCols();
  if (maximizingPlayer) {
    let value = -Infinity;
    for (const c of availableCols) {
      const r = getNextOpenRow(c);
      board[r][c] = PLAYER2;
      const score = minimax(depth - 1, false, alpha, beta);
      board[r][c] = 0;
      value = Math.max(value, score);
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  } else {
    let value = Infinity;
    for (const c of availableCols) {
      const r = getNextOpenRow(c);
      board[r][c] = PLAYER1;
      const score = minimax(depth - 1, true, alpha, beta);
      board[r][c] = 0;
      value = Math.min(value, score);
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  }
}

function evaluateBoard() {
  let score = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === PLAYER2) score += scorePosition(r, c, PLAYER2);
      else if (board[r][c] === PLAYER1) score -= scorePosition(r, c, PLAYER1);
    }
  }
  return score;
}

function getAvailableCols() {
  const cols = [];
  for (let c = 0; c < COLS; c++) if (board[0][c] === 0) cols.push(c);
  return cols;
}

function getNextOpenRow(col) {
  for (let r = ROWS - 1; r >= 0; r--) if (board[r][col] === 0) return r;
  return -1;
}

function checkTerminal() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== 0 && checkWinner(r, c)) return board[r][c];
    }
  }
  return getAvailableCols().length === 0 ? 0 : null;
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
    messageDiv.textContent = currentPlayer === PLAYER1 ? "Your turn" : "Omoluabi's turn";
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

