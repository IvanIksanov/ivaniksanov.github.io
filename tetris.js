
/****************************************************
 *  БЛОК 2. Игра Тетрис (из script.js)
 ****************************************************/

// Для Тетриса используется <canvas id="gameCanvas">
// Переменные названы cvs / ctx внутри Тетрис-блока.
// (Не конфликтует с Flappy Bird после переименования в самом Flappy Bird-коде.)

const cvs = document.getElementById("gameCanvas");
const ctx = cvs.getContext("2d");

const COLS = 12;
const ROWS = 20;
const SQ = 20;
const EMPTY = "WHITE";

let score = 0; // Счёт Тетриса
document.getElementById('tetris-score').textContent = `СЧЕТ: ${score}`;

// Динамический интервал падения
let dropInterval = 700; // Начальная скорость в миллисекундах

// Функция для обновления счета
function updateScore(linesCleared) {
    score += linesCleared * 100;
    document.getElementById('tetris-score').textContent = `СЧЕТ: ${score}`;
}

// Функция для отрисовки квадратика
function drawSquare(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * SQ, y * SQ, SQ, SQ);
    ctx.strokeStyle = "BLACK";
    ctx.strokeRect(x * SQ, y * SQ, SQ, SQ);
}

// Генерация доски
let board = [];
for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) {
        board[r][c] = EMPTY;
    }
}

// Отрисовка всей доски
function drawBoard() {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            drawSquare(c, r, board[r][c]);
        }
    }
}

// Начальная отрисовка поля
drawBoard();

// Определение фигур (Tetromino)
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

const COLORS = ["red", "green", "yellow", "blue", "purple", "cyan", "orange", "pink", "lime", "teal"];

// Случайный цвет
function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// Массив фигур + генератор
const PIECES = [
    [Z, randomColor()],
    [S, randomColor()],
    [T, randomColor()],
    [O, randomColor()],
    [L, randomColor()],
    [I, randomColor()],
    [J, randomColor()]
];

function randomPiece() {
    let r = Math.floor(Math.random() * PIECES.length);
    return new Piece(PIECES[r][0], randomColor());
}

// Конструктор фигуры
function Piece(tetromino, color) {
    this.tetromino = tetromino;
    this.color = color;
    this.tetrominoIndex = 0;
    this.activeTetromino = this.tetromino[this.tetrominoIndex];
    this.x = 3;
    this.y = -2;
}

// Заполнить ячейки цветом
Piece.prototype.fill = function(color) {
    for (let r = 0; r < this.activeTetromino.length; r++) {
        for (let c = 0; c < this.activeTetromino[r].length; c++) {
            if (this.activeTetromino[r][c]) {
                drawSquare(this.x + c, this.y + r, color);
            }
        }
    }
};

Piece.prototype.draw = function() {
    this.fill(this.color);
};

Piece.prototype.unDraw = function() {
    this.fill(EMPTY);
};

Piece.prototype.moveDown = function() {
    if (!this.collision(0, 1, this.activeTetromino)) {
        this.unDraw();
        this.y++;
        this.draw();
    } else {
        this.lock();
        p = randomPiece();
    }
};

Piece.prototype.lock = function() {
    // Заполнение доски
    for (let r = 0; r < this.activeTetromino.length; r++) {
        for (let c = 0; c < this.activeTetromino[r].length; c++) {
            if (this.activeTetromino[r][c]) {
                if (this.y + r < 0) {
                    alert("Игра Тетрис окончена, но ты всё равно победитель!\nНашел баг — напиши в канал QAtoDev");
                    gameOver = true;
                    return;
                }
                board[this.y + r][this.x + c] = this.color;
            }
        }
    }

    // Проверка заполненных строк
    let linesCleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
        let isRowFull = true;
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] === EMPTY) {
                isRowFull = false;
                break;
            }
        }

        if (isRowFull) {
            board.splice(r, 1);
            board.unshift(new Array(COLS).fill(EMPTY));
            linesCleared++;
        }
    }
    updateScore(linesCleared);

    drawBoard();
};

Piece.prototype.collision = function(x, y, piece) {
    for (let r = 0; r < piece.length; r++) {
        for (let c = 0; c < piece[r].length; c++) {
            if (!piece[r][c]) {
                continue;
            }
            let newX = this.x + c + x;
            let newY = this.y + r + y;
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
};

Piece.prototype.moveLeft = function() {
    if (!this.collision(-1, 0, this.activeTetromino)) {
        this.unDraw();
        this.x--;
        this.draw();
    }
};

Piece.prototype.moveRight = function() {
    if (!this.collision(1, 0, this.activeTetromino)) {
        this.unDraw();
        this.x++;
        this.draw();
    }
};

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
};

// Управление Тетрисом
let p = randomPiece();
let gameOver = false;

document.addEventListener("keydown", CONTROL);
function CONTROL(event) {
    // Проверяем, находится ли фокус на полях ввода
    const isInputFocused = document.activeElement.tagName === 'INPUT'
                           || document.activeElement.tagName === 'TEXTAREA';

    // Если фокус на поле ввода, не обрабатываем
    if (isInputFocused) return;

    event.preventDefault();

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

// Кнопки управления (мобильные)
document.getElementById('left').addEventListener('click', function() {
    p.moveLeft();
});
document.getElementById('rotate').addEventListener('click', function() {
    p.rotate();
});
document.getElementById('right').addEventListener('click', function() {
    p.moveRight();
});
document.getElementById('down').addEventListener('click', function() {
    p.moveDown();
});

// Анимация падения фигур
let dropStart = Date.now();
function drop() {
    let now = Date.now();
    let delta = now - dropStart;

    // Увеличиваем сложность в зависимости от очков
    if (score > 300) {
       dropInterval = 600;
    } else if (score > 500) {
       dropInterval = 400;
    } else if (score > 800) {
       dropInterval = 200;
    } else if (score > 1000) {
       dropInterval = 100;
    }

    if (delta > dropInterval) {
        p.moveDown();
        dropStart = Date.now();
    }

    if (!gameOver) {
        requestAnimationFrame(drop);
    }
}
drop(); // Стартуем

// работа кнопки Свернуть список
document.getElementById('toggle-button2').addEventListener('click', function () {
        const checklist = document.getElementById('checklist-items2');
        const button = this;

        if (checklist.classList.contains('expanded')) {
            checklist.classList.remove('expanded');
            button.textContent = 'Развернуть список';

            // Скроллим вверх к началу списка
            checklist.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            checklist.classList.add('expanded');
            button.textContent = 'Свернуть список';
        }
    });


document.addEventListener('DOMContentLoaded', function () {
    const burgerMenu = document.querySelector('.burger-menu');
    const navLinks = document.querySelector('nav ul');

    burgerMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const prefix = "tetris_"; // Префикс для данной страницы
    const checkboxes = document.querySelectorAll("#checklist-items2 input[type='checkbox']");

    checkboxes.forEach((checkbox) => {
        const savedState = localStorage.getItem(prefix + checkbox.name);
        checkbox.checked = savedState === "true";
    });

    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", function () {
            localStorage.setItem(prefix + checkbox.name, checkbox.checked);
        });
    });
});