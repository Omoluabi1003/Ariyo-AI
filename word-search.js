document.addEventListener('DOMContentLoaded', () => {
    const words = ["javascript", "html", "css", "python", "java", "react", "angular", "vue", "node", "mongo", "grid", "flex", "font", "style", "body"];
    const gridSize = 12;
    let board = [];
    let selectedCells = [];
    let foundWords = [];

    const gameBoard = document.getElementById("game-board");
    const wordList = document.getElementById("word-list");
    const newGameBtn = document.getElementById("new-game");

    function init() {
        gameBoard.innerHTML = '';
        wordList.innerHTML = '';
        board = [];
        selectedCells = [];
        foundWords = [];

        for (let i = 0; i < gridSize; i++) {
            const row = [];
            for (let j = 0; j < gridSize; j++) {
                const cell = document.createElement("div");
                cell.classList.add("cell");
                cell.dataset.row = i;
                cell.dataset.col = j;

                // Set cell position and size for the grid
                cell.style.width = `${100 / gridSize}%`;
                cell.style.height = `${100 / gridSize}%`;
                cell.style.left = `${j * (100 / gridSize)}%`;
                cell.style.top = `${i * (100 / gridSize)}%`;
                cell.style.fontSize = `min(2.5vw, 20px)`;


                gameBoard.appendChild(cell);
                row.push({ element: cell, letter: '' });
            }
            board.push(row);
        }

        placeWords();
        fillEmptyCells();
        displayWordList();
        addCellListeners();
    }

    function placeWords() {
        const sortedWords = words.sort((a, b) => b.length - a.length);
        for (const word of sortedWords) {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 100) {
                const direction = Math.floor(Math.random() * 3); // 0: horizontal, 1: vertical, 2: diagonal
                const row = Math.floor(Math.random() * gridSize);
                const col = Math.floor(Math.random() * gridSize);

                if (canPlace(word, row, col, direction)) {
                    for (let i = 0; i < word.length; i++) {
                        let r = row;
                        let c = col;
                        if (direction === 0) c += i;
                        else if (direction === 1) r += i;
                        else { r += i; c += i; }
                        board[r][c].letter = word[i].toUpperCase();
                    }
                    placed = true;
                }
                attempts++;
            }
        }
    }

    function canPlace(word, row, col, direction) {
        for (let i = 0; i < word.length; i++) {
            let r = row, c = col;
            if (direction === 0) c += i;
            else if (direction === 1) r += i;
            else { r += i; c += i; }

            if (r >= gridSize || c >= gridSize) return false;

            const cell = board[r][c];
            if (cell.letter !== '' && cell.letter !== word[i].toUpperCase()) {
                return false;
            }
        }
        return true;
    }

    function fillEmptyCells() {
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (board[i][j].letter === '') {
                    board[i][j].letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
                }
                board[i][j].element.textContent = board[i][j].letter;
            }
        }
    }

    function displayWordList() {
        words.forEach(word => {
            const li = document.createElement("li");
            li.textContent = word;
            li.id = `word-${word}`;
            wordList.appendChild(li);
        });
    }

    function addCellListeners() {
        let isMouseDown = false;

        const startSelection = (e) => {
            isMouseDown = true;
            const cell = getCellFromEvent(e);
            if (cell) {
                selectCell(cell);
            }
        };

        const continueSelection = (e) => {
            if (isMouseDown) {
                const cell = getCellFromEvent(e);
                if (cell) {
                    selectCell(cell);
                }
            }
        };

        const endSelection = () => {
            isMouseDown = false;
            checkSelection();
            clearSelection();
        };

        gameBoard.addEventListener('mousedown', startSelection);
        gameBoard.addEventListener('mouseover', continueSelection);
        document.addEventListener('mouseup', endSelection);

        gameBoard.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startSelection(e);
        });
        gameBoard.addEventListener('touchmove', (e) => {
            e.preventDefault();
            continueSelection(e);
        });
        document.addEventListener('touchend', endSelection);
    }

    function getCellFromEvent(e) {
        const target = e.touches ? document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY) : e.target;
        if (target && target.classList.contains('cell')) {
            return target;
        }
        return null;
    }

    function selectCell(cell) {
        if (!selectedCells.includes(cell)) {
            selectedCells.push(cell);
            cell.classList.add('selected');
        }
    }

    function clearSelection() {
        selectedCells.forEach(cell => cell.classList.remove('selected'));
        selectedCells = [];
    }

    function checkSelection() {
        if (selectedCells.length === 0) return;

        let selectedWord = selectedCells.map(cell => {
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            return board[row][col].letter;
        }).join('').toLowerCase();

        let reversedSelectedWord = selectedWord.split('').reverse().join('');

        if (words.includes(selectedWord) && !foundWords.includes(selectedWord)) {
            markWordAsFound(selectedWord, selectedCells);
        } else if (words.includes(reversedSelectedWord) && !foundWords.includes(reversedSelectedWord)) {
            markWordAsFound(reversedSelectedWord, selectedCells);
        }
    }

    function markWordAsFound(word, cells) {
        foundWords.push(word);
        cells.forEach(cell => {
            cell.classList.add('found');
        });

        const wordLi = document.getElementById(`word-${word}`);
        if (wordLi) {
            wordLi.classList.add('found');
        }

        if (foundWords.length === words.length) {
            setTimeout(() => alert("Congratulations! You found all the words!"), 100);
        }
    }

    newGameBtn.addEventListener('click', init);
    window.addEventListener('resize', init); // Re-initialize on resize to adjust sizes

    init();
});
