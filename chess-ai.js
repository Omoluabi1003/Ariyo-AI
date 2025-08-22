"use strict";
// state variables
let _chess;
let _difficulty = 2;
let _color = "w";
/**
 *
 * @param chess ChessInstance created using new Chess() /chess.js/
 * @param difficulty number usually between 0 and 2 inclusive, higher difficulty will increase computaion time
 */
function initGame(chess, difficulty) {
    _difficulty = difficulty;
    _chess = chess;
}
/**
 *
 * @param chess ChessInstance - not required if initGame is used before using this function
 * @param difficulty number usually between 0 and 2 inclusive, higher difficulty will increase computaion time - not required if initGame is used before using this function
 * @returns
 */
function calculateBestMove(chess, difficulty) {
    if (chess)
        _chess = chess;
    if (difficulty)
        _difficulty = difficulty;
    if (typeof _chess == "undefined" || typeof _difficulty == "undefined")
        throw new Error("Game not initialized!");
    _color = _chess.turn();
    const possibleNextMoves = _chess.moves();
    let bestMove = -999999;
    let bestMoveFound;
    for (let i = 0; i < possibleNextMoves.length; i++) {
        const possibleNextMove = possibleNextMoves[i];
        _chess.move(possibleNextMove);
        const value = MinIMaxAI(_difficulty, -10000, 10000, false);
        _chess.undo();
        if (value >= bestMove) {
            bestMove = value;
            bestMoveFound = possibleNextMove;
        }
    }
    return bestMoveFound;
}
// minimax with alhpha-beta pruning and search depth d = 3 levels
function MinIMaxAI(iteration, alpha, beta, isBestPlayer) {
    if (iteration === 0) {
        const board = _chess.board();
        return -evaluateBoard(board);
    }
    const possibleNextMoves = _chess.moves();
    const nPossibleMoves = possibleNextMoves.length;
    let bestMove;
    if (isBestPlayer) {
        bestMove = -999999;
        for (let i = 0; i < nPossibleMoves; i++) {
            _chess.move(possibleNextMoves[i]);
            bestMove = Math.max(bestMove, MinIMaxAI(iteration - 1, alpha, beta, !isBestPlayer));
            _chess.undo();
            alpha = Math.max(alpha, bestMove);
            if (beta <= alpha) {
                return bestMove;
            }
        }
    }
    else {
        bestMove = 999999;
        for (let i = 0; i < nPossibleMoves; i++) {
            _chess.move(possibleNextMoves[i]);
            bestMove = Math.min(bestMove, MinIMaxAI(iteration - 1, alpha, beta, !isBestPlayer));
            _chess.undo();
            beta = Math.min(beta, bestMove);
            if (beta <= alpha) {
                return bestMove;
            }
        }
    }
    return bestMove;
}
// the evaluation function for minimax
function evaluateBoard(board) {
    let totalEvaluation = 0;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            totalEvaluation += getPieceValue(board[i][j], i, j);
        }
    }
    return totalEvaluation;
}
function reverseArray(array) {
    return array.slice().reverse();
}
const P = [
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
    [1.0, 1.0, 2.0, 3.0, 3.0, 2.0, 1.0, 1.0],
    [0.5, 0.5, 1.0, 2.5, 2.5, 1.0, 0.5, 0.5],
    [0.0, 0.0, 0.0, 2.0, 2.0, 0.0, 0.0, 0.0],
    [0.5, -0.5, -1.0, 0.0, 0.0, -1.0, -0.5, 0.5],
    [0.5, 1.0, 1.0, -2.0, -2.0, 1.0, 1.0, 0.5],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
];
const N = [
    [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
    [-4.0, -2.0, 0.0, 0.0, 0.0, 0.0, -2.0, -4.0],
    [-3.0, 0.0, 1.0, 1.5, 1.5, 1.0, 0.0, -3.0],
    [-3.0, 0.5, 1.5, 2.0, 2.0, 1.5, 0.5, -3.0],
    [-3.0, 0.0, 1.5, 2.0, 2.0, 1.5, 0.0, -3.0],
    [-3.0, 0.5, 1.0, 1.5, 1.5, 1.0, 0.5, -3.0],
    [-4.0, -2.0, 0.0, 0.5, 0.5, 0.0, -2.0, -4.0],
    [-5.0, -4.0, -3.0, -3.0, -3.0, -3.0, -4.0, -5.0],
];
const B = [
    [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
    [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
    [-1.0, 0.0, 0.5, 1.0, 1.0, 0.5, 0.0, -1.0],
    [-1.0, 0.5, 0.5, 1.0, 1.0, 0.5, 0.5, -1.0],
    [-1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, -1.0],
    [-1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0],
    [-1.0, 0.5, 0.0, 0.0, 0.0, 0.0, 0.5, -1.0],
    [-2.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -2.0],
];
const R = [
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [-0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -0.5],
    [0.0, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0],
];
const Q = [
    [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
    [-1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -1.0],
    [-1.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
    [-0.5, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
    [0.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.0, -0.5],
    [-1.0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.0, -1.0],
    [-1.0, 0.0, 0.5, 0.0, 0.0, 0.0, 0.0, -1.0],
    [-2.0, -1.0, -1.0, -0.5, -0.5, -1.0, -1.0, -2.0],
];
const K = [
    [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [-3.0, -4.0, -4.0, -5.0, -5.0, -4.0, -4.0, -3.0],
    [-2.0, -3.0, -3.0, -4.0, -4.0, -3.0, -3.0, -2.0],
    [-1.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -1.0],
    [2.0, 2.0, 0.0, 0.0, 0.0, 0.0, 2.0, 2.0],
    [2.0, 3.0, 1.0, 0.0, 0.0, 1.0, 3.0, 2.0],
];
const MODEL = {
    w: {
        p: {
            w: 10,
            pw: P,
        },
        r: {
            w: 50,
            pw: R,
        },
        n: {
            w: 30,
            pw: N,
        },
        b: {
            w: 30,
            pw: B,
        },
        q: {
            w: 90,
            pw: Q,
        },
        k: {
            w: 900,
            pw: K,
        },
    },
    b: {
        p: {
            w: 10,
            pw: reverseArray(P),
        },
        r: {
            w: 50,
            pw: reverseArray(R),
        },
        n: {
            w: 30,
            pw: N,
        },
        b: {
            w: 30,
            pw: reverseArray(B),
        },
        q: {
            w: 90,
            pw: Q,
        },
        k: {
            w: 900,
            pw: reverseArray(K),
        },
    },
};
function getPieceValue(piece, x, y) {
    if (piece === null) {
        return 0;
    }
    const absoluteValue = getAbsoluteValue(piece, x, y);
    if (piece.color !== _color) {
        return absoluteValue;
    }
    else {
        return -absoluteValue;
    }
}
function getAbsoluteValue(piece, x, y) {
    if (!piece)
        return 0;
    return (MODEL[piece.color][piece.type]["pw"][y][x] +
        MODEL[piece.color][piece.type].w);
}
