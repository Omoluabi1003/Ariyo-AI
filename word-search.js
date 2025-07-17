const categories = {
    "Programming": ["javascript", "html", "css", "python", "java"],
    "Fruits": ["apple", "banana", "mango", "orange", "grape"],
    "Animals": ["lion", "tiger", "zebra", "eagle", "shark"],
    "Colors": ["red", "blue", "green", "yellow", "purple"],
    "Sports": ["football", "tennis", "cricket", "boxing", "hockey"],
    "Countries": ["nigeria", "ghana", "kenya", "egypt", "togo"],
    "Movies": ["avatar", "inception", "matrix", "titanic", "gladiator"],
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
const board = [];

function createBoard() {
    const gameBoard = document.getElementById("game-board");
    gameBoard.innerHTML = "";
    gameBoard.style.gridTemplateColumns = `repeat(${gridSize}, 30px)`;
    board.length = 0;
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

function pickWords(wordList, maxWords = 10) {
    if (wordList.length <= maxWords) {
        return wordList;
    }
    const shuffled = [...wordList].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, maxWords);
}

function startGame() {
    selectedCategory = document.getElementById("category-select").value;
    words = categories[selectedCategory];
    createBoard();
    placeWords(pickWords(words));
    fillEmptyCells();
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
