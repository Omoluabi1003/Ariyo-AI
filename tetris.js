const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
nextContext.scale(20, 20);

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    switch (type) {
        case 'I': return [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ];
        case 'J': return [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0],
        ];
        case 'L': return [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0],
        ];
        case 'O': return [
            [1, 1],
            [1, 1],
        ];
        case 'S': return [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0],
        ];
        case 'T': return [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0],
        ];
        case 'Z': return [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0],
        ];
    }
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function arenaSweep() {
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        player.score += 10;
    }
}

function drawMatrix(matrix, offset, ctx = context) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = colors[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function drawNext() {
    nextContext.fillStyle = '#000';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    const previewSize = nextCanvas.width / 20;
    const offset = {
        x: (previewSize - nextPiece[0].length) / 2,
        y: (previewSize - nextPiece.length) / 2,
    };
    drawMatrix(nextPiece, offset, nextContext);
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(arena, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos);
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function hardDrop() {
    while (true) {
        player.pos.y++;
        if (collide(arena, player)) {
            player.pos.y--;
            merge(arena, player);
            playerReset();
            arenaSweep();
            updateScore();
            dropCounter = 0;
            break;
        }
    }
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerReset() {
    player.matrix = nextPiece;
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    nextPiece = createPiece(pieces[(pieces.length * Math.random()) | 0]);
    drawNext();
    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        player.score = 0;
        updateScore();
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    draw();
    requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById('score').innerText = `Score: ${player.score}`;
}

document.addEventListener('keydown', event => {
    const { key, code } = event;
    if (key.startsWith('Arrow') || code === 'Space') {
        event.preventDefault();
    }
    if (key === 'ArrowLeft') {
        playerMove(-1);
    } else if (key === 'ArrowRight') {
        playerMove(1);
    } else if (key === 'ArrowDown') {
        playerDrop();
    } else if (key === 'ArrowUp') {
        playerRotate(1);
    } else if (code === 'Space') {
        hardDrop();
    }
});

[
    ['btn-left', () => playerMove(-1)],
    ['btn-right', () => playerMove(1)],
    ['btn-down', playerDrop],
    ['btn-rotate', () => playerRotate(1)],
    ['btn-drop', hardDrop],
].forEach(([id, fn]) => {
    const btn = document.getElementById(id);
    ['click', 'touchstart'].forEach(evt => {
        btn.addEventListener(evt, e => {
            e.preventDefault();
            fn();
        });
    });
});

const colors = [
    null,
    '#00f0f0',
    '#0000f0',
    '#f0a000',
    '#f0f000',
    '#00f000',
    '#a000f0',
    '#f00000'
];

const pieces = 'TJLOSZI';

const arena = createMatrix(10, 20);
const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0
};

let nextPiece = createPiece(pieces[(pieces.length * Math.random()) | 0]);

playerReset();
updateScore();
update();
