document.addEventListener('DOMContentLoaded', () => {
    const puzzleGrid = document.getElementById('puzzle-grid');
    const difficultySelect = document.getElementById('difficulty');
    const puzzleNameSelect = document.getElementById('puzzle-name');
    const startButton = document.getElementById('start-button');
    const stopButton = document.getElementById('stop-button');
    const scoreDisplay = document.getElementById('score');
    const timerDisplay = document.getElementById('timer');

    const puzzles = [
        "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Abuja%20City%20Gate.png",
        "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Abula.png",
        "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Lagos%20traffic.png",
        "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Nigeria%20Pix.png",
        "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Omoluabi%20Himself.png",
        "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Omoluabi%20Radio.png",
        "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Egusi%20%26%20Fufu.png",
        "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Abula.png"
    ];

    let difficultyFactor = 1;
    let puzzleImage = '';
    let tiles = [];
    let emptyTileIndex = 11;
    let score = 0;
    let timer;
    let time = 0;
    let draggedTile = null;

    function showOriginalImage() {
        puzzleGrid.innerHTML = '';
        const img = document.createElement('img');
        img.src = puzzleImage;
        img.style.width = '400px';
        img.style.height = '300px';
        puzzleGrid.appendChild(img);
    }

    function scramblePuzzle() {
        puzzleGrid.innerHTML = '';
        tiles = [];
        const gridSize = Math.sqrt(tileCount);
        const tileWidth = 400 / gridSize;
        const tileHeight = 300 / gridSize;
        puzzleGrid.style.gridTemplateColumns = `repeat(${gridSize}, ${tileWidth}px)`;
        puzzleGrid.style.gridTemplateRows = `repeat(${gridSize}, ${tileHeight}px)`;
        puzzleGrid.style.width = '400px';
        puzzleGrid.style.height = '300px';

        let tileNumbers = Array.from({ length: tileCount - 1 }, (_, i) => i);

        // Fisher-Yates shuffle
        for (let i = tileNumbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tileNumbers[i], tileNumbers[j]] = [tileNumbers[j], tileNumbers[i]];
        }

        // Check for solvability
        let inversions = 0;
        for (let i = 0; i < tileNumbers.length; i++) {
            for (let j = i + 1; j < tileNumbers.length; j++) {
                if (tileNumbers[i] > tileNumbers[j]) {
                    inversions++;
                }
            }
        }

        if (inversions % 2 !== 0) {
            // Swap two elements to make inversions even
            [tileNumbers[0], tileNumbers[1]] = [tileNumbers[1], tileNumbers[0]];
        }

        tileNumbers.push(tileCount - 1); // Add the empty tile at the end

        for (let i = 0; i < tileCount; i++) {
            const tile = document.createElement('div');
            tile.classList.add('puzzle-tile');
            tile.style.width = `${tileWidth}px`;
            tile.style.height = `${tileHeight}px`;
            tile.dataset.index = tileNumbers[i];
            tile.draggable = true;
            if (tileNumbers[i] === emptyTileIndex) {
                tile.classList.add('empty-tile');
            } else {
                tile.style.backgroundImage = `url(${puzzleImage})`;
                tile.style.backgroundSize = `400px 300px`;
                const x = (tileNumbers[i] % gridSize) * tileWidth;
                const y = Math.floor(tileNumbers[i] / gridSize) * tileHeight;
                tile.style.backgroundPosition = `-${x}px -${y}px`;
            }
            tiles.push(tile);
            puzzleGrid.appendChild(tile);
            tile.addEventListener('click', () => moveTile(i));
            tile.addEventListener('dragstart', handleDragStart);
            tile.addEventListener('dragover', handleDragOver);
            tile.addEventListener('drop', handleDrop);
            tile.addEventListener('dragend', handleDragEnd);
        }
    }

    function moveTile(clickedIndex) {
        const emptyIndex = tiles.findIndex(tile => tile.classList.contains('empty-tile'));
        const gridSize = Math.sqrt(tileCount);
        const clickedRow = Math.floor(clickedIndex / gridSize);
        const clickedCol = clickedIndex % gridSize;
        const emptyRow = Math.floor(emptyIndex / gridSize);
        const emptyCol = emptyIndex % gridSize;

        if ((clickedRow === emptyRow && Math.abs(clickedCol - emptyCol) === 1) ||
            (clickedCol === emptyCol && Math.abs(clickedRow - emptyRow) === 1)) {
            swapTiles(clickedIndex, emptyIndex);
        }
    }

    function handleDragStart(e) {
        draggedTile = this;
    }

    function handleDragOver(e) {
        e.preventDefault();
    }

    function handleDrop(e) {
        e.preventDefault();
        const targetTile = this;
        if (targetTile.classList.contains('empty-tile')) {
            const draggedIndex = Array.from(tiles).indexOf(draggedTile);
            const targetIndex = Array.from(tiles).indexOf(targetTile);
            swapTiles(draggedIndex, targetIndex);
        }
    }

    function handleDragEnd() {
        draggedTile = null;
    }

    function swapTiles(index1, index2) {
        const tile1 = tiles[index1];
        const tile2 = tiles[index2];

        const dataIndex1 = tile1.dataset.index;
        tile1.dataset.index = tile2.dataset.index;
        tile2.dataset.index = dataIndex1;

        const gridSize = Math.sqrt(tileCount);
        const tileWidth = 400 / gridSize;
        const tileHeight = 300 / gridSize;

        const emptyTile = document.querySelector('.empty-tile');
        const nonEmptyTile = tile1 === emptyTile ? tile2 : tile1;

        emptyTile.classList.remove('empty-tile');
        nonEmptyTile.classList.add('empty-tile');

        emptyTile.style.backgroundImage = `url(${puzzleImage})`;
        const x = (emptyTile.dataset.index % gridSize) * tileWidth;
        const y = Math.floor(emptyTile.dataset.index / gridSize) * tileHeight;
        emptyTile.style.backgroundPosition = `-${x}px -${y}px`;
        nonEmptyTile.style.backgroundImage = 'none';

        updateScore();
        checkWin();
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
            const winMessage = document.createElement('div');
            winMessage.id = 'win-message';
            winMessage.textContent = 'You Win!';
            const playAgainButton = document.createElement('button');
            playAgainButton.textContent = 'Play Again';
            playAgainButton.addEventListener('click', () => {
                location.reload();
            });
            winMessage.appendChild(playAgainButton);
            document.getElementById('game-container').appendChild(winMessage);
        }
    }

    function startTimer() {
        time = 0;
        timer = setInterval(() => {
            time++;
            timerDisplay.textContent = `Time: ${time}s`;
        }, 1000);
    }

    let tileCount;

    function setDifficulty() {
        difficultyFactor = parseInt(difficultySelect.value);
        if (difficultyFactor === 1) {
            tileCount = 9;
        } else if (difficultyFactor === 2) {
            tileCount = 16;
        } else {
            tileCount = 25;
        }
        emptyTileIndex = tileCount - 1;
    }

    difficultySelect.addEventListener('change', setDifficulty);
    setDifficulty();

    startButton.addEventListener('click', () => {
        scramblePuzzle();
        startTimer();
        updateScore();
        startButton.disabled = true;
    });

    stopButton.addEventListener('click', () => {
        clearInterval(timer);
        showOriginalImage();
    });

    puzzles.forEach(puzzle => {
        const option = document.createElement('option');
        const puzzleName = puzzle.split('/').pop().split('.')[0].replace(/%20/g, ' ');
        option.value = puzzle;
        option.textContent = puzzleName;
        puzzleNameSelect.appendChild(option);
    });

    puzzleNameSelect.addEventListener('change', () => {
        puzzleImage = puzzleNameSelect.value;
        showOriginalImage();
    });

    puzzleImage = puzzles[0];
    puzzleNameSelect.value = puzzleImage;
    showOriginalImage();
});
