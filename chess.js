document.addEventListener('DOMContentLoaded', () => {
    const game = new Chess();
    const board = Chessboard('board', {
        draggable: true,
        position: 'start',
        pieceTheme: 'https://cdnjs.cloudflare.com/ajax/libs/chessboard.js/1.0.0/img/chesspieces/wikipedia/{piece}.png',
        onDragStart: (source, piece) => {
            if (game.game_over()) return false;
            if (game.turn() === 'w' && piece.startsWith('b')) return false;
            if (game.turn() === 'b' && piece.startsWith('w')) return false;
            return true;
        },
        onDrop: (source, target) => {
            const move = game.move({ from: source, to: target, promotion: 'q' });
            if (move === null) return 'snapback';
            updateStatus();
        },
        onSnapEnd: () => board.position(game.fen())
    });

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
    }

    document.getElementById('resetBtn').addEventListener('click', () => {
        game.reset();
        board.start();
        updateStatus();
    });

    updateStatus();
});
