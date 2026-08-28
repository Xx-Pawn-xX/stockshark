import { Chess } from
  "https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm";


const VALUE = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};


const PST = {

  p: [
    [0,0,0,0,0,0,0,0],
    [5,10,10,-20,-20,10,10,5],
    [5,-5,-10,0,0,-10,-5,5],
    [0,0,0,20,20,0,0,0],
    [5,5,10,25,25,10,5,5],
    [10,10,20,30,30,20,10,10],
    [50,50,50,50,50,50,50,50],
    [0,0,0,0,0,0,0,0]
  ],

  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,0,5,5,0,-20,-40],
    [-30,5,10,15,15,10,5,-30],
    [-30,0,15,20,20,15,0,-30],
    [-30,5,15,20,20,15,5,-30],
    [-30,0,10,15,15,10,0,-30],
    [-40,-20,0,0,0,0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],

  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,5,0,0,0,0,5,-10],
    [-10,10,10,10,10,10,10,-10],
    [-10,0,10,10,10,10,0,-10],
    [-10,5,5,10,10,5,5,-10],
    [-10,0,5,10,10,5,0,-10],
    [-10,0,0,0,0,0,0,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],

  r: [
    [0,0,0,5,5,0,0,0],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [5,10,10,10,10,10,10,5],
    [0,0,0,0,0,0,0,0]
  ],

  q: [
    [-20,-10,-10,-5,-5,-10,-10,-20],
    [-10,0,5,0,0,0,0,-10],
    [-10,5,5,5,5,5,0,-10],
    [0,0,5,5,5,5,0,-5],
    [-5,0,5,5,5,5,0,-5],
    [-10,0,5,5,5,5,0,-10],
    [-10,0,0,0,0,0,0,-10],
    [-20,-10,-10,-5,-5,-10,-10,-20]
  ],

  k: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20,20,0,0,0,0,20,20],
    [20,30,10,0,0,10,30,20]
  ]

};


const MATE = 100000;
const INF = 999999;


export class Stockshark {

  constructor() {

    this.nodes = 0;

    this.table = new Map();

    this.killers = {};

  }


  evaluate(chess) {

    if (chess.isCheckmate()) {
      return -MATE;
    }

    if (chess.isDraw()) {
      return 0;
    }


    let score = 0;

    const board = chess.board();


    for (let row = 0; row < 8; row++) {

      for (let col = 0; col < 8; col++) {

        const piece = board[row][col];

        if (!piece) continue;


        let value =
          VALUE[piece.type];


        const pst =
          PST[piece.type];


        if (pst) {

          const pstRow =
            piece.color === "w"
              ? 7 - row
              : row;


          value +=
            pst[pstRow][col];

        }


        score +=
          piece.color === "w"
            ? value
            : -value;

      }

    }


    return chess.turn() === "w"
      ? score
      : -score;

  }


  moveScore(move, ply) {

    let score = 0;


    if (move.captured) {

      score +=
        10000 +
        VALUE[move.captured] * 10 -
        VALUE[move.piece];

    }


    if (move.promotion) {

      score +=
        VALUE[move.promotion] +
        8000;

    }


    const killer =
      this.killers[ply];


    if (
      killer &&
      killer === move.lan
    ) {
      score += 9000;
    }


    return score;

  }


  orderedMoves(chess, ply) {

    return chess
      .moves({ verbose: true })
      .sort(
        (a, b) =>
          this.moveScore(b, ply) -
          this.moveScore(a, ply)
      );

  }


  quiescence(
    chess,
    alpha,
    beta,
    ply
  ) {

    this.nodes++;


    let stand =
      this.evaluate(chess);


    if (stand >= beta) {
      return beta;
    }


    if (stand > alpha) {
      alpha = stand;
    }


    const moves =
      chess
        .moves({ verbose: true })
        .filter(
          move =>
            move.captured ||
            move.promotion
        )
        .sort(
          (a, b) =>
            this.moveScore(b, ply) -
            this.moveScore(a, ply)
        );


    for (const move of moves) {

      chess.move(move);


      const score =
        -this.quiescence(
          chess,
          -beta,
          -alpha,
          ply + 1
        );


      chess.undo();


      if (score >= beta) {
        return beta;
      }


      if (score > alpha) {
        alpha = score;
      }

    }


    return alpha;

  }


  search(
    chess,
    depth,
    alpha,
    beta,
    ply
  ) {

    this.nodes++;


    if (depth <= 0) {

      return {
        score:
          this.quiescence(
            chess,
            alpha,
            beta,
            ply
          ),

        line: []
      };

    }


    if (chess.isGameOver()) {

      return {
        score:
          this.evaluate(chess),

        line: []
      };

    }


    const key =
      chess.fen()
        .split(" ")
        .slice(0, 4)
        .join(" ");


    const cached =
      this.table.get(key);


    if (
      cached &&
      cached.depth >= depth
    ) {

      return {
        score: cached.score,
        line: cached.line
      };

    }


    let bestScore = -INF;

    let bestLine = [];

    let bestMove = null;


    const moves =
      this.orderedMoves(
        chess,
        ply
      );


    for (const move of moves) {

      chess.move(move);


      const result =
        this.search(
          chess,
          depth - 1,
          -beta,
          -alpha,
          ply + 1
        );


      const score =
        -result.score;


      chess.undo();


      if (score > bestScore) {

        bestScore =
          score;

        bestMove =
          move;


        bestLine = [
          move.san,
          ...result.line
        ];

      }


      alpha =
        Math.max(
          alpha,
          score
        );


      if (alpha >= beta) {

        if (
          !move.captured
        ) {

          this.killers[ply] =
            move.lan;

        }

        break;

      }

    }


    const result = {
      score: bestScore,
      line: bestLine,
      bestMove
    };


    this.table.set(
      key,
      {
        depth,
        score: bestScore,
        line: bestLine
      }
    );


    return result;

  }


  async analyze(
    fen,
    maxDepth,
    onDepth
  ) {

    this.nodes = 0;

    this.table.clear();

    this.killers = {};


    let best = null;


    for (
      let depth = 1;
      depth <= maxDepth;
      depth++
    ) {

      await new Promise(
        resolve =>
          setTimeout(resolve, 0)
      );


      const chess =
        new Chess(fen);


      const before =
        this.nodes;


      const result =
        this.search(
          chess,
          depth,
          -INF,
          INF,
          0
        );


      const used =
        this.nodes - before;


      best = {
        ...result,
        depth,
        nodes: this.nodes,
        depthNodes: used
      };


      if (onDepth) {
        onDepth(best);
      }

    }


    return best;

  }

}
