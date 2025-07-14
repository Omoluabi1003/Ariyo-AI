document.addEventListener('DOMContentLoaded', () => {
    const puzzleGrid = document.getElementById('puzzle-grid');
    const difficultySelect = document.getElementById('difficulty');
    const puzzleNameSelect = document.getElementById('puzzle-name');
    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');
    const scoreDisplay = document.getElementById('score');
    const timerDisplay = document.getElementById('timer');

    const puzzles = [
        "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Abuja%20City%20Gate.jfif",
        "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Abula.jfif",
        "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Egusi%20%26%20Fufu.jfif",
        "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Lagos%20traffic.jfif",
        "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Maize.jfif",
        "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Nigeria%20pix.jfif"
    ];

    let difficultyFactor = 1;
    let puzzleImage = '';
    let tiles = [];
    let emptyTileIndex = 11;
    let score = 0;
    let timer;
    let time = 0;

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
    });

    startButton.addEventListener('click', () => {
        puzzleImage = puzzles[Math.floor(Math.random() * puzzles.length)];
        createPuzzle();
        startTimer();
        updateScore();
    });

    stopButton.addEventListener('click', () => {
        clearInterval(timer);
    });
});
