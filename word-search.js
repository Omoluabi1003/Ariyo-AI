const categories = {
    "Programming": [
        "javascript", "html", "css", "python", "java",
        "react", "node", "angular", "swift", "rust"
    ],
    "Fruits": [
        "apple", "banana", "mango", "orange", "grape",
        "peach", "pear", "plum", "cherry", "lemon"
    ],
    "Animals": [
        "lion", "tiger", "zebra", "eagle", "shark",
        "bear", "whale", "giraffe", "rhino", "panda"
    ],
    "Colors": [
        "red", "blue", "green", "yellow", "purple",
        "orange", "indigo", "violet", "brown", "pink"
    ],
    "Sports": [
        "football", "tennis", "cricket", "boxing", "hockey",
        "rugby", "golf", "soccer", "curling", "skiing"
    ],
    "Countries": [
        "nigeria", "ghana", "kenya", "egypt", "togo",
        "brazil", "canada", "france", "china", "spain"
    ],
    "Movies": [
        "avatar", "inception", "matrix", "titanic", "gladiator",
        "godfather", "terminator", "rocky", "alien", "jaws"
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

function updateGridSize() {
    gridSize = window.innerWidth <= 480 ? 10 : 15;
}

function getCellSize() {
    const maxSize = 30;
    const available = Math.floor(window.innerWidth * 0.95);
    return Math.min(maxSize, Math.floor(available / gridSize));
}

function randomizeCategoryWords() {
    for (const key of Object.keys(categories)) {
        categories[key] = categories[key].sort(() => Math.random() - 0.5);
    }
}
const board = [];
const wordListElement = document.getElementById("word-list");
let wordsInGame = [];
let foundWords = [];
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
    for (const word of wordList) {
        let placed = false;
        while (!placed) {
            const direction = Math.random() > 0.5 ? "horizontal" : "vertical";
            const row = Math.floor(Math.random() * gridSize);
            const col = Math.floor(Math.random() * gridSize);

            if (canPlace(word, row, col, direction)) {
                for (let i = 0; i < word.length; i++) {
                    let cell;
                    if (direction === "horizontal") {
                        cell = board[row][col + i];
                    } else {
                        cell = board[row + i][col];
                    }
                    cell.textContent = word[i].toUpperCase();
                    cell.dataset.word = word;
                }
                placed = true;
            }
        }
    }
}

function canPlace(word, row, col, direction) {
    if (direction === "horizontal") {
        if (col + word.length > gridSize) {
            return false;
        }
        for (let i = 0; i < word.length; i++) {
            if (board[row][col + i].textContent !== "" && board[row][col + i].textContent !== word[i].toUpperCase()) {
                return false;
            }
        }
    } else {
        if (row + word.length > gridSize) {
            return false;
        }
        for (let i = 0; i < word.length; i++) {
            if (board[row + i][col].textContent !== "" && board[row + i][col].textContent !== word[i].toUpperCase()) {
                return false;
            }
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
    if (selectedCells.includes(cell)) return;

    if (direction === null) {
        if (row === startRow) {
            direction = "horizontal";
        } else if (col === startCol) {
            direction = "vertical";
        } else {
            return;
        }
    }

    if (direction === "horizontal" && row === startRow && Math.abs(col - startCol) === selectedCells.length) {
        selectedCells.push(cell);
        cell.classList.add("selected");
    } else if (direction === "vertical" && col === startCol && Math.abs(row - startRow) === selectedCells.length) {
        selectedCells.push(cell);
        cell.classList.add("selected");
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
    if (wordsInGame.includes(word)) {
        markFound(word);
    } else if (wordsInGame.includes(reversed)) {
        markFound(reversed);
    }
}

function markFound(word) {
    if (foundWords.includes(word)) return;
    foundWords.push(word);
    const cells = [];
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (board[i][j].dataset.word === word) {
                board[i][j].classList.add("found");
                cells.push(board[i][j]);
            }
        }
    }
    drawLine(cells);
    const item = wordListElement.querySelector(`li[data-word="${word}"]`);
    if (item) item.classList.add("found");
    checkWin();
}

function checkWin() {
    if (foundWords.length === wordsInGame.length) {
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
                msg.textContent = "You Win!";
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

function pickWords(wordList, maxWords = 10) {
    if (wordList.length <= maxWords) {
        return wordList;
    }
    const shuffled = [...wordList].sort(() => 0.5 - Math.random());
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

function startGame() {
    updateGridSize();
    randomizeCategoryWords();
    selectedCategory = document.getElementById("category-select").value;
    words = categories[selectedCategory];
    wordsInGame = pickWords(words, 10);
    foundWords = [];
    createBoard();
    placeWords(wordsInGame);
    fillEmptyCells();
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
    gameBoard.style.gridTemplateColumns = `repeat(${gridSize}, ${cellSize}px)`;
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const cell = board[i][j];
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.style.lineHeight = `${cellSize}px`;
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
        const cells = [];
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (board[i][j].dataset.word === word) {
                    cells.push(board[i][j]);
                }
            }
        }
        drawLine(cells);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("category-select");
    const newBtn = document.getElementById("new-game");
    for (const name of Object.keys(categories)) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    }
    select.addEventListener("change", startGame);
    newBtn.addEventListener("click", startGame);
    startGame();
});

let resizeTimeout;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        resizeBoard();
    }, 100);
});
