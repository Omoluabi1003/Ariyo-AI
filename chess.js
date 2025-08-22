document.addEventListener('DOMContentLoaded', () => {
    const game = new Chess();
    const board = Chessboard('board', {
        draggable: true,
        position: 'start',
        pieceTheme: 'img/chesspieces/{piece}.png',
        onDragStart: (source, piece) => {
            if (game.game_over()) return false;
            if (game.turn() === 'w' && piece.startsWith('b')) return false;
            if (game.turn() === 'b' && piece.startsWith('w')) return false;
            return true;
        },
        onDrop: (source, target) => {
            removeHighlights('last-move');
            const move = game.move({ from: source, to: target, promotion: 'q' });
            if (move === null) return 'snapback';
            highlightSquare(source, 'last-move');
            highlightSquare(target, 'last-move');
            updateStatus();
        },
        onSnapEnd: () => board.position(game.fen()),
        onMouseoverSquare: (square, piece) => {
            const moves = game.moves({ square, verbose: true });
            if (moves.length === 0) return;
            highlightSquare(square, 'highlight-move');
            moves.forEach(m => highlightSquare(m.to, 'highlight-move'));
        },
        onMouseoutSquare: () => removeHighlights('highlight-move')
    });

    const boardEl = document.getElementById('board');

    function highlightSquare(square, className) {
        const squareEl = boardEl.querySelector(`.square-${square}`);
        if (squareEl) squareEl.classList.add(className);
    }

    function removeHighlights(className) {
        boardEl.querySelectorAll(`.${className}`).forEach(el => el.classList.remove(className));
    }

    function updateStatus() {
        let status = '';
        const moveColor = game.turn() === 'b' ? 'Black' : 'White';
        if (game.in_checkmate()) {
            status = `Game over, ${moveColor} is in checkmate.`;
        } else if (game.in_draw()) {
            status = 'Game over, drawn position';
        } else {
            status = `${moveColor} to move`;
            if (game.in_check()) {
                status += `, ${moveColor} is in check`;
            }
        }
        document.getElementById('status').textContent = status;
        document.getElementById('history').textContent = game.pgn();
    }

    document.getElementById('resetBtn').addEventListener('click', () => {
        game.reset();
        board.start();
        removeHighlights('last-move');
        updateStatus();
    });

    document.getElementById('undoBtn').addEventListener('click', () => {
        game.undo();
        board.position(game.fen());
        removeHighlights('last-move');
        updateStatus();
    });

    document.getElementById('pgnBtn').addEventListener('click', () => {
        const blob = new Blob([game.pgn()], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'game.pgn';
        a.click();
        URL.revokeObjectURL(url);
    });

    updateStatus();
});
