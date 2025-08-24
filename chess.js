document.addEventListener('DOMContentLoaded', () => {
  const game = new Chess();
  let board = null;

  function onDragStart(source, piece) {
    if (game.game_over() ||
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
      return false;
    }
  }

  function onDrop(source, target) {
    const move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';
  }

  function onSnapEnd() {
    board.position(game.fen());
  }

  const config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
  };

  board = Chessboard('board', config);
});
