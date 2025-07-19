const categories = {
    "Programming": [
        "javascript", "html", "css", "python", "java",
        "react", "node", "angular", "swift", "rust",
        "typescript", "go", "csharp", "kotlin", "php",
        "django", "flask", "graphql", "redux", "docker"
    ],
    "Fruits": [
        "apple", "banana", "mango", "orange", "grape",
        "peach", "pear", "plum", "cherry", "lemon",
        "kiwi", "watermelon", "pineapple", "strawberry", "papaya",
        "coconut", "blueberry", "raspberry", "apricot", "guava"
    ],
    "Animals": [
        "lion", "tiger", "zebra", "eagle", "shark",
        "bear", "whale", "giraffe", "rhino", "panda",
        "elephant", "wolf", "kangaroo", "koala", "rabbit",
        "camel", "hippo", "fox", "dolphin", "otter"
    ],
    "Colors": [
        "red", "blue", "green", "yellow", "purple",
        "orange", "indigo", "violet", "brown", "pink",
        "cyan", "magenta", "teal", "maroon", "turquoise",
        "beige", "salmon", "lime", "charcoal", "silver"
    ],
    "Sports": [
        "football", "tennis", "cricket", "boxing", "hockey",
        "rugby", "golf", "soccer", "curling", "skiing",
        "baseball", "volleyball", "swimming", "cycling", "badminton",
        "archery", "rowing", "sailing", "surfing", "handball"
    ],
    "Countries": [
        "nigeria", "ghana", "kenya", "egypt", "togo",
        "brazil", "canada", "france", "china", "spain",
        "germany", "italy", "japan", "mexico", "india",
        "russia", "uk", "usa", "argentina", "southafrica"
    ],
    "Movies": [
        "avatar", "inception", "matrix", "titanic", "gladiator",
        "godfather", "terminator", "rocky", "alien", "jaws",
        "avengers", "scarface", "psycho", "frozen", "joker",
        "bond", "diehard", "godzilla", "heat", "shrek"
    ],
    "Nigerian States": [
        "abia", "adamawa", "akwaibom", "anambra", "bauchi", "bayelsa",
        "benue", "borno", "crossriver", "delta", "ebonyi", "edo",
        "ekiti", "enugu", "gombe", "imo", "jigawa", "kaduna", "kano",
        "katsina", "kebbi", "kogi", "kwara", "lagos", "nasarawa", "niger",
        "ogun", "ondo", "osun", "oyo", "plateau", "rivers", "sokoto",
        "taraba", "yobe", "zamfara", "fct"
    ]
};

let selectedCategory = Object.keys(categories)[0];
let words = categories[selectedCategory];
let gridSize = window.innerWidth <= 480 ? 10 : 15;

// Constants used for sizing calculations
const GRID_GAP = 2; // must match CSS gap value
const BOARD_PADDING = 5; // must match CSS padding
const BOARD_BORDER = 2; // must match CSS border width
const BOARD_SCALE = 0.8; // percentage of viewport used for board sizing

function updateGridSize() {
    gridSize = window.innerWidth <= 480 ? 10 : 15;
}

function getCellSize() {
    const maxSize = 30;
    const available = Math.floor(Math.min(window.innerWidth, window.innerHeight) * BOARD_SCALE);
    const extras = (GRID_GAP * (gridSize - 1)) + (BOARD_PADDING * 2) + (BOARD_BORDER * 2);
    return Math.min(maxSize, Math.floor((available - extras) / gridSize));
}
const board = [];
const wordListElement = document.getElementById("word-list");
let wordsInGame = [];
let foundWords = [];
let foundWordCells = {};
let startTime = 0;
let timerInterval;
let selecting = false;
let selectedCells = [];
let direction = null;
let startRow = 0;
let startCol = 0;
let lineCanvas;
let lineCtx;

function createBoard() {
    const gameBoard = document.getElementById("game-board");
    lineCanvas = document.getElementById("line-canvas");
    gameBoard.innerHTML = "";
    const cellSize = getCellSize();
    const boardSize = cellSize * gridSize + GRID_GAP * (gridSize - 1);
    const containerSize = boardSize + BOARD_PADDING * 2;
    gameBoard.style.width = `${containerSize}px`;
    gameBoard.style.height = `${containerSize}px`;
    gameBoard.style.gridTemplateColumns = `repeat(${gridSize}, ${cellSize}px)`;
    board.length = 0;
    for (let i = 0; i < gridSize; i++) {
        const row = [];
        for (let j = 0; j < gridSize; j++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.style.lineHeight = `${cellSize}px`;
            cell.style.fontSize = `${Math.floor(cellSize * 0.55)}px`;
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener("pointerdown", handlePointerDown);
            gameBoard.appendChild(cell);
            row.push(cell);
        }
        board.push(row);
    }
    gameBoard.addEventListener("pointermove", handlePointerMove);
    // set canvas size after cells are created
    const boardRect = gameBoard.getBoundingClientRect();
    lineCanvas.width = boardRect.width;
    lineCanvas.height = boardRect.height;
    lineCtx = lineCanvas.getContext("2d");
    lineCtx.clearRect(0, 0, lineCanvas.width, lineCanvas.height);
}

function placeWords(wordList) {
    const dirs = [
        "horizontal",
        "horizontalReverse",
        "vertical",
        "verticalReverse"
    ];
    for (const word of wordList) {
        let placed = false;
        while (!placed) {
            const direction = dirs[Math.floor(Math.random() * dirs.length)];
            let row = Math.floor(Math.random() * gridSize);
            let col = Math.floor(Math.random() * gridSize);

            if (direction === "horizontal" && col + word.length > gridSize) {
                col = gridSize - word.length;
            } else if (direction === "horizontalReverse" && col - word.length + 1 < 0) {
                col = word.length - 1;
            } else if (direction === "vertical" && row + word.length > gridSize) {
                row = gridSize - word.length;
            } else if (direction === "verticalReverse" && row - word.length + 1 < 0) {
                row = word.length - 1;
            }

            if (canPlace(word, row, col, direction)) {
                for (let i = 0; i < word.length; i++) {
                    let r = row;
                    let c = col;
                    if (direction === "horizontal") {
                        c += i;
                    } else if (direction === "horizontalReverse") {
                        c -= i;
                    } else if (direction === "vertical") {
                        r += i;
                    } else if (direction === "verticalReverse") {
                        r -= i;
                    }
                    const cell = board[r][c];
                    cell.textContent = word[i].toUpperCase();
                    if (cell.dataset.words) {
                        const arr = cell.dataset.words.split(',');
                        if (!arr.includes(word)) {
                            arr.push(word);
                            cell.dataset.words = arr.join(',');
                        }
                    } else {
                        cell.dataset.words = word;
                    }
                }
                placed = true;
            }
        }
    }
}

function canPlace(word, row, col, direction) {
    let dRow = 0;
    let dCol = 0;
    if (direction === "horizontal") dCol = 1;
    else if (direction === "horizontalReverse") dCol = -1;
    else if (direction === "vertical") dRow = 1;
    else if (direction === "verticalReverse") dRow = -1;

    for (let i = 0; i < word.length; i++) {
        const r = row + dRow * i;
        const c = col + dCol * i;
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) {
            return false;
        }
        const cell = board[r][c];
        if (cell.textContent !== "" && cell.textContent !== word[i].toUpperCase()) {
            return false;
        }
    }
    return true;
}

function fillEmptyCells() {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (board[i][j].textContent === "") {
                board[i][j].textContent = String.fromCharCode(65 + Math.floor(Math.random() * 26));
            }
        }
    }
}

function randomLetterDifferent(current) {
    let letter;
    do {
        letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    } while (letter === current);
    return letter;
}

function removeDuplicateWords(wordList) {
    for (const word of wordList) {
        const occurrences = [];
        const len = word.length;
        // horizontal
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c <= gridSize - len; c++) {
                let match = true;
                for (let i = 0; i < len; i++) {
                    if (board[r][c + i].textContent.toLowerCase() !== word[i]) {
                        match = false; break;
                    }
                }
                if (match) occurrences.push({ r, c, dir: 'h' });
                // reverse
                match = true;
                for (let i = 0; i < len; i++) {
                    if (board[r][c + len - 1 - i].textContent.toLowerCase() !== word[i]) {
                        match = false; break;
                    }
                }
                if (match) occurrences.push({ r, c: c + len - 1, dir: 'hr' });
            }
        }
        // vertical
        for (let c = 0; c < gridSize; c++) {
            for (let r = 0; r <= gridSize - len; r++) {
                let match = true;
                for (let i = 0; i < len; i++) {
                    if (board[r + i][c].textContent.toLowerCase() !== word[i]) {
                        match = false; break;
                    }
                }
                if (match) occurrences.push({ r, c, dir: 'v' });
                // reverse
                match = true;
                for (let i = 0; i < len; i++) {
                    if (board[r + len - 1 - i][c].textContent.toLowerCase() !== word[i]) {
                        match = false; break;
                    }
                }
                if (match) occurrences.push({ r: r + len - 1, c, dir: 'vr' });
            }
        }
        for (let i = 1; i < occurrences.length; i++) {
            const occ = occurrences[i];
            const idx = Math.floor(Math.random() * len);
            if (occ.dir === 'h') {
                const cell = board[occ.r][occ.c + idx];
                cell.textContent = randomLetterDifferent(cell.textContent);
            } else if (occ.dir === 'hr') {
                const cell = board[occ.r][occ.c - idx];
                cell.textContent = randomLetterDifferent(cell.textContent);
            } else if (occ.dir === 'v') {
                const cell = board[occ.r + idx][occ.c];
                cell.textContent = randomLetterDifferent(cell.textContent);
            } else if (occ.dir === 'vr') {
                const cell = board[occ.r - idx][occ.c];
                cell.textContent = randomLetterDifferent(cell.textContent);
            }
        }
    }
}

function drawLine(cells) {
    if (!lineCtx || cells.length === 0) return;
    const boardRect = document.getElementById("game-board").getBoundingClientRect();
    const startRect = cells[0].getBoundingClientRect();
    const endRect = cells[cells.length - 1].getBoundingClientRect();
    const startX = startRect.left - boardRect.left + startRect.width / 2;
    const startY = startRect.top - boardRect.top + startRect.height / 2;
    const endX = endRect.left - boardRect.left + endRect.width / 2;
    const endY = endRect.top - boardRect.top + endRect.height / 2;
    lineCtx.strokeStyle = "red";
    lineCtx.lineWidth = 4;
    lineCtx.beginPath();
    lineCtx.moveTo(startX, startY);
    lineCtx.lineTo(endX, endY);
    lineCtx.stroke();
}

function clearSelection() {
    selectedCells.forEach(c => c.classList.remove("selected"));
    selectedCells = [];
}

function handlePointerDown(e) {
    selecting = true;
    clearSelection();
    const cell = e.currentTarget;
    startRow = parseInt(cell.dataset.row);
    startCol = parseInt(cell.dataset.col);
    direction = null;
    selectedCells.push(cell);
    cell.classList.add("selected");
}

function handlePointerMove(e) {
    if (e.buttons !== 1) selecting = false;
    if (!selecting) return;
    const cell = document.elementFromPoint(e.clientX, e.clientY);
    if (!cell || !cell.classList.contains("cell")) return;
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    if (direction === null) {
        const rowDiff = row - startRow;
        const colDiff = col - startCol;
        if (rowDiff === 0 && colDiff === 0) return;
        if (Math.abs(rowDiff) >= Math.abs(colDiff)) {
            direction = { dRow: rowDiff > 0 ? 1 : -1, dCol: 0 };
        } else {
            direction = { dRow: 0, dCol: colDiff > 0 ? 1 : -1 };
        }
    }

    const rowDiff = row - startRow;
    const colDiff = col - startCol;
    if (direction.dRow !== 0 && rowDiff * direction.dRow < 0) return;
    if (direction.dCol !== 0 && colDiff * direction.dCol < 0) return;
    if (direction.dRow !== 0 && direction.dCol !== 0) return;

    const steps = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
    for (let i = selectedCells.length; i <= steps; i++) {
        const r = startRow + direction.dRow * i;
        const c = startCol + direction.dCol * i;
        const nextCell = board[r][c];
        if (!selectedCells.includes(nextCell)) {
            selectedCells.push(nextCell);
            nextCell.classList.add("selected");
        }
    }
}

function handlePointerUp() {
    if (!selecting) return;
    selecting = false;
    checkSelectedWord();
    clearSelection();
}

document.addEventListener("pointerup", handlePointerUp);

function checkSelectedWord() {
    if (selectedCells.length === 0) return;
    let word = selectedCells.map(c => c.textContent.toLowerCase()).join("");
    let reversed = word.split("").reverse().join("");
    if (wordsInGame.includes(word) && selectedCells.every(c => (c.dataset.words || "").split(',').includes(word))) {
        markFound(word, selectedCells.slice());
    } else if (wordsInGame.includes(reversed) && selectedCells.every(c => (c.dataset.words || "").split(',').includes(reversed))) {
        markFound(reversed, selectedCells.slice());
    }
}

function markFound(word, cells) {
    if (foundWords.includes(word)) return;
    foundWords.push(word);
    foundWordCells[word] = cells;
    cells.forEach(c => c.classList.add("found"));
    drawLine(cells);
    const item = wordListElement.querySelector(`li[data-word="${word}"]`);
    if (item) item.classList.add("found");
    checkWin();
}

function checkWin() {
    if (foundWords.length === wordsInGame.length) {
        stopTimer();
        const totalTime = Math.floor((Date.now() - startTime) / 1000);
        const duration = 5000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                clearInterval(interval);
                const msg = document.createElement("div");
                msg.id = "win-message";
                msg.textContent = `You Win in ${totalTime}s!`;
                document.getElementById("board-container").appendChild(msg);
                return;
            }

            const particleCount = 50 * (timeLeft / duration);
            // school pride!
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }, colors: ['#bb0000', '#ffffff'] }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }, colors: ['#bb0000', '#ffffff'] }));
            // balloons!
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.4, 0.6), y: Math.random() - 0.2 }, shapes: ['circle'] }));
        }, 250);
    }
}

function pickWords(wordList, maxWords = 20) {
    const unique = [...new Set(wordList)];
    if (unique.length <= maxWords) {
        return unique;
    }
    const shuffled = [...unique].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, maxWords);
}

function populateWordList() {
    wordListElement.innerHTML = "";
    wordsInGame.forEach(w => {
        const li = document.createElement("li");
        li.textContent = w.toUpperCase();
        li.dataset.word = w;
        wordListElement.appendChild(li);
    });
}

function startTimer() {
    const timerEl = document.getElementById("timer");
    clearInterval(timerInterval);
    startTime = Date.now();
    timerEl.textContent = "Time: 0s";
    timerInterval = setInterval(() => {
        const t = Math.floor((Date.now() - startTime) / 1000);
        timerEl.textContent = `Time: ${t}s`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function startGame() {
    updateGridSize();
    selectedCategory = document.getElementById("category-select").value;
    words = [...new Set(categories[selectedCategory])];
    wordsInGame = pickWords(words, 20);
    foundWords = [];
    foundWordCells = {};
    startTimer();
    createBoard();
    placeWords(wordsInGame);
    fillEmptyCells();
    removeDuplicateWords(wordsInGame);
    populateWordList();
}

function resizeBoard() {
    const newSize = window.innerWidth <= 480 ? 10 : 15;
    if (newSize !== gridSize) {
        gridSize = newSize;
        startGame();
        return;
    }
    const gameBoard = document.getElementById("game-board");
    const cellSize = getCellSize();
    const boardSize = cellSize * gridSize + GRID_GAP * (gridSize - 1);
    const containerSize = boardSize + BOARD_PADDING * 2;
    gameBoard.style.width = `${containerSize}px`;
    gameBoard.style.height = `${containerSize}px`;
    gameBoard.style.gridTemplateColumns = `repeat(${gridSize}, ${cellSize}px)`;
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const cell = board[i][j];
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.style.lineHeight = `${cellSize}px`;
            cell.style.fontSize = `${Math.floor(cellSize * 0.55)}px`;
        }
    }
    const boardRect = gameBoard.getBoundingClientRect();
    lineCanvas.width = boardRect.width;
    lineCanvas.height = boardRect.height;
    lineCtx = lineCanvas.getContext("2d");
    redrawLines();
}

function redrawLines() {
    for (const word of foundWords) {
        const cells = foundWordCells[word] || [];
        drawLine(cells);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("category-select");
    for (const name of Object.keys(categories)) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    }
    select.addEventListener("change", startGame);
    const newBtn = document.getElementById("new-game-btn");
    newBtn.addEventListener("click", startGame);
});

let resizeTimeout;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        resizeBoard();
    }, 100);
});
