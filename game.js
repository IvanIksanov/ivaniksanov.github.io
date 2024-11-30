const cvs = document.getElementById("gameCanvas");
const ctx = cvs.getContext("2d");

// Board size
const COLS = 12;
const ROWS = 20;
const SQ = 20;
const EMPTY = "WHITE"; // Color of empty square

// Draw a square
function drawSquare(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * SQ, y * SQ, SQ, SQ);

    ctx.strokeStyle = "BLACK";
    ctx.strokeRect(x * SQ, y * SQ, SQ, SQ);
}

// Create the board
let board = [];
for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) {
        board[r][c] = EMPTY;
    }
}

// Draw the board
function drawBoard() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            drawSquare(c, r, board[r][c]);
        }
    }
}

drawBoard();

// Определения фигур
const Z = [
    [
        [1, 1, 0],
        [0, 1, 1]
    ],
    [
        [0, 1],
        [1, 1],
        [1, 0]
    ]
];

const S = [
    [
        [0, 1, 1],
        [1, 1, 0]
    ],
    [
        [1, 0],
        [1, 1],
        [0, 1]
    ]
];

const T = [
    [
        [0, 1, 0],
        [1, 1, 1]
    ],
    [
        [1, 0],
        [1, 1],
        [1, 0]
    ],
    [
        [1, 1, 1],
        [0, 1, 0]
    ],
    [
        [0, 1],
        [1, 1],
        [0, 1]
    ]
];

const O = [
    [
        [1, 1],
        [1, 1]
    ]
];

const L = [
    [
        [1, 0, 0],
        [1, 1, 1]
    ],
    [
        [1, 1],
        [1, 0],
        [1, 0]
    ],
    [
        [1, 1, 1],
        [0, 0, 1]
    ],
    [
        [0, 1],
        [0, 1],
        [1, 1]
    ]
];

const I = [
    [
        [1, 1, 1, 1]
    ],
    [
        [1],
        [1],
        [1],
        [1]
    ]
];

const J = [
    [
        [0, 0, 1],
        [1, 1, 1]
    ],
    [
        [1, 0],
        [1, 0],
        [1, 1]
    ],
    [
        [1, 1, 1],
        [1, 0, 0]
    ],
    [
        [1, 1],
        [0, 1],
        [0, 1]
    ]
];

// Массив фигур и их цветов
const PIECES = [
    [Z, "red"],
    [S, "green"],
    [T, "yellow"],
    [O, "blue"],
    [L, "purple"],
    [I, "cyan"],
    [J, "orange"]
];


// Generate random pieces
function randomPiece() {
    let r = randomN = Math.floor(Math.random() * PIECES.length); // Random index from 0 to 6
    return new Piece(PIECES[r][0], PIECES[r][1]);
}

let p = randomPiece();

// The piece object
function Piece(tetromino, color) {
    this.tetromino = tetromino;
    this.color = color;

    this.tetrominoIndex = 0;
    this.activeTetromino = this.tetromino[this.tetrominoIndex];

    // Control the piece
    this.x = 3;
    this.y = -2;
}

// Fill function
Piece.prototype.fill = function(color) {
    for (let r = 0; r < this.activeTetromino.length; r++) {
        for (let c = 0; c < this.activeTetromino.length; c++) {
            if (this.activeTetromino[r][c]) {
                drawSquare(this.x + c, this.y + r, color);
            }
        }
    }
}

// Draw a piece on the board
Piece.prototype.draw = function() {
    this.fill(this.color);
}

// Undraw a piece
Piece.prototype.unDraw = function() {
    this.fill(EMPTY);
}

// Move Down the Piece
Piece.prototype.moveDown = function() {
    if (!this.collision(0, 1, this.activeTetromino)) {
        this.unDraw();
        this.y++;
        this.draw();
    } else {
        this.lock();
        p = randomPiece();
    }
}

// Lock the piece in place
Piece.prototype.lock = function() {
    for (let r = 0; r < this.activeTetromino.length; r++) {
        for (let c = 0; c < this.activeTetromino.length; c++) {
            if (!this.activeTetromino[r][c]) {
                continue;
            }
            if (this.y + r < 0) {
                alert("Game Over");
                gameOver = true;
                break;
            }
            board[this.y + r][this.x + c] = this.color;
        }
    }

    // Remove full rows
    for (let r = 0; r < ROWS; r++) {
        let isRowFull = true;
        for (let c = 0; c < COLS; c++) {
            isRowFull = isRowFull && (board[r][c] !== EMPTY);
        }
        if (isRowFull) {
            for (let y = r; y > 1; y--) {
                for (let c = 0; c < COLS; c++) {
                    board[y][c] = board[y - 1][c];
                }
            }
            for (let c = 0; c < COLS; c++) {
                board[0][c] = EMPTY;
            }
        }
    }

    drawBoard();
}

// Collision function
Piece.prototype.collision = function(x, y, piece) {
    for (let r = 0; r < piece.length; r++) {
        for (let c = 0; c < piece.length; c++) {

            // if the square is empty, we skip it
            if (!piece[r][c]) {
                continue;
            }
            // coordinates of the piece after movement
            let newX = this.x + c + x;
            let newY = this.y + r + y;

            // conditions
            if (newX < 0 || newX >= COLS || newY >= ROWS) {
                return true;
            }
            if (newY < 0) {
                continue;
            }
            if (board[newY][newX] !== EMPTY) {
                return true;
            }
        }
    }
    return false;
}

// Move Left the Piece
Piece.prototype.moveLeft = function() {
    if (!this.collision(-1, 0, this.activeTetromino)) {
        this.unDraw();
        this.x--;
        this.draw();
    }
}

// Move Right the Piece
Piece.prototype.moveRight = function() {
    if (!this.collision(1, 0, this.activeTetromino)) {
        this.unDraw();
        this.x++;
        this.draw();
    }
}

// Rotate the Piece
Piece.prototype.rotate = function() {
    let nextPattern = this.tetromino[(this.tetrominoIndex + 1) % this.tetromino.length];
    let kick = 0;

    if (this.collision(0, 0, nextPattern)) {
        kick = this.x > COLS / 2 ? -1 : 1;
    }

    if (!this.collision(kick, 0, nextPattern)) {
        this.unDraw();
        this.x += kick;
        this.tetrominoIndex = (this.tetrominoIndex + 1) % this.tetromino.length;
        this.activeTetromino = this.tetromino[this.tetrominoIndex];
        this.draw();
    }
}

// Control the piece
document.addEventListener("keydown", CONTROL);

function CONTROL(event) {
    if (event.keyCode === 37) {
        p.moveLeft();
    } else if (event.keyCode === 38) {
        p.rotate();
    } else if (event.keyCode === 39) {
        p.moveRight();
    } else if (event.keyCode === 40) {
        p.moveDown();
    }
}

// Drop the piece every second
let dropStart = Date.now();
let gameOver = false;
function drop() {
    let now = Date.now();
    let delta = now - dropStart;
    if (delta > 1000) {
        p.moveDown();
        dropStart = Date.now();
    }
    if (!gameOver) {
        requestAnimationFrame(drop);
    }
}

drop();
