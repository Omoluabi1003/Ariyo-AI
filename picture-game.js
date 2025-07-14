document.addEventListener('DOMContentLoaded', () => {
    const puzzleGrid = document.getElementById('puzzle-grid');
    const difficultySelect = document.getElementById('difficulty');
    const startButton = document.getElementById('start-button');

    let gridSize = 3;
    let puzzleImage = 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI.jpg';
    let draggedTile = null;

    function createPuzzle() {
        puzzleGrid.innerHTML = '';
        puzzleGrid.style.gridTemplateColumns = `repeat(${gridSize}, 100px)`;

        const tileCount = gridSize * gridSize;
        const tileNumbers = Array.from({ length: tileCount }, (_, i) => i);

        // Shuffle the tile numbers
        for (let i = tileNumbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tileNumbers[i], tileNumbers[j]] = [tileNumbers[j], tileNumbers[i]];
        }

        for (let i = 0; i < tileCount; i++) {
            const tile = document.createElement('div');
            tile.classList.add('puzzle-tile');
            tile.dataset.index = tileNumbers[i];
            tile.style.backgroundImage = `url(${puzzleImage})`;
            tile.style.backgroundPosition = `-${(tileNumbers[i] % gridSize) * 100}px -${Math.floor(tileNumbers[i] / gridSize) * 100}px`;
            tile.draggable = true;
            puzzleGrid.appendChild(tile);
        }

        addDragAndDropListeners();
    }

    function addDragAndDropListeners() {
        const tiles = document.querySelectorAll('.puzzle-tile');
        tiles.forEach(tile => {
            tile.addEventListener('dragstart', handleDragStart);
            tile.addEventListener('dragover', handleDragOver);
            tile.addEventListener('drop', handleDrop);
            tile.addEventListener('dragend', handleDragEnd);
        });
    }

    function handleDragStart(e) {
        draggedTile = this;
        setTimeout(() => {
            this.style.opacity = '0.5';
        }, 0);
    }

    function handleDragOver(e) {
        e.preventDefault();
    }

    function handleDrop(e) {
        e.preventDefault();
        if (draggedTile !== this) {
            const draggedIndex = draggedTile.dataset.index;
            const targetIndex = this.dataset.index;

            draggedTile.dataset.index = targetIndex;
            this.dataset.index = draggedIndex;

            draggedTile.style.backgroundPosition = `-${(targetIndex % gridSize) * 100}px -${Math.floor(targetIndex / gridSize) * 100}px`;
            this.style.backgroundPosition = `-${(draggedIndex % gridSize) * 100}px -${Math.floor(draggedIndex / gridSize) * 100}px`;
        }
    }

    function handleDragEnd() {
        this.style.opacity = '1';
        checkWin();
    }

    function checkWin() {
        const tiles = document.querySelectorAll('.puzzle-tile');
        let isWin = true;
        tiles.forEach((tile, i) => {
            if (parseInt(tile.dataset.index) !== i) {
                isWin = false;
            }
        });

        if (isWin) {
            alert('You win!');
        }
    }

    startButton.addEventListener('click', () => {
        gridSize = parseInt(difficultySelect.value);
        createPuzzle();
    });

    createPuzzle();
});
