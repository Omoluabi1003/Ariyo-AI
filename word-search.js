document.addEventListener('DOMContentLoaded', () => {
    const puzzleGrid = document.getElementById('puzzle-grid');
    const wordList = document.getElementById('word-list');
    const startButton = document.getElementById('start-button');
    const timerDisplay = document.getElementById('timer');
    const scoreDisplay = document.getElementById('score');

    const words = ['html', 'css', 'javascript', 'python', 'java', 'ruby', 'php', 'swift', 'kotlin', 'csharp'];
    const gridSize = 10;
    let grid = [];
    let selectedCells = [];
    let foundWords = [];
    let score = 0;
    let timer;
    let time = 0;

    function initGrid() {
        grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
        puzzleGrid.innerHTML = '';
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.row = i;
                cell.dataset.col = j;
                puzzleGrid.appendChild(cell);
            }
        }
    }

    function placeWords() {
        for (const word of words) {
            let placed = false;
            while (!placed) {
                const direction = Math.random() > 0.5 ? 'horizontal' : 'vertical';
                const row = Math.floor(Math.random() * gridSize);
                const col = Math.floor(Math.random() * gridSize);

                if (canPlaceWord(word, row, col, direction)) {
                    for (let i = 0; i < word.length; i++) {
                        if (direction === 'horizontal') {
                            grid[row][col + i] = word[i];
                        } else {
                            grid[row + i][col] = word[i];
                        }
                    }
                    placed = true;
                }
            }
        }
    }

    function canPlaceWord(word, row, col, direction) {
        if (direction === 'horizontal') {
            if (col + word.length > gridSize) return false;
            for (let i = 0; i < word.length; i++) {
                if (grid[row][col + i] !== '' && grid[row][col + i] !== word[i]) {
                    return false;
                }
            }
        } else {
            if (row + word.length > gridSize) return false;
            for (let i = 0; i < word.length; i++) {
                if (grid[row + i][col] !== '' && grid[row + i][col] !== word[i]) {
                    return false;
                }
            }
        }
        return true;
    }

    function fillGrid() {
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                if (grid[i][j] === '') {
                    grid[i][j] = String.fromCharCode(97 + Math.floor(Math.random() * 26));
                }
                const cell = puzzleGrid.children[i * gridSize + j];
                cell.textContent = grid[i][j];
            }
        }
    }

    function displayWords() {
        wordList.innerHTML = '';
        for (const word of words) {
            const li = document.createElement('li');
            li.textContent = word;
            wordList.appendChild(li);
        }
    }

    function handleCellClick(e) {
        const cell = e.target;
        if (!cell.classList.contains('grid-cell') || cell.classList.contains('found')) return;

        cell.classList.toggle('selected');
        const rowIndex = parseInt(cell.dataset.row);
        const colIndex = parseInt(cell.dataset.col);

        const selectedIndex = selectedCells.findIndex(c => c.row === rowIndex && c.col === colIndex);

        if (selectedIndex > -1) {
            selectedCells.splice(selectedIndex, 1);
        } else {
            selectedCells.push({ row: rowIndex, col: colIndex, cell });
        }

        checkWord();
    }

    function checkWord() {
        if (selectedCells.length < 2) return;

        let selectedWord = '';
        selectedCells.sort((a, b) => {
            if (a.row !== b.row) {
                return a.row - b.row;
            }
            return a.col - b.col;
        });

        for (const cell of selectedCells) {
            selectedWord += grid[cell.row][cell.col];
        }

        if (words.includes(selectedWord) && !foundWords.includes(selectedWord)) {
            foundWords.push(selectedWord);
            updateScore(selectedWord.length);
            markWordAsFound(selectedWord);
            selectedCells.forEach(c => {
                c.cell.classList.add('found');
                c.cell.classList.remove('selected');
            });
            selectedCells = [];
            if (foundWords.length === words.length) {
                endGame();
            }
        } else if (words.includes(selectedWord.split('').reverse().join('')) && !foundWords.includes(selectedWord.split('').reverse().join(''))) {
            const reversedWord = selectedWord.split('').reverse().join('');
            foundWords.push(reversedWord);
            updateScore(reversedWord.length);
            markWordAsFound(reversedWord);
            selectedCells.forEach(c => {
                c.cell.classList.add('found');
                c.cell.classList.remove('selected');
            });
            selectedCells = [];
            if (foundWords.length === words.length) {
                endGame();
            }
        }
    }

    function updateScore(length) {
        score += length;
        scoreDisplay.textContent = `Score: ${score}`;
    }

    function markWordAsFound(word) {
        const wordItems = wordList.getElementsByTagName('li');
        for (const item of wordItems) {
            if (item.textContent === word) {
                item.classList.add('found');
                break;
            }
        }
    }

    function startTimer() {
        time = 0;
        timer = setInterval(() => {
            time++;
            timerDisplay.textContent = `Time: ${time}s`;
        }, 1000);
    }

    function endGame() {
        clearInterval(timer);
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    }

    function startGame() {
        clearInterval(timer);
        foundWords = [];
        selectedCells = [];
        score = 0;
        updateScore(0);
        initGrid();
        placeWords();
        fillGrid();
        displayWords();
        startTimer();
    }

    startButton.addEventListener('click', startGame);
    puzzleGrid.addEventListener('click', handleCellClick);

    startGame();
});
