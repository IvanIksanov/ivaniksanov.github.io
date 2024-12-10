document.getElementById('feedbackForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Сбор данных из формы
    const data = JSON.stringify({
        id: parseInt(document.getElementById('id').value),
        username: document.getElementById('username').value,
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value,
        userStatus: parseInt(document.getElementById('userStatus').value)
    });

    // Создание и отправка запроса
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://petstore.swagger.io/v2/user");
    xhr.setRequestHeader("Accept", "application/json");
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
                // Успешный ответ
                const response = JSON.parse(xhr.responseText);
                console.log('Пользователь создан:', response);
                alert('Пользователь успешно создан!');
                document.getElementById('feedbackForm').reset();
            } else {
                // Обработка ошибок
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    console.error('Ошибка создания пользователя:', errorResponse.message);
                    alert(`Ошибка: ${errorResponse.message}`);
                } catch (e) {
                    console.error('Ошибка парсинга ответа:', e);
                    alert('Произошла ошибка при создании пользователя.');
                }
            }
        }
    };

    xhr.onerror = function() {
        alert('Произошла ошибка сети. Пожалуйста, попробуйте снова.');
    };

    xhr.send(data);
});

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
    // Функция для расчёта оставшихся дней
    function calculateDaysToNewYear() {
        const today = new Date();
        const nextYear = today.getFullYear() + 1;
        const newYearDate = new Date(nextYear, 0, 1); // 1 января следующего года
        const timeDifference = newYearDate - today; // Разница в миллисекундах
        const daysLeft = Math.ceil(timeDifference / (1000 * 60 * 60 * 24)); // Перевод в дни
        return daysLeft;
    }

    // Отображение количества дней
    function displayDaysLeft() {
        const daysLeft = calculateDaysToNewYear();
        const daysLeftElement = document.getElementById('days-left');
        daysLeftElement.textContent = `${daysLeft} дней!`;
    }

    // Инициализация счётчика
    displayDaysLeft();

    // Обновление каждые 24 часа
    setInterval(displayDaysLeft, 24 * 60 * 60 * 1000);
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

// Инициализация счетчика пользователей
let userCount = 0;
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

let score = 0; // Счет
document.getElementById('tetris-score').textContent = `СЧЕТ: ${score}`;

// Динамический интервал падения
let dropInterval = 700; // Начальная скорость в миллисекундах

// Функция для обновления счета
function updateScore(linesCleared) {
    score += linesCleared * 100; // За каждую очищенную линию 100 очков
    document.getElementById('tetris-score').textContent = `СЧЕТ: ${score}`;
}

// Функция для отрисовки игрового поля
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

// Функция для отрисовки всего поля
function drawBoard() {
    ctx.clearRect(0, 0, cvs.width, cvs.height); // Очистка холста перед отрисовкой
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            drawSquare(c, r, board[r][c]);
        }
    }
}

// Начальная отрисовка игрового поля
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
                    alert("Игра Тетрис окончена, но ты всё равно победитель!\nНашел баг - напиши в канал QAtoDev");
                    gameOver = true;
                    return; // Прерываем выполнение, если игра окончена
                }
                board[this.y + r][this.x + c] = this.color; // Заполняем клетку цветом фигуры
            }
        }
    }

    // Удаление полных строк
    let linesCleared = 0; // Счетчик очищенных строк
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
            board.unshift(new Array(COLS).fill(EMPTY)); // Новая пустая строка
            linesCleared++; // Увеличиваем счетчик очищенных строк
        }
    }

    // Обновляем счет
    updateScore(linesCleared);

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

// Обработчик событий для управления игрой
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

// Функция для падения фигур
let dropStart = Date.now();
let gameOver = false;
function drop() {
    let now = Date.now();
    let delta = now - dropStart;

   if (score > 300) {
       dropInterval = 600; // Устанавливаем скорость 500, если score больше 700
   } else if (score > 500) {
       dropInterval = 400; // Устанавливаем скорость 600, если score больше 500
   } else if (score > 800) {
       dropInterval = 200; // Устанавливаем скорость 400, если score больше 100
    } else if (score > 1000) {
          dropInterval = 100; // Устанавливаем скорость 400, если score больше 100
      }


    // Если прошло достаточно времени, двигаем фигуру вниз
    if (delta > dropInterval) {
        p.moveDown();
        dropStart = Date.now();
    }

    if (!gameOver) {
        requestAnimationFrame(drop);
    }
}

// Начинаем игру
drop();

const burgerMenu = document.querySelector('.burger-menu');
const links = document.querySelectorAll('nav ul li.hidden');

burgerMenu.addEventListener('click', () => {
    links.forEach(link => {
        link.classList.toggle('hidden'); // Переключает класс hidden
    });
});
