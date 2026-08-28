import { Chess } from
  "https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm";

import { Stockshark } from
  "./engine.js";


const chess =
  new Chess();

const engine =
  new Stockshark();


const PIECES = {

  wp: "♙",
  wn: "♘",
  wb: "♗",
  wr: "♖",
  wq: "♕",
  wk: "♔",

  bp: "♟",
  bn: "♞",
  bb: "♝",
  br: "♜",
  bq: "♛",
  bk: "♚"

};


const board =
  document.getElementById("board");

const bestMove =
  document.getElementById("bestMove");

const evaluation =
  document.getElementById("evaluation");

const evalFill =
  document.getElementById("evalFill");

const evalText =
  document.getElementById("evalText");

const depthDisplay =
  document.getElementById("depthDisplay");

const nodesDisplay =
  document.getElementById("nodesDisplay");

const pv =
  document.getElementById("pv");

const history =
  document.getElementById("history");

const status =
  document.getElementById("status");

const moveInput =
  document.getElementById("moveInput");

const depthSelect =
  document.getElementById("depth");


let selectedSquare = null;

let legalTargets = [];

let lastMove = null;

let analyzing = false;


/* =========================
   BOARD
========================= */

function renderBoard() {

  board.innerHTML = "";


  const position =
    chess.board();


  for (
    let row = 0;
    row < 8;
    row++
  ) {

    for (
      let col = 0;
      col < 8;
      col++
    ) {

      const square =
        document.createElement("div");


      const file =
        String.fromCharCode(
          97 + col
        );


      const rank =
        8 - row;


      const name =
        file + rank;


      square.className =
        "square " +
        (
          (row + col) % 2 === 0
            ? "light"
            : "dark"
        );


      square.dataset.square =
        name;


      if (
        selectedSquare === name
      ) {

        square.classList.add(
          "selected"
        );

      }


      if (
        legalTargets.includes(name)
      ) {

        square.classList.add(
          "legal"
        );

      }


      if (
        lastMove &&
        (
          lastMove.from === name ||
          lastMove.to === name
        )
      ) {

        square.classList.add(
          "last"
        );

      }


      const piece =
        position[row][col];


      if (piece) {

        const pieceElement =
          document.createElement("span");


        pieceElement.className =
          "piece";


        pieceElement.textContent =
          PIECES[
            piece.color +
            piece.type
          ];


        square.appendChild(
          pieceElement
        );

      }


      square.addEventListener(
        "click",
        () =>
          handleSquare(name)
      );


      board.appendChild(square);

    }

  }

}


function handleSquare(square) {

  if (analyzing) return;


  const piece =
    chess.get(square);


  /*
    Second click:
    try to move
  */

  if (
    selectedSquare &&
    legalTargets.includes(square)
  ) {

    try {

      const move =
        chess.move({
          from: selectedSquare,
          to: square,
          promotion: "q"
        });


      if (move) {

        lastMove = move;

      }

    }
    catch (error) {}


    selectedSquare = null;

    legalTargets = [];


    renderAll();

    return;

  }


  /*
    Select own piece
  */

  if (
    piece &&
    piece.color === chess.turn()
  ) {

    selectedSquare =
      square;


    const moves =
      chess.moves({
        square,
        verbose: true
      });


    legalTargets =
      moves.map(
        move => move.to
      );


  }
  else {

    selectedSquare = null;

    legalTargets = [];

  }


  renderBoard();

}


/* =========================
   HISTORY
========================= */

function renderHistory() {

  const moves =
    chess.history();


  let html = "";


  for (
    let i = 0;
    i < moves.length;
    i += 2
  ) {

    html +=
      `<div>
        <strong>${Math.floor(i / 2) + 1}.</strong>
        ${moves[i] || ""}
        ${moves[i + 1] || ""}
      </div>`;

  }


  history.innerHTML =
    html ||
    "No moves yet.";

}


/* =========================
   SCORE
========================= */

function formatScore(score) {

  if (
    Math.abs(score) > 90000
  ) {

    const mate =
      score > 0
        ? "M"
        : "-M";


    return mate;

  }


  return (
    score / 100
  ).toFixed(2);

}


function updateEvaluation(score) {

  /*
    Engine score is from
    side-to-move perspective.

    Convert to white perspective
    for the evaluation bar.
  */

  const whiteScore =
    chess.turn() === "w"
      ? score
      : -score;


  const display =
    formatScore(whiteScore);


  evaluation.textContent =
    display;


  evalText.textContent =
    display;


  let percentage =
    50 +
    whiteScore / 30;


  percentage =
    Math.max(
      3,
      Math.min(
        97,
        percentage
      )
    );


  evalFill.style.height =
    percentage + "%";

}


/* =========================
   RENDER EVERYTHING
========================= */

function renderAll() {

  renderBoard();

  renderHistory();

}


/* =========================
   PLAY TEXT MOVE
========================= */

function playTextMove() {

  if (analyzing) return;


  const text =
    moveInput.value
      .trim()
      .toLowerCase()
      .replace("-", "");


  if (
    text.length < 4
  ) {

    status.textContent =
      "Invalid move";

    return;

  }


  const from =
    text.slice(0, 2);

  const to =
    text.slice(2, 4);

  const promotion =
    text[4] || "q";


  try {

    const move =
      chess.move({
        from,
        to,
        promotion
      });


    if (!move) {

      throw new Error();

    }


    lastMove = move;


    moveInput.value = "";

    status.textContent =
      "Move played";


    renderAll();

  }
  catch (error) {

    status.textContent =
      "Illegal move";

  }

}


/* =========================
   ANALYZE
========================= */

async function analyze() {

  if (analyzing) return;


  if (
    chess.isGameOver()
  ) {

    status.textContent =
      "Game over";

    return;

  }


  analyzing = true;


  const maxDepth =
    Number(
      depthSelect.value
    );


  status.textContent =
    "🦈 Stockshark thinking...";


  bestMove.textContent =
    "...";


  pv.textContent =
    "Searching...";


  const fen =
    chess.fen();


  const result =
    await engine.analyze(
      fen,
      maxDepth,

      current => {

        bestMove.textContent =
          current.bestMove
            ? current.bestMove.san
            : "—";


        depthDisplay.textContent =
          current.depth;


        nodesDisplay.textContent =
          current.nodes.toLocaleString();


        pv.textContent =
          current.line.join(" ");


        updateEvaluation(
          current.score
        );

      }
    );


  if (
    chess.fen() !== fen
  ) {

    analyzing = false;

    return;

  }


  status.textContent =
    "Analysis complete";


  bestMove.textContent =
    result.bestMove
      ? result.bestMove.san
      : "—";


  analyzing = false;

}


/* =========================
   BUTTONS
========================= */

document
  .getElementById("moveButton")
  .addEventListener(
    "click",
    playTextMove
  );


moveInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter"
    ) {

      playTextMove();

    }

  }
);


document
  .getElementById("analyzeButton")
  .addEventListener(
    "click",
    analyze
  );


document
  .getElementById("undoButton")
  .addEventListener(
    "click",
    () => {

      if (analyzing) return;


      const move =
        chess.undo();


      if (move) {

        lastMove =
          chess.history({
            verbose: true
          }).at(-1) || null;

      }


      selectedSquare = null;

      legalTargets = [];


      renderAll();

      status.textContent =
        "Move undone";

    }
  );


document
  .getElementById("newButton")
  .addEventListener(
    "click",
    () => {

      if (analyzing) return;


      chess.reset();


      selectedSquare = null;

      legalTargets = [];

      lastMove = null;


      bestMove.textContent =
        "—";


      evaluation.textContent =
        "0.00";


      depthDisplay.textContent =
        "—";


      nodesDisplay.textContent =
        "0";


      pv.textContent =
        "Waiting for analysis...";


      evalFill.style.height =
        "50%";


      evalText.textContent =
        "0.00";


      status.textContent =
        "New game";


      renderAll();

    }
  );


renderAll();
