const directions = [
  { dr: 0, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: 1, dc: 0 },
  { dr: -1, dc: 0 }
];

function generateGrid(words, gridSize = 12) {
  const upperWords = words.map((w) => w.toUpperCase());
  const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill("") );

  for (const word of upperWords) {
    let placed = false;
    for (let attempt = 0; attempt < 100 && !placed; attempt++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const row = Math.floor(Math.random() * gridSize);
      const col = Math.floor(Math.random() * gridSize);
      if (canPlace(grid, word, row, col, dir, gridSize)) {
        placeWord(grid, word, row, col, dir);
        placed = true;
      }
    }
  }

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === "") {
        grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }

  return grid;
}

function canPlace(grid, word, row, col, dir, size) {
  const { dr, dc } = dir;
  if (row + dr * (word.length - 1) < 0 || row + dr * (word.length - 1) >= size) return false;
  if (col + dc * (word.length - 1) < 0 || col + dc * (word.length - 1) >= size) return false;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    const letter = grid[r][c];
    if (letter !== "" && letter !== word[i]) return false;
  }
  return true;
}

function placeWord(grid, word, row, col, dir) {
  const { dr, dc } = dir;
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    grid[r][c] = word[i];
  }
}

window.generateGrid = generateGrid;
