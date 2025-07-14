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
        "https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Omoluabi%20Radio.png"
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
            tile.draggable = true;
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
            tile.addEventListener('dragstart', handleDragStart);
            tile.addEventListener('dragover', handleDragOver);
            tile.addEventListener('drop', handleDrop);
            tile.addEventListener('dragend', handleDragEnd);
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

        if (tile1.classList.contains('empty-tile')) {
            tile1.classList.remove('empty-tile');
            tile2.classList.add('empty-tile');
            tile1.style.backgroundImage = `url(${puzzleImage})`;
            const x = (dataIndex1 % 4) * 100;
            const y = Math.floor(dataIndex1 / 4) * 100;
            tile1.style.backgroundPosition = `-${x}px -${y}px`;
            tile2.style.backgroundImage = 'none';
        } else {
            tile2.classList.remove('empty-tile');
            tile1.classList.add('empty-tile');
            tile2.style.backgroundImage = `url(${puzzleImage})`;
            const x = (tile2.dataset.index % 4) * 100;
            const y = Math.floor(tile2.dataset.index / 4) * 100;
            tile2.style.backgroundPosition = `-${x}px -${y}px`;
            tile1.style.backgroundImage = 'none';
        }

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

    difficultySelect.addEventListener('change', () => {
        difficultyFactor = parseInt(difficultySelect.value);
    });

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

    puzzleImage = puzzles[Math.floor(Math.random() * puzzles.length)];
    showOriginalImage();
});
