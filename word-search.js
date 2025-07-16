document.addEventListener('DOMContentLoaded', () => {
    const puzzleGrid = document.getElementById('puzzle-grid');
    const wordList = document.getElementById('word-list');
    const startButton = document.getElementById('start-button');
    const timerDisplay = document.getElementById('timer');
    const scoreDisplay = document.getElementById('score');
    const categorySelect = document.createElement('select');
    const categories = {
        technology: ['html', 'css', 'javascript', 'python', 'java', 'ruby', 'php', 'swift', 'kotlin', 'csharp'],
        medical: ['anatomy', 'biopsy', 'cancer', 'dementia', 'embolism', 'fibrosis', 'gastro', 'hospice', 'influenza', 'jaundice'],
        science: ['astronomy', 'biology', 'chemistry', 'dynamics', 'ecology', 'fusion', 'geology', 'hydrology', 'isotopes', 'joule']
    };

    let words = [];
    const gridSize = 10;
    let grid = [];
    let selectedCells = [];
    let foundWords = [];
    let score = 0;
    let timer;
    let time = 0;
    let isDragging = false;

    function setupCategorySelector() {
        for (const category in categories) {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            categorySelect.appendChild(option);
        }
        document.getElementById('game-controls').insertBefore(categorySelect, startButton);
        categorySelect.addEventListener('change', () => {
            words = categories[categorySelect.value];
            startGame();
        });
        words = categories[categorySelect.value];
    }

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
                const direction = Math.floor(Math.random() * 3); // 0: horizontal, 1: vertical, 2: diagonal
                const row = Math.floor(Math.random() * gridSize);
                const col = Math.floor(Math.random() * gridSize);

                if (canPlaceWord(word, row, col, direction)) {
                    for (let i = 0; i < word.length; i++) {
                        if (direction === 0) {
                            grid[row][col + i] = word[i];
                        } else if (direction === 1) {
                            grid[row + i][col] = word[i];
                        } else {
                            grid[row + i][col + i] = word[i];
                        }
                    }
                    placed = true;
                }
            }
        }
    }

    function canPlaceWord(word, row, col, direction) {
        if (direction === 0) {
            if (col + word.length > gridSize) return false;
            for (let i = 0; i < word.length; i++) {
                if (grid[row][col + i] !== '' && grid[row][col + i] !== word[i]) return false;
            }
        } else if (direction === 1) {
            if (row + word.length > gridSize) return false;
            for (let i = 0; i < word.length; i++) {
                if (grid[row + i][col] !== '' && grid[row + i][col] !== word[i]) return false;
            }
        } else {
            if (row + word.length > gridSize || col + word.length > gridSize) return false;
            for (let i = 0; i < word.length; i++) {
                if (grid[row + i][col + i] !== '' && grid[row + i][col + i] !== word[i]) return false;
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

    function handleMouseDown(e) {
        if (e.target.classList.contains('grid-cell')) {
            isDragging = true;
            selectedCells = [e.target];
            e.target.classList.add('selected');
        }
    }

    function handleMouseMove(e) {
        if (isDragging && e.target.classList.contains('grid-cell')) {
            const currentCell = e.target;
            if (!selectedCells.includes(currentCell)) {
                selectedCells.push(currentCell);
                currentCell.classList.add('selected');
            }
        }
    }

    function handleMouseUp() {
        if (isDragging) {
            isDragging = false;
            checkWord();
            selectedCells.forEach(cell => cell.classList.remove('selected'));
            selectedCells = [];
        }
    }

    function checkWord() {
        let selectedWord = '';
        for (const cell of selectedCells) {
            selectedWord += cell.textContent;
        }

        if (words.includes(selectedWord) && !foundWords.includes(selectedWord)) {
            foundWords.push(selectedWord);
            updateScore(selectedWord.length);
            markWordAsFound(selectedWord);
            selectedCells.forEach(cell => cell.classList.add('found'));
            if (foundWords.length === words.length) {
                endGame();
            }
        } else if (words.includes(selectedWord.split('').reverse().join('')) && !foundWords.includes(selectedWord.split('').reverse().join(''))) {
            const reversedWord = selectedWord.split('').reverse().join('');
            foundWords.push(reversedWord);
            updateScore(reversedWord.length);
            markWordAsFound(reversedWord);
            selectedCells.forEach(cell => cell.classList.add('found'));
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
    puzzleGrid.addEventListener('mousedown', handleMouseDown);
    puzzleGrid.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    setupCategorySelector();
    startGame();
});
