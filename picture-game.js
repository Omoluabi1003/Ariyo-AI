document.addEventListener('DOMContentLoaded', () => {
    const puzzleGrid = document.getElementById('puzzle-grid');
    const difficultySelect = document.getElementById('difficulty');
    const puzzleNameSelect = document.getElementById('puzzle-name');
    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');
    const scoreDisplay = document.getElementById('score');
    const timerDisplay = document.getElementById('timer');

    const puzzles = {
        "Basic": [
            { name: "Zobo Drink", image: "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/zobo.jpg" },
            { name: "Naija Jollof", image: "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/jollof.jpg" }
        ],
        "Moderate": [
            { name: "Eyo Festival", image: "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/eyo.jpg" },
            { name: "Aso Oke", image: "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/asooke.jpg" }
        ],
        "Difficult": [
            { name: "Zuma Rock", image: "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/zuma.jpg" },
            { name: "Abuja Mosque", image: "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/abuja-mosque.jpg" }
        ]
    };

    let difficultyFactor = 1;
    let puzzleImage = '';
    let tiles = [];
    let emptyTileIndex = 11;
    let score = 0;
    let timer;
    let time = 0;

    function updatePuzzleNames() {
        const difficulty = difficultySelect.options[difficultySelect.selectedIndex].text;
        puzzleNameSelect.innerHTML = '';
        puzzles[difficulty].forEach(puzzle => {
            const option = document.createElement('option');
            option.value = puzzle.image;
            option.textContent = puzzle.name;
            puzzleNameSelect.appendChild(option);
        });
    }

    function createPuzzle() {
        puzzleGrid.innerHTML = '';
        tiles = [];
        const tileCount = 12;
        const tileNumbers = Array.from({ length: tileCount }, (_, i) => i);

        for (let i = tileNumbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tileNumbers[i], tileNumbers[j]] = [tileNumbers[j], tileNumbers[i]];
        }

        for (let i = 0; i < tileCount; i++) {
            const tile = document.createElement('div');
            tile.classList.add('puzzle-tile');
            tile.dataset.index = tileNumbers[i];
            if (tileNumbers[i] === emptyTileIndex) {
                tile.classList.add('empty-tile');
            } else {
                tile.style.backgroundImage = `url(${puzzleImage})`;
                const x = (tileNumbers[i] % 4) * 100;
                const y = Math.floor(tileNumbers[i] / 4) * 100;
                tile.style.backgroundPosition = `-${x}px -${y}px`;
            }
            tiles.push(tile);
            puzzleGrid.appendChild(tile);
            tile.addEventListener('click', () => moveTile(i));
        }
    }

    function moveTile(clickedIndex) {
        const emptyIndex = tiles.findIndex(tile => tile.classList.contains('empty-tile'));
        const clickedRow = Math.floor(clickedIndex / 4);
        const clickedCol = clickedIndex % 4;
        const emptyRow = Math.floor(emptyIndex / 4);
        const emptyCol = emptyIndex % 4;

        if ((clickedRow === emptyRow && Math.abs(clickedCol - emptyCol) === 1) ||
            (clickedCol === emptyCol && Math.abs(clickedRow - emptyRow) === 1)) {
            const clickedTile = tiles[clickedIndex];
            const emptyTile = tiles[emptyIndex];

            const clickedDataIndex = clickedTile.dataset.index;
            clickedTile.dataset.index = emptyTile.dataset.index;
            emptyTile.dataset.index = clickedDataIndex;

            clickedTile.classList.add('empty-tile');
            emptyTile.classList.remove('empty-tile');
            emptyTile.style.backgroundImage = `url(${puzzleImage})`;
            const x = (clickedDataIndex % 4) * 100;
            const y = Math.floor(clickedDataIndex / 4) * 100;
            emptyTile.style.backgroundPosition = `-${x}px -${y}px`;
            clickedTile.style.backgroundImage = 'none';

            updateScore();
            checkWin();
        }
    }

    function updateScore() {
        let correctTiles = 0;
        tiles.forEach((tile, i) => {
            if (parseInt(tile.dataset.index) === i) {
                correctTiles++;
            }
        });
        score = correctTiles * difficultyFactor;
        scoreDisplay.textContent = `Score: ${score}`;
    }

    function checkWin() {
        let isWin = true;
        tiles.forEach((tile, i) => {
            if (parseInt(tile.dataset.index) !== i) {
                isWin = false;
            }
        });

        if (isWin) {
            clearInterval(timer);
            score += 5 * difficultyFactor;
            scoreDisplay.textContent = `Score: ${score}`;
            alert('You win!');
        }
    }

    function startTimer() {
        time = 0;
        timer = setInterval(() => {
            time++;
            timerDisplay.textContent = `Time: ${time}s`;
        }, 1000);
    }

    difficultySelect.addEventListener('change', () => {
        difficultyFactor = parseInt(difficultySelect.value);
        updatePuzzleNames();
    });

    startButton.addEventListener('click', () => {
        puzzleImage = puzzleNameSelect.value;
        createPuzzle();
        startTimer();
        updateScore();
    });

    stopButton.addEventListener('click', () => {
        clearInterval(timer);
    });

    updatePuzzleNames();
});
