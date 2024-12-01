// Отправка формы обратной связи
document.getElementById('feedbackForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    console.log(`Форма отправлена! Имя: ${name}, Email: ${email}, Сообщение: ${message}`);
    alert('Спасибо за вашу обратную связь!');
    this.reset();
});

document.addEventListener('DOMContentLoaded', function () {
    let currentIndex = 0;
    const images = document.querySelectorAll('.carousel-images img');

    function showImage(index) {
        images.forEach((img, i) => {
            img.classList.remove('active');
            if (i === index) {
                img.classList.add('active');
            }
        });
    }

    document.getElementById('prev').addEventListener('click', function() {
        console.log("Кнопка Назад нажата"); // Лог для отладки
        currentIndex = (currentIndex > 0) ? currentIndex - 1 : images.length - 1;
        showImage(currentIndex);
    });

    document.getElementById('next').addEventListener('click', function() {
        console.log("Кнопка Вперед нажата"); // Лог для отладки
        currentIndex = (currentIndex < images.length - 1) ? currentIndex + 1 : 0;
        showImage(currentIndex);
    });

    // Изначально показываем первое изображение
    showImage(currentIndex);
});


document.getElementById('increaseCount').addEventListener('click', function() {
    userCount++;
    document.getElementById('count').textContent = userCount;
});

// Игра Тетрис
const cvs = document.getElementById("gameCanvas");
const ctx = cvs.getContext("2d");

const COLS = 12;
const ROWS = 20;
const SQ = 20;
const EMPTY = "WHITE";

// Draw a square
function drawSquare(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * SQ, y * SQ, SQ, SQ);
    ctx.strokeStyle = "BLACK";
    ctx.strokeRect(x * SQ, y * SQ, SQ, SQ);
}

let board = [];
for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) {
        board[r][c] = EMPTY;
    }
}

function drawBoard() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            drawSquare(c, r, board[r][c]);
        }
    }
}

drawBoard();

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

// Массив цветов
const COLORS = ["red", "green", "yellow", "blue", "purple", "cyan", "orange", "pink", "lime", "teal"];

// Генерация случайного цвета
function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// Массив фигур и их цветов
const PIECES = [
    [Z, randomColor()],
    [S, randomColor()],
    [T, randomColor()],
    [O, randomColor()],
    [L, randomColor()],
    [I, randomColor()],
    [J, randomColor()]
];

// Генерация случайных фигур
function randomPiece() {
    let r = Math.floor(Math.random() * PIECES.length);
    return new Piece(PIECES[r][0], randomColor()); // Используем случайный цвет
}

let p = randomPiece();

function Piece(tetromino, color) {
    this.tetromino = tetromino;
    this.color = color;
    this.tetrominoIndex = 0;
    this.activeTetromino = this.tetromino[this.tetrominoIndex];
    this.x = 3;
    this.y = -2;
}

// Fill function
Piece.prototype.fill = function(color) {
    for (let r = 0; r < this.activeTetromino.length; r++) {
        for (let c = 0; c < this.activeTetromino[r].length; c++) {
            if (this.activeTetromino[r][c]) {
                drawSquare(this.x + c, this.y + r, color);
            }
        }
    }
}

Piece.prototype.draw = function() {
    this.fill(this.color);
}

Piece.prototype.unDraw = function() {
    this.fill(EMPTY);
}

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

Piece.prototype.lock = function() {
    // Заполнение доски цветом текущей фигуры
    for (let r = 0; r < this.activeTetromino.length; r++) {
        for (let c = 0; c < this.activeTetromino[r].length; c++) {
            if (this.activeTetromino[r][c]) {
                if (this.y + r < 0) {
                    alert("Игра окончена, но ты всё равно победитель! Нашел баг - напиши в канал QAtoDev");
                    gameOver = true;
                    return; // Прерываем выполнение, если игра окончена
                }
                board[this.y + r][this.x + c] = this.color; // Заполняем клетку цветом фигуры
            }
        }
    }

    // Удаление полных строк
    for (let r = ROWS - 1; r >= 0; r--) {
        let isRowFull = true;
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] === EMPTY) {
                isRowFull = false; // Если есть пустая клетка, строка не полная
                break;
            }
        }

        if (isRowFull) {
            // Удаляем строку
            board.splice(r, 1); // Удаляем полную строку
            // Добавляем новую пустую строку в начало
            board.unshift(new Array(COLS).fill(EMPTY)); // Новая пустая строка
        }
    }

    drawBoard(); // Обновляем отрисовку доски
}

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
}

Piece.prototype.moveLeft = function() {
    if (!this.collision(-1, 0, this.activeTetromino)) {
        this.unDraw();
        this.x--;
        this.draw();
    }
}

Piece.prototype.moveRight = function() {
    if (!this.collision(1, 0, this.activeTetromino)) {
        this.unDraw();
        this.x++;
        this.draw();
    }
}

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

// Существующий код

document.addEventListener("keydown", CONTROL);

document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
});

function CONTROL(event) {
    // Проверяем, находится ли фокус на полях ввода
    const isInputFocused = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';

    // Если фокус на поле ввода, не обрабатываем стрелочные клавиши
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

// Обработчики событий для кнопок
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
