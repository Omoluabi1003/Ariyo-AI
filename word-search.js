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
const gridSize = 15;

function getCellSize() {
    const maxSize = 30;
    const available = Math.floor(window.innerWidth * 0.95);
    return Math.min(maxSize, Math.floor(available / gridSize));
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
            cell.addEventListener("pointerenter", handlePointerEnter);
            gameBoard.appendChild(cell);
            row.push(cell);
        }
        board.push(row);
    }
    // set canvas size after cells are created
    lineCanvas.width = gameBoard.offsetWidth;
    lineCanvas.height = gameBoard.offsetHeight;
    lineCanvas.style.width = `${gameBoard.offsetWidth}px`;
    lineCanvas.style.height = `${gameBoard.offsetHeight}px`;
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
                    if (direction === "horizontal") {
                        board[row][col + i].textContent = word[i].toUpperCase();
                    } else {
                        board[row + i][col].textContent = word[i].toUpperCase();
                    }
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
    e.preventDefault();
    selecting = true;
    clearSelection();
    const cell = e.currentTarget;
    startRow = parseInt(cell.dataset.row);
    startCol = parseInt(cell.dataset.col);
    direction = null;
    selectedCells.push(cell);
    cell.classList.add("selected");
}

function handlePointerEnter(e) {
    if (!selecting) return;
    e.preventDefault();
    const cell = e.currentTarget;
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
document.addEventListener("pointercancel", handlePointerUp);

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
    selectedCells.forEach(c => c.classList.add("found"));
    drawLine(selectedCells);
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
                document.body.appendChild(msg);
                return;
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
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
    createBoard();
    placeWords(wordsInGame);
    fillEmptyCells();
    populateWordList();
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
    startGame();
});

window.addEventListener("resize", () => {
    resizeBoard();
});
