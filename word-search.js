const words = ["javascript", "html", "css", "python", "java"];
const gridSize = 10;
const board = [];

function createBoard() {
    const gameBoard = document.getElementById("game-board");
    for (let i = 0; i < gridSize; i++) {
        const row = [];
        for (let j = 0; j < gridSize; j++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.dataset.row = i;
            cell.dataset.col = j;
            gameBoard.appendChild(cell);
            row.push(cell);
        }
        board.push(row);
    }
}

function placeWords() {
    for (const word of words) {
        let placed = false;
        while (!placed) {
            const direction = Math.random() > 0.5 ? "horizontal" : "vertical";
            const row = Math.floor(Math.random() * gridSize);
            const col = Math.floor(Math.random() * gridSize);

            if (canPlace(word, row, col, direction)) {
                for (let i = 0; i < word.length; i++) {
                    if (direction === "horizontal") {
                        board[row][col + i].textContent = word[i];
                    } else {
                        board[row + i][col].textContent = word[i];
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
            if (board[row][col + i].textContent !== "" && board[row][col + i].textContent !== word[i]) {
                return false;
            }
        }
    } else {
        if (row + word.length > gridSize) {
            return false;
        }
        for (let i = 0; i < word.length; i++) {
            if (board[row + i][col].textContent !== "" && board[row + i][col].textContent !== word[i]) {
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

createBoard();
placeWords();
fillEmptyCells();
