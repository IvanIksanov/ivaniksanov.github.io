/****************************************************
 *  БЛОК 1. Код для отправки формы (Swagger) и
 *  прочие мелкие функции (карусель, счётчик сердечек,
 *  кнопка бургера), взяты из script.js
 ****************************************************/

// --- ОТПРАВКА ФОРМЫ НА SWAGGER ---
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

/*
  Если в коде был второй обработчик submit на тот же id="feedbackForm",
  но с другими полями: name, email, message — а в HTML таких полей нет,
  лучше удалить во избежание конфликтов. Если нужен, то раскомментируйте
  и добавьте соответствующие поля в HTML.

document.getElementById('feedbackForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email2 = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    console.log(`Форма отправлена! Имя: ${name}, Email: ${email2}, Сообщение: ${message}`);
    alert('Спасибо за вашу обратную связь!');
    this.reset();
});
*/

// --- СЧЕТЧИК ДНЕЙ ДО НОВОГО ГОДА ---
document.addEventListener('DOMContentLoaded', function () {
    // Функция для расчёта оставшихся дней
    function calculateDaysToNewYear() {
        const today = new Date();
        const nextYear = today.getFullYear() + 1;
        const newYearDate = new Date(nextYear, 0, 1); // 1 января следующего года
        const timeDifference = newYearDate - today;   // Разница в миллисекундах
        const daysLeft = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
        return daysLeft;
    }

    // Отображение количества дней
    function displayDaysLeft() {
        const daysLeft = calculateDaysToNewYear();
        const daysLeftElement = document.getElementById('days-left');
        if(daysLeftElement) {
           daysLeftElement.textContent = `${daysLeft} дней!`;
        }
    }

    // Инициализация счётчика
    displayDaysLeft();

    // Обновление каждые 24 часа
    setInterval(displayDaysLeft, 24 * 60 * 60 * 1000);
});

// --- КАРУСЕЛЬ ИЗОБРАЖЕНИЙ ---
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

// --- СЧЕТЧИК СЕРДЕЧЕК ---
let userCount = 0;
document.getElementById('increaseCount').addEventListener('click', function() {
    userCount++;
    document.getElementById('count').textContent = userCount;
});

// --- БУРГЕР-МЕНЮ ---
document.addEventListener('DOMContentLoaded', function () {
    const burgerMenu = document.querySelector('.burger-menu');
    const navLinks = document.querySelector('nav ul');

    burgerMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
});


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


/****************************************************
 *  БЛОК 3. Игра Flappy Bird (из script2.js)
 ****************************************************/

// Для Flappy Bird используется <canvas id="canvas">
// Чтобы не конфликтовать с переменными Тетриса,
// переименуем cvs->flappyCvs, ctx->flappyCtx, score->flappyScore,
// draw() -> drawFlappy() и т.д.

var flappyCvs = document.getElementById("canvas");
var flappyCtx = flappyCvs.getContext("2d");

// Фиксированная высота
var fixedHeight = 512;

// Загружаем изображения
var bird = new Image();
var fg = new Image();
var pipeUp = new Image();
var pipeBottom = new Image();

bird.src = "img/bird.png";
fg.src = "img/fg.png";
pipeUp.src = "img/pipeUp.png";
pipeBottom.src = "img/pipeBottom.png";

// Пример массива доступных персонажей
// Можно добавить больше, главное, чтобы пути (src) существовали в папке img
let selectableCharacters = [
  { name: "birdClassic", src: "img/bird.png" },
  { name: "birdRed",     src: "img/birdRed.png" },
  { name: "birdBlue",    src: "img/birdBlue.png" }
];

// Подгружаем все изображения персонажей
selectableCharacters.forEach(char => {
  const img = new Image();
  img.src = char.src;
  // Сохраняем объект Image внутрь массива
  char.imageObj = img;

  // Можно указать желаемые размеры миниатюры
  // (ширина/высота в пикселях) для дальнейшей отрисовки
  char.width = 50;  // например, мини-версия 45px
  char.height = 50; // пропорции можно менять
});

// Звук
var fly = new Audio();
var score_audio = new Audio();
fly.src = "audio/fly.mp3";
score_audio.src = "audio/score.mp3";

var gap = 135;
var constant;
var bX = 160;
var bY = 150;
var gravity = 1.7;
var flappyScore = 0;

// Переменная для интервала между трубами
var pipeInterval = 200;
// Флаг завершения игры
var flappyGameOver = false;
// Флаг автоматического управления
var autoFlight = true;
var autoFlightInterval;

// Функция для изменения размеров Flappy Bird canvas
function resizeFlappyCanvas() {
    flappyCvs.height = fixedHeight;        // Фикс высота
    flappyCvs.width = window.innerWidth;   // Ширина = ширина окна

    // Изменяем интервал труб на основе ширины экрана
    if (flappyCvs.width >= 1024) {
        pipeInterval = 290;
    } else if (flappyCvs.width >= 768) {
        pipeInterval = 200;
    } else {
        pipeInterval = 250;
    }
}

window.addEventListener("resize", resizeFlappyCanvas);
resizeFlappyCanvas();

// Обработка пробела
document.addEventListener("keydown", function(event) {
    // Если игра Flappy Bird не закончена и нажали Space
    if (!flappyGameOver && event.code === "Space") {
        event.preventDefault();
        disableAutoFlight();
        moveUp();
    }
});

// Обработка клика по canvas (на телефонах — "тап")
flappyCvs.addEventListener("click", function () {
    if (!flappyGameOver) {
        disableAutoFlight();
        moveUp();
    }
});

function moveUp() {
    bY -= 20;
    fly.play();
}

// Создаём массив труб
var pipe = [];
pipe[0] = {
    x: flappyCvs.width,
    y: Math.floor(Math.random() * pipeUp.height) - pipeUp.height
};

// Остановка Flappy Bird
function stopFlappyGame() {
    flappyGameOver = true;
    clearInterval(autoFlightInterval);
    console.log("Flappy Bird игра окончена!");
}

// Отключаем автополет
function disableAutoFlight() {
    if (autoFlight) {
        autoFlight = false;
        clearInterval(autoFlightInterval);
    }
}

// Включаем автоподдержание полёта
function enableAutoFlappyFlight() {
    autoFlightInterval = setInterval(() => {
        if (bY > 50) {
            bY -= 30;
        }
    }, 330);
}

// Проверка столкновений
function detectCollision(pipeObj, pipeWidth, pipeHeight, constant, birdWidth, birdHeight) {
    if (
        bX + birdWidth > pipeObj.x &&
        bX < pipeObj.x + pipeWidth &&
        (
            bY < pipeObj.y + pipeHeight
            || bY + birdHeight > pipeObj.y + constant
        )
        ||
        bY + birdHeight >= fixedHeight - fg.height
    ) {
        stopFlappyGame();
    }
}

// Отрисовка Flappy Bird
function drawFlappy() {
    if (flappyGameOver) {
        return;
    }

    function drawCharacterSelection() {
        // Отрисуем каждую миниатюру с равным отступом
        let startX = 500; // Начало по оси X слева (можно изменить)
        let spacing = 80; // Промежуток между персонажами

        // Координата Y чуть выше земли:
        // fixedHeight - fg.height это верхняя граница земли
        // но чтобы персонажи были чуть выше, вычтем ещё их высоту
        let charY = 430;

        selectableCharacters.forEach((char, index) => {
            // Допустим, у нас уже есть char.imageObj, width/height
            let img = char.imageObj;

            // Сохраняем для каждого персонажа координаты,
            // чтобы знать, куда пользователь кликнул
            char.x = startX;
            char.y = charY;

            // Рисуем миниатюру
            flappyCtx.drawImage(
                img,
                char.x,
                char.y,
                char.width,
                char.height
            );

            // Смещаемся на spacing пикселей вправо перед следующим персонажем
            startX += spacing;
        });
    }

    const pipeWidth = 72;
    const pipeHeight = 220;
    const birdWidth = 50;
    const birdHeight = 50;

    // Фон — однотонный голубой
    flappyCtx.fillStyle = "#44BBC1";
    flappyCtx.fillRect(0, 0, flappyCvs.width, fixedHeight);

    for (var i = 0; i < pipe.length; i++) {
        constant = pipeHeight + gap;

        // Рисуем колонки
        flappyCtx.drawImage(pipeUp, pipe[i].x, pipe[i].y, pipeWidth, pipeHeight);
        flappyCtx.drawImage(pipeBottom, pipe[i].x, pipe[i].y + constant, pipeWidth, pipeHeight);

        pipe[i].x -= 2; // Скорость движения труб

        // Добавляем новую трубу
        if (pipe[i].x === flappyCvs.width - pipeInterval) {
            pipe.push({
                x: flappyCvs.width,
                y: Math.floor(Math.random() * pipeUp.height) - pipeUp.height
            });
        }

        // Проверка столкновений
        detectCollision(pipe[i], pipeWidth, pipeHeight, constant, birdWidth, birdHeight);

        // Увеличение счета
        if (pipe[i].x + pipeWidth === bX) {
            flappyScore++;
            score_audio.play();
        }

        // Удаляем трубу, если она ушла за экран
        if (pipe[i].x + pipeWidth < 0) {
            pipe.splice(i, 1);
            i--;
        }
    }

    // Рисуем нижний фон
    flappyCtx.drawImage(fg, 0, fixedHeight - fg.height, flappyCvs.width, fg.height);

    // Птица
    flappyCtx.drawImage(bird, bX, bY, birdWidth, birdHeight);

    bY += gravity; // Применяем гравитацию

    // Текст счета
    flappyCtx.fillStyle = "#000";
    flappyCtx.font = "20px Fira Code";
    flappyCtx.fillText("Счет: " + flappyScore, 10, fixedHeight - 20);

    // 1) нарисовали все трубы, птицу, землю...
    // 2) теперь поверх рисуем выбор персонажа
    drawCharacterSelection();

    // 3) завершаем кадр

    requestAnimationFrame(drawFlappy);
}

flappyCvs.addEventListener("click", function (e) {
    if (!flappyGameOver) {
        // Получаем координаты клика относительно canvas
        const rect = flappyCvs.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // 1) Проверяем, попали ли мы в область одного из персонажей
        let clickedOnCharacter = false;

        for (let char of selectableCharacters) {
            // Проверяем, находится ли (clickX, clickY) внутри
            // прямоугольника char.x, char.y, char.width, char.height
            if (
                clickX >= char.x &&
                clickX <= char.x + char.width &&
                clickY >= char.y &&
                clickY <= char.y + char.height
            ) {
                // Да, пользователь кликнул по этому персонажу
                clickedOnCharacter = true;

                // Отключаем автопилот (если нужно)
                disableAutoFlight();

                // Меняем текущую птицу на выбранную
                bird.src = char.src;

                console.log("Выбран персонаж:", char.name);
                break;
            }
        }

        // 2) Если не попали в персонажа,
        //    значит это обычный клик "подпрыгнуть"
        if (!clickedOnCharacter) {
            disableAutoFlight();
            moveUp();
        }
    }
});

enableAutoFlappyFlight();
drawFlappy();

/*
   ВАЖНО: Если вы хотите, чтобы при нажатии пробела в игре Тетрис
   НЕ мешал Flappy Bird (или наоборот), придётся доработать логику.
   Но по умолчанию:
   - Тетрис использует клавиши со стрелками
   - Flappy Bird на пробел и клик мыши/тап
   особых конфликтов быть не должно.
*/

document.addEventListener('DOMContentLoaded', function() {
  const track = document.querySelector('.habr-carousel-track');
  const prevBtn = document.getElementById('habr-prev');
  const nextBtn = document.getElementById('habr-next');

  // Количество пикселей, на которые будет пролистываться при клике
  const scrollAmount = 200;

  prevBtn.addEventListener('click', function() {
    track.scrollBy({
      top: 0,
      left: -scrollAmount,
      behavior: 'smooth'
    });
  });

  nextBtn.addEventListener('click', function() {
    track.scrollBy({
      top: 0,
      left: scrollAmount,
      behavior: 'smooth'
    });
  });
});

document.getElementById('toggle-button').addEventListener('click', function () {
        const checklist = document.getElementById('checklist-items');
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