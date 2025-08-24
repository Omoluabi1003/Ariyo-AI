document.addEventListener('DOMContentLoaded', () => {
  const game = new Chess();
  const board = Chessboard('board', {
    draggable: true,
    position: 'start',
    onDragStart: function (source, piece) {
      if (game.game_over() ||
          (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
          (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
        return false;
      }
    },
    onDrop: function (source, target) {
      const move = game.move({ from: source, to: target, promotion: 'q' });
      if (move === null) return 'snapback';
    },
    onSnapEnd: function () {
      board.position(game.fen());
    }
  });
});
