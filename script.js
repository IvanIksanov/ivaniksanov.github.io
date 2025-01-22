
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
 *  ИГРА FLAPPY BIRD С УРОВНЯМИ
 ****************************************************/

var flappyCvs = document.getElementById("canvas");
var flappyCtx = flappyCvs.getContext("2d");

// Фиксированная высота
var fixedHeight = 512;

// Загружаем изображения
var bird = new Image();
var fg = new Image();
var pipeUp = new Image();
var pipeBottom = new Image();
var restartImg = new Image();

bird.src = "img/bird.png";
restartImg.src = "img/restart.png";

// Пример массива доступных персонажей (для выбора)
let selectableCharacters = [
  { name: "birdClassic", src: "img/bird.png" },
  { name: "birdRed",     src: "img/birdRed.png" },
  { name: "birdBlue",    src: "img/birdBlue.png" }
];

// Подгружаем все изображения персонажей
selectableCharacters.forEach(char => {
  const img = new Image();
  img.src = char.src;
  char.imageObj = img;
  char.width = 50;
  char.height = 50;
});

// Звуки
var fly = new Audio();
var score_audio = new Audio();
fly.src = "audio/fly.mp3";
score_audio.src = "audio/score.mp3";

// Параметры игры
var gap = 130;
var constant;
var bX = 160;
var bY = 150;
var gravity = 1.9;
var flappyScore = 0;

// Интервал между трубами
var pipeInterval = 200;

// Флаги и массивы
var flappyGameOver = false; // Флаг завершения игры
var autoFlight = true;      // Флаг автопилота
var autoFlightInterval = null;
var pipe = [];              // Массив труб

// Начальные трубы
const initialPipes = 5;
const minPipeOffset = -70;  // Минимальная высота трубы
const maxPipeOffset = 90;   // Максимальная высота трубы

for (let i = 0; i < initialPipes; i++) {
    pipe.push({
        x: flappyCvs.width + i * (pipeInterval + 60),
        y: Math.floor(Math.random() * (maxPipeOffset - minPipeOffset + 1)) + minPipeOffset - 220,
        spawnedNext: i === initialPipes - 1 ? false : true
    });
}

// Уровни
const levels = [
    {
        backgroundColor: "#44BBC1", //бирюзовый + классический 1-10
        pipeUpSrc: "img/pipeUpPro.png",
        pipeBottomSrc: "img/pipeBottomPro.png",
        fgSrc: "img/fg.png"
    },
    {
        backgroundColor: "#FFD1C5", //#FFD1C5 светло-коричневый + камень 10 - 30
        pipeUpSrc: "img/pipeUpLevel3.png",
        pipeBottomSrc: "img/pipeBottomLevel3.png",
        fgSrc: "img/fgLevel3.png"
    },
    {
        backgroundColor: "#FFD700",//#FFD700 желтый + сердечки 30 - 50
        pipeUpSrc: "img/pipeUpLevel4.png",
        pipeBottomSrc: "img/pipeBottomLevel4.png",
        fgSrc: "img/fgLevel4.png"
    },
    {
        backgroundColor: "#8A2BE2", //фиолетовый + классический 50 - 80
        pipeUpSrc: "img/pipeUpLevel5.png",
        pipeBottomSrc: "img/pipeBottomLevel5.png",
        fgSrc: "img/fgLevel5.png"
    },
    {
        backgroundColor: "#83EFEA", //светло-синий + березы 80 - 120
        pipeUpSrc: "img/pipeUpLevel2.png",
        pipeBottomSrc: "img/pipeBottomLevel2.png",
        fgSrc: "img/fgLevel2.png"
    },
    {
        backgroundColor: "#E2FFD4", //светло-зеленый + здания 120 - 150
        pipeUpSrc: "img/pipeUpLevel6.png",
        pipeBottomSrc: "img/pipeBottomLevel6.png",
        fgSrc: "img/fgLevel6.png"
    },
    {
        backgroundColor: "#DB7EFF", //розовый + классический 150 - 180
        pipeUpSrc: "img/pipeUp.png",
        pipeBottomSrc: "img/pipeBottom.png",
        fgSrc: "img/fg.png"
    },
    {
        backgroundColor: "#000000", //черный + классический 180 - 220
        pipeUpSrc: "img/pipeUp.png",
        pipeBottomSrc: "img/pipeBottom.png",
        fgSrc: "img/fg.png"
    },
    {
        backgroundColor: "#000000", //черный + классический 220 - 250
        pipeUpSrc: "img/pipeUp.png",
        pipeBottomSrc: "img/pipeBottom.png",
        fgSrc: "img/fg.png"
    },
    {
        backgroundColor: "#2200E1", //синий + классический => 250
        pipeUpSrc: "img/pipeUp.png",
        pipeBottomSrc: "img/pipeBottom.png",
        fgSrc: "img/fg.png"
    }
];

let currentLevel = 0;

function updateLevel() {
    const levelThresholds = [10, 30, 50, 80, 120, 150, 180, 220, 250];
    for (let i = 0; i < levelThresholds.length; i++) {
        if (flappyScore >= levelThresholds[i]) {
            currentLevel = i + 1;
        }
    }
    const level = levels[currentLevel];
    pipeUp.src = level.pipeUpSrc;
    pipeBottom.src = level.pipeBottomSrc;
    fg.src = level.fgSrc;
}

// Изменение размеров canvas
function resizeFlappyCanvas() {
    flappyCvs.height = fixedHeight;
    flappyCvs.width = window.innerWidth;

    // Изменяем интервал труб на основе ширины экрана
    if (flappyCvs.width >= 1024) {
        pipeInterval = 290;
    } else if (flappyCvs.width >= 768) {
        pipeInterval = 200;
    } else {
        pipeInterval = 300;
    }
}
window.addEventListener("resize", resizeFlappyCanvas);
resizeFlappyCanvas();

// Управление
document.addEventListener("keydown", function(event) {
    if (event.code === "Space") {
      event.preventDefault(); // Отключаем прокрутку
    }
    if (!flappyGameOver && event.code === "Space") {
        disableAutoFlight();
        moveUp();
    }
});

// Одна-единственная функция "поднять птицу"
function moveUp() {
    bY -= 35;
    fly.play();
}

// Клик по canvas
flappyCvs.addEventListener("click", function (e) {
    // Координаты клика относительно canvas
    const rect = flappyCvs.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Если игра окончена — проверяем, кликнули ли в картинку restart
    if (flappyGameOver) {
        const restartImgWidth = 100;
        const restartImgHeight = 130;
        const restartImgX = (flappyCvs.width - restartImgWidth) / 2;
        const restartImgY = (fixedHeight - restartImgHeight) / 2;

        if (
            clickX >= restartImgX && clickX <= restartImgX + restartImgWidth &&
            clickY >= restartImgY && clickY <= restartImgY + restartImgHeight
        ) {
            resetGame();
        }
        return;
    }

    // Если игра не окончена — проверяем, кликнули ли в скин
    let clickedOnCharacter = false;
    for (let char of selectableCharacters) {
        if (
            clickX >= char.x &&
            clickX <= char.x + char.width &&
            clickY >= char.y &&
            clickY <= char.y + char.height
        ) {
            clickedOnCharacter = true;
            disableAutoFlight();
            bird.src = char.src;
            break;
        }
    }

    // Если не по скину — это подскок
    if (!clickedOnCharacter) {
        disableAutoFlight();
        moveUp();
    }
});

// Остановка игры
function stopFlappyGame() {
    flappyGameOver = true;
    clearInterval(autoFlightInterval);
}

// Отключить автопилот
function disableAutoFlight() {
    if (autoFlight) {
        autoFlight = false;
        clearInterval(autoFlightInterval);
    }
}

// Автопилот (упрощённая логика)
function enableAutoFlappyFlight() {
    autoFlight = true;
    autoFlightInterval = setInterval(() => {
        if (flappyGameOver) {
            clearInterval(autoFlightInterval);
            return;
        }
        if (!autoFlight) return;

        let nextPipe = null;
        let pipeWidth = 72;

        for (let i = 0; i < pipe.length; i++) {
            if (pipe[i].x + pipeWidth >= bX) {
                nextPipe = pipe[i];
                break;
            }
        }

        // Если нет ближайшей трубы, просто слегка поднимаемся
        if (!nextPipe) {
            if (bY > 50) bY -= 5;
            return;
        }

        let gapTop = nextPipe.y + 320;
        let gapBottom = gapTop + gap;
        let centerGap = (gapTop + gapBottom) / 2;
        let birdCenter = bY + 35; // центр птицы

        if (birdCenter > centerGap + 10) {
            bY -= 25;
        } else if (birdCenter < centerGap - 10) {
            bY += 2;
        }
    }, 100);
}

// Проверка коллизий
function detectCollision(pipeObj, pipeWidth, pipeHeight, constant, birdWidth, birdHeight) {
    if (
        // Горизонтальное пересечение
        bX + birdWidth > pipeObj.x &&
        bX < pipeObj.x + pipeWidth &&
        (
            // Вертикальное столкновение
            bY < pipeObj.y + pipeHeight ||
            bY + birdHeight > pipeObj.y + constant
        )
        ||
        // Птица упала на землю
        bY + birdHeight >= fixedHeight - fg.height
    ) {
        stopFlappyGame();
    }
}

// Главный цикл отрисовки
function drawFlappy() {
    // Заливаем фон цветом уровня (обновляем каждый кадр)
    updateLevel();
    flappyCtx.fillStyle = levels[currentLevel].backgroundColor;
    flappyCtx.fillRect(0, 0, flappyCvs.width, fixedHeight);

    const pipeWidth = 72;
    const pipeHeight = 320;
    const birdWidth = 50;
    const birdHeight = 50;

    // Рисуем трубы
    for (var i = 0; i < pipe.length; i++) {
        constant = pipeHeight + gap;

        // Всегда рисуем, но двигаем только если игра не окончена
        flappyCtx.drawImage(pipeUp, pipe[i].x, pipe[i].y, pipeWidth, pipeHeight);
        flappyCtx.drawImage(pipeBottom, pipe[i].x, pipe[i].y + constant, pipeWidth, pipeHeight);

        if (!flappyGameOver) {
            // Двигаем трубу
            pipe[i].x -= 2;
            pipe[i].x = Math.floor(pipe[i].x);

            // Генерация новой трубы
            if (!pipe[i].spawnedNext && pipe[i].x < (flappyCvs.width - pipeInterval)) {
                const minPipeY = -290;
                const maxPipeY = -50;
                pipe.push({
                    x: flappyCvs.width,
                    y: Math.floor(Math.random() * (maxPipeY - minPipeY + 1)) + minPipeY,
                    spawnedNext: false
                });
                pipe[i].spawnedNext = true;
            }

            // Проверка коллизий
            detectCollision(pipe[i], pipeWidth, pipeHeight, constant, birdWidth, birdHeight);

            // Увеличиваем счёт (если прошли трубу) — тоже только если игра не окончена
            if (pipe[i].x + pipeWidth === bX) {
                flappyScore++;
                score_audio.play();
            }

            // Удаление трубы за границей
            if (pipe[i].x + pipeWidth < 0) {
                pipe.splice(i, 1);
                i--;
            }
        }
    }

    // Рисуем землю (foreground)
    flappyCtx.drawImage(fg, 0, fixedHeight - fg.height, flappyCvs.width, fg.height);

    // Рисуем птицу
    flappyCtx.drawImage(bird, bX, bY, birdWidth, birdHeight);

    // Гравитация — только если игра не окончена
    if (!flappyGameOver) {
        bY += gravity;
    }

    // Текст счёта
    flappyCtx.fillStyle = "#000";
    flappyCtx.font = "20px Fira Code";
    flappyCtx.fillText("Счет: " + flappyScore, 10, fixedHeight - 20);

    // Рисуем выбор скинов
    drawCharacterSelection();

    // Если игра окончена, рисуем "restart" поверх всего
    if (flappyGameOver) {
        const restartImgWidth = 240;
        const restartImgHeight = 180;
        const restartImgX = (flappyCvs.width - restartImgWidth) / 2;
        const restartImgY = (fixedHeight - restartImgHeight) / 2;

        flappyCtx.drawImage(restartImg, restartImgX, restartImgY, restartImgWidth, restartImgHeight);
    }

    // Следующий кадр
    requestAnimationFrame(drawFlappy);
}

// Отрисовка скинов
function drawCharacterSelection() {
    let startX = 500;
    let spacing = 80;
    let charY = 440;

    selectableCharacters.forEach((char) => {
        flappyCtx.drawImage(char.imageObj, startX, charY, char.width, char.height);
        char.x = startX;
        char.y = charY;
        startX += spacing;
    });
}

// Сброс игры (перезапуск без перезагрузки страницы)
function resetGame() {
    flappyGameOver = false;
    flappyScore = 0;
    bX = 160;
    bY = 150;
    pipe = [];

    for (let i = 0; i < initialPipes; i++) {
        pipe.push({
            x: flappyCvs.width + i * (pipeInterval + 60),
            y: Math.floor(Math.random() * (maxPipeOffset - minPipeOffset + 1)) + minPipeOffset - 220,
            spawnedNext: i === initialPipes - 1 ? false : true
        });
    }

    enableAutoFlappyFlight();
}

// Запускаем игру
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

// карусель статей хабра
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

// работа кнопки Свернуть список
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

document.addEventListener("DOMContentLoaded", function () {
    const prefix = "index_"; // Префикс для данной страницы
    const checkboxes = document.querySelectorAll("#checklist-items input[type='checkbox']");

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