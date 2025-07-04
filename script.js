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


var fixedHeight = 412;

// Дополнительное смещение для земли (fg)
// Чтобы визуально сохранить положение земли, как было при fixedHeight = 512,
// добавляем смещение, равное разнице (512 - 412 = 100)
var floorOffset = 100;

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

// -------------------------
// Переменные для монет
// -------------------------
var coinCount = 0;            // Счётчик собранных монет
var coins = [];               // Массив объектов монет
var lastCoinSpawnScore = 0;   // Последний счёт, при котором была заспавнена монета
var coinImg = new Image();
coinImg.src = "img/coin.png"; // Изображение монеты (замените по необходимости)
var coinWidth = 30;           // Размеры монеты
var coinHeight = 30;

// -------------------------
// Переменные для декора (фоновые картинки)
// -------------------------
var decorations = [];         // Массив объектов декораций
// Изменяем начальное значение, чтобы декор спавнился с самого начала (счёт 0)
var lastDecorationSpawnScore = -1;
var decorationCycleIndex = 0; // Для циклического выбора типа декора (чередование text и pro)
// Глобальные размеры по умолчанию для pro (для text будут заданы другие размеры)
var decorationWidth = 150;    // Для pro-декора
var decorationHeight = 230;   // Для pro-декора

// --- Глобальные переменные для очередей уникальных декораций ---
// Они не будут обновляться при смене уровня, пока не исчерпаются
var availableProDecor = [];
var availableTextDecor = [];

// Параметры игры
var gap = 130;
var constant;
var bX = 160;
var bY = 150;
var gravity = 2.2;
var flappyScore = 0;

// Интервал между трубами
var pipeInterval = 290;

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

// Общий массив декораций
const commonDecorations = [
    "img/decor16_pro.svg",
    "img/decor3_pro.svg",
    "img/decor4_pro.svg",
    "img/decor5_pro.svg",
    "img/decor2_pro.svg",
    "img/decor6_pro.svg",
    "img/decor7_pro.svg",
    "img/decor8_pro.svg",
    "img/decor9_pro.svg",
    "img/decor10_pro.svg",
    "img/decor11_pro.svg",
    "img/decor12_pro.svg",
    "img/decor13_pro.svg",
    "img/decor14_pro.svg",
    "img/decor15_pro.svg",
    "img/decor1_pro.svg",
    "img/decor17_pro.svg",
    "img/decor1_text.svg",
    "img/decor2_text.svg",
    "img/decor3_text.svg",
    "img/decor4_text.svg",
    "img/decor5_text.svg",
    "img/decor6_text.svg",
    "img/decor7_text.svg",
    "img/decor8_text.svg",
    "img/decor18_pro.svg",
    "img/decor19_pro.svg",
    "img/decor20_pro.svg",
    "img/decor21_pro.svg",
    "img/decor22_pro.svg"
];

// Функция для перемешивания массива (Алгоритм Фишера-Йетса)
function shuffleArray(array) {
    let shuffledArray = array.slice(); // Создаём копию массива, чтобы не менять исходный
    for (let i = shuffledArray.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1)); // Генерируем случайный индекс
        [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]]; // Меняем элементы местами
    }
    return shuffledArray;
}

// Уровни
const levels = [
    {
        backgroundColor: "#83EFEA", //светло-синий + березы 80 - 120
        pipeUpSrc: "img/pipeUpLevel2.png",
        pipeBottomSrc: "img/pipeBottomLevel2.png",
        fgSrc: "img/fgLevel2.png",
        decorationSrc: shuffleArray(commonDecorations),
        decorColor: "#FEFEFE"
    },
    {
        backgroundColor: "#009279", //зеленый + блины => 260
        pipeUpSrc: "img/pipeUpLevel7.png",
        pipeBottomSrc: "img/pipeBottomLevel7.png",
        fgSrc: "img/fgLevel7.png",
        decorationSrc: shuffleArray(commonDecorations),
        decorColor: "#FEFEFE"
    },
    {
        backgroundColor: "#44BBC1", //бирюзовый + классический 1-10
        pipeUpSrc: "img/pipeUpPro.png",
        pipeBottomSrc: "img/pipeBottomPro.png",
        fgSrc: "img/fg.png",
        // decorationSrc здесь не используется для спавна декора
        decorationSrc: shuffleArray(commonDecorations),
        decorColor: "#FEFEFE"
    },
    {
        backgroundColor: "#FFD1C5", //#FFD1C5 светло-коричневый + камень 10 - 30
        pipeUpSrc: "img/pipeUpLevel3.png",
        pipeBottomSrc: "img/pipeBottomLevel3.png",
        fgSrc: "img/fgLevel3.png",
        decorationSrc: shuffleArray(commonDecorations),
        decorColor: "#B55C00"
    },
    {
        backgroundColor: "#8A2BE2", //фиолетовый + классический 30 - 50
        pipeUpSrc: "img/pipeUpLevel5.png",
        pipeBottomSrc: "img/pipeBottomLevel5.png",
        fgSrc: "img/fgLevel5.png",
        decorationSrc: shuffleArray(commonDecorations),
        decorColor: "#FEFEFE"
    },
    {
        backgroundColor: "#FFD700",//#FFD700 желтый + сердечки 50 - 80
        pipeUpSrc: "img/pipeUpLevel4.png",
        pipeBottomSrc: "img/pipeBottomLevel4.png",
        fgSrc: "img/fgLevel4.png",
        decorationSrc: shuffleArray(commonDecorations),
        decorColor: "#FF0000"
    },
    {
        backgroundColor: "#E2FFD4", //светло-зеленый + здания 120 - 150
        pipeUpSrc: "img/pipeUpLevel6.png",
        pipeBottomSrc: "img/pipeBottomLevel6.png",
        fgSrc: "img/fgLevel6.png",
        decorationSrc: shuffleArray(commonDecorations),
        decorColor: "#000000"
    },
    {
        backgroundColor: "#DB7EFF", //розовый + классический 150 - 180
        pipeUpSrc: "img/pipeUp.png",
        pipeBottomSrc: "img/pipeBottom.png",
        fgSrc: "img/fg.png",
        decorationSrc: shuffleArray(commonDecorations),
        decorColor: "#DBDA96"
    },
    {
        backgroundColor: "#000000", //черный + классический 180 - 220
        pipeUpSrc: "img/pipeUp.png",
        pipeBottomSrc: "img/pipeBottom.png",
        fgSrc: "img/fg.png",
        decorationSrc: shuffleArray(commonDecorations),
        decorColor: "#FEFEFE"
    },
    {
        backgroundColor: "#000000", //черный + классический 220 - 250
        pipeUpSrc: "img/pipeUp.png",
        pipeBottomSrc: "img/pipeBottom.png",
        fgSrc: "img/fg.png",
        decorationSrc: shuffleArray(commonDecorations),
        decorColor: "#FEFEFE"
    },
    {
        backgroundColor: "#2200E1", //синий + классический 230 - 260
        pipeUpSrc: "img/pipeUp.png",
        pipeBottomSrc: "img/pipeBottom.png",
        fgSrc: "img/fg.png",
        decorationSrc: shuffleArray(commonDecorations),
        decorColor: "#FEFEFE"
    }
];

let currentLevel = 0;

// Функция для обновления уровня и (при необходимости) обновления цвета уже отображаемых декораций
function updateLevel() {
    const levelThresholds = [4, 15, 30, 50, 80, 110, 150, 190, 230, 260];
    let newLevel = 0;
    for (let i = 0; i < levelThresholds.length; i++) {
        if (flappyScore >= levelThresholds[i]) {
            newLevel = i + 1;
        }
    }
    // Если уровень изменился – обновляем цвет декора на экране
    if (newLevel !== currentLevel) {
        currentLevel = newLevel;
        updateDecorationsColor();
    }
    const level = levels[currentLevel];
    pipeUp.src = level.pipeUpSrc;
    pipeBottom.src = level.pipeBottomSrc;
    fg.src = level.fgSrc;
}

// Функция обновления цвета уже отображаемых SVG декораций
function updateDecorationsColor() {
    decorations.forEach(decor => {
         loadSvgWithColor(decor.originalSrc, levels[currentLevel].decorColor, function(newSrc) {
               decor.img.src = newSrc;
         });
    });
}

// Изменение размеров canvas
function resizeFlappyCanvas() {
  // 1) Фиксируем внутреннюю высоту
  flappyCvs.height = fixedHeight;

  // 2) Подгоняем ширину под CSS-контейнер
  flappyCvs.width = flappyCvs.clientWidth;

  // 3) Интервал между трубами всегда 300
  pipeInterval = 280;
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
    bY -= 39;
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
            if (bY > 60) bY -= 5;
            return;
        }

        let gapTop = nextPipe.y + 320;
        let gapBottom = gapTop + gap;
        let centerGap = (gapTop + gapBottom) / 2;
        let birdCenter = bY + 35; // центр птицы

        if (birdCenter > centerGap + 10) {
            bY -= 39;
        } else if (birdCenter < centerGap - 10) {
            bY += 2;
        }
    }, 100);
}

// Функция для создания (спавна) монеты
function spawnCoin() {
    // Монета появляется в правой части canvas на случайной высоте (с учётом земли)
    var minY = 50;
    // fg.height может быть ещё не загружен, но такова логика игры – монета не должна появляться ниже земли
    var maxY = fixedHeight - fg.height + floorOffset - coinHeight - 20;
    var coinY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
    coins.push({ x: flappyCvs.width, y: coinY });
}

// Функция для загрузки SVG с применением нужного цвета
function loadSvgWithColor(url, color, callback) {
    fetch(url)
      .then(response => response.text())
      .then(svgText => {
          // Заменяем все вхождения базового цвета ("#FEFEFE") на цвет текущего уровня
          let coloredSvgText = svgText.replace(/#FEFEFE/gi, color);
          let blob = new Blob([coloredSvgText], { type: "image/svg+xml" });
          let objectURL = URL.createObjectURL(blob);
          callback(objectURL);
      })
      .catch(err => {
          console.error("Ошибка загрузки SVG:", err);
          // Если ошибка, возвращаем исходный URL
          callback(url);
      });
}

// Функция для создания (спавна) декорации с использованием SVG и сменой цвета.
// Новая логика: используются глобальные очереди уникальных изображений для каждого типа (pro и text).
// Пока не будут показаны все уникальные изображения из commonDecorations, очереди не перезаполняются,
// даже если меняется уровень (стилистика).
// Теперь функция может принимать опциональный параметр (optionalX) – если он передан, декор спавнится с этой позиции,
// иначе по умолчанию с правого края (flappyCvs.width)
function spawnDecoration(optionalX) {
    var startX = (typeof optionalX !== 'undefined') ? optionalX : flappyCvs.width;

    // Если очередь для text-декора пуста, заполняем её из общего набора
    if (!availableTextDecor || availableTextDecor.length === 0) {
         availableTextDecor = shuffleArray(commonDecorations.filter(src => src.includes('_text')));
    }
    // Если очередь для pro-декора пуста, заполняем её из общего набора
    if (!availableProDecor || availableProDecor.length === 0) {
         availableProDecor = shuffleArray(commonDecorations.filter(src => src.includes('_pro')));
    }

    // Задаём схему чередования: можно задать любую схему
    var alternatingPattern = ['pro', 'pro', 'pro', 'text', 'pro', 'pro', 'pro', 'text'];
    var currentType = alternatingPattern[decorationCycleIndex % alternatingPattern.length];
    decorationCycleIndex++;

    let chosenSrc = null;
    if (currentType === 'text') {
         if (availableTextDecor.length > 0) {
             chosenSrc = availableTextDecor.shift();
         } else if (availableProDecor.length > 0) {
             chosenSrc = availableProDecor.shift();
         }
    } else { // currentType === 'pro'
         if (availableProDecor.length > 0) {
             chosenSrc = availableProDecor.shift();
         } else if (availableTextDecor.length > 0) {
             chosenSrc = availableTextDecor.shift();
         }
    }

    if (!chosenSrc) return;

    // Назначаем размеры в зависимости от типа декора
    let decorWidth, decorHeight;
    if (chosenSrc.includes('_text')) {
         decorWidth = 300;
         decorHeight = 180;
    } else {
         decorWidth = 150;
         decorHeight = 250;
    }

    // Определяем случайную вертикальную позицию для декора
    var minY = 10;
    // Задаём базовый отступ от нижней границы (50 пикселей)
    var bottomMargin = 50;

    // Если декор текстовый, увеличиваем отступ, чтобы он располагался выше
    if (chosenSrc.includes('_text')) {
        bottomMargin = 100; // например, вместо 50 пикселей теперь 80
    }

    var maxY = fixedHeight - fg.height + floorOffset - decorHeight - bottomMargin;
    var decorY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;

    // Загружаем SVG с заменой цвета текущего уровня
    loadSvgWithColor(chosenSrc, levels[currentLevel].decorColor, function(coloredSvgUrl) {
         let decorImg = new Image();
         decorImg.src = coloredSvgUrl;
         // Сохраняем также оригинальный путь для будущего обновления цвета
         decorations.push({ x: startX, y: decorY, img: decorImg, width: decorWidth, height: decorHeight, originalSrc: chosenSrc });
    });
}

// Функция для предварительного заполнения фона декорациями от левого до правого края
function initDecorations() {
    decorations = [];
    let spacing = 400; // интервал между декорациями (при необходимости можно скорректировать)
    for (let x = 0; x < flappyCvs.width; x += spacing) {
         spawnDecoration(x);
    }
    lastDecorationSpawnScore = 0;
}

// Проверка коллизий (для труб)
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
        // Птица упала на землю (с учётом смещения пола)
        bY + birdHeight >= fixedHeight - fg.height + floorOffset
    ) {
        stopFlappyGame();
    }
}

// Главный цикл отрисовки
function drawFlappy() {
    // Обновляем уровень (фон, трубы, земля)
    updateLevel();
    flappyCtx.fillStyle = levels[currentLevel].backgroundColor;
    flappyCtx.fillRect(0, 0, flappyCvs.width, fixedHeight);

    // -------------------------
    // Спавним и отрисовываем декорации (фоновый декор, за колоннами)
    // Условие спавна: каждое значение flappyScore кратное 3 и не совпадает с предыдущим
    if (!flappyGameOver && flappyScore % 3 === 0 && flappyScore !== lastDecorationSpawnScore) {
        spawnDecoration();
        lastDecorationSpawnScore = flappyScore;
    }
    for (var d = 0; d < decorations.length; d++) {
         decorations[d].x -= 1;
         flappyCtx.drawImage(decorations[d].img, decorations[d].x, decorations[d].y, decorations[d].width, decorations[d].height);
         // Удаляем декор, если он вышел за левую границу
         if (decorations[d].x + decorations[d].width < 0) {
             decorations.splice(d, 1);
             d--;
         }
    }
    // -------------------------

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
            pipe[i].x -= 1.9;
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

            // Проверка коллизий с трубами
            detectCollision(pipe[i], pipeWidth, pipeHeight, constant, birdWidth, birdHeight);

            // Увеличиваем счёт, когда труба пересекла позицию птицы, и считаем её только один раз
            if (!pipe[i].scored && pipe[i].x + pipeWidth < bX) {
                flappyScore++;
                score_audio.play();
                pipe[i].scored = true;
            }

            // Удаление трубы за границей экрана
            if (pipe[i].x + pipeWidth < 0) {
                pipe.splice(i, 1);
                i--;
            }
        }
    }

    // -------------------------
    // Обновляем и отрисовываем монеты
    // -------------------------
    if (!flappyGameOver) {
        // Каждая монета двигается вместе с трубами
        for (var j = 0; j < coins.length; j++) {
            coins[j].x -= 2;
            flappyCtx.drawImage(coinImg, coins[j].x, coins[j].y, coinWidth, coinHeight);

            // Проверка коллизии птицы с монетой
            if (
                bX < coins[j].x + coinWidth &&
                bX + birdWidth > coins[j].x &&
                bY < coins[j].y + coinHeight &&
                bY + birdHeight > coins[j].y
            ) {
                coinCount++;
                coins.splice(j, 1);
                j--;
                continue;
            }

            // Удаляем монету, если она вышла за левую границу
            if (coins[j] && coins[j].x + coinWidth < 0) {
                coins.splice(j, 1);
                j--;
            }
        }

        // Спавн монеты через каждые 5 препятствий
        if (flappyScore > 0 && flappyScore % 5 === 0 && flappyScore !== lastCoinSpawnScore) {
            spawnCoin();
            lastCoinSpawnScore = flappyScore;
        }
    }
    // -------------------------

    // Рисуем землю (foreground) с учётом смещения floorOffset
    flappyCtx.drawImage(fg, 0, fixedHeight - fg.height + floorOffset, flappyCvs.width, fg.height);

    // Рисуем птицу
    flappyCtx.drawImage(bird, bX, bY, birdWidth, birdHeight);

    // Гравитация — только если игра не окончена
    if (!flappyGameOver) {
        bY += gravity;
    }

    // Текст счёта (традиционный счёт)
    flappyCtx.fillStyle = "#000";
    flappyCtx.font = "20px Fira Code";
    flappyCtx.fillText("Счет: " + flappyScore, 10, fixedHeight - 20);

    // Отрисовка счётчика монет с изображением (размещено в правом верхнем углу)
    var coinCounterX = flappyCvs.width - 150;
    var coinCounterY = 30;
    flappyCtx.drawImage(coinImg, coinCounterX, coinCounterY, coinWidth, coinHeight);
    flappyCtx.fillText("x " + coinCount, coinCounterX + coinWidth + 10, coinCounterY + coinHeight / 2 + 7);

    // Отрисовка выбора скинов
    // Скины отображаются только до прохождения первого препятствия (flappyScore === 0)
    if (flappyScore < 1) {
        drawCharacterSelection();
    }

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
    let startX = 150;
    let spacing = 80;
    // Вычисляем позицию выбора скинов относительно земли,
    // чтобы они отображались над полом (fg)
    let currentFgHeight = fg.height || 100;
    let charY = fixedHeight - currentFgHeight + floorOffset - 72;

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
    // Сбрасываем монеты и их счёт
    coinCount = 0;
    coins = [];
    lastCoinSpawnScore = 0;
    // Сбрасываем декор и глобальные очереди уникальных изображений
    decorations = [];
    lastDecorationSpawnScore = -1;
    decorationCycleIndex = 0;
    availableProDecor = [];
    availableTextDecor = [];

    for (let i = 0; i < initialPipes; i++) {
        pipe.push({
            x: flappyCvs.width + i * (pipeInterval + 60),
            y: Math.floor(Math.random() * (maxPipeOffset - minPipeOffset + 1)) + minPipeOffset - 220,
            spawnedNext: i === initialPipes - 1 ? false : true
        });
    }
    // Инициализируем декорации по всей ширине экрана
    initDecorations();
    enableAutoFlappyFlight();
}

// Запускаем игру
// При первоначальной загрузке заполняем фон декорациями от левого до правого края
initDecorations();
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



/***********************
 * --- QA Skills ---
 ***********************/
document.addEventListener('DOMContentLoaded', function(){
  // Массив для хранения выбранных навыков
  let selectedSkills = [];
  const skillLinks = document.querySelectorAll('#qa-skills .skill-links a');

  // Восстанавливаем выбор из localStorage
  const savedSelected = localStorage.getItem('selectedSkills');
  if (savedSelected) {
    const savedSkillIds = JSON.parse(savedSelected);
    skillLinks.forEach(skill => {
      const skillId = skill.getAttribute('data-skill-id');
      if (savedSkillIds.includes(skillId)) {
        skill.classList.add('selected');
        selectedSkills.push(skill);
      }
    });
    updateCounters();
  }

  // Обработчик клика по навыку
  skillLinks.forEach(function(skill){
    skill.addEventListener('click', function(e){
      e.preventDefault();
      if (skill.classList.contains('selected')) {
        // Если навык уже выбран, снимаем выбор
        skill.classList.remove('selected');
        selectedSkills = selectedSkills.filter(function(item){
          return item !== skill;
        });
        let counter = skill.querySelector('.skill-counter');
        if (counter) {
          counter.textContent = '';
        }
        updateCounters();
        updateSelectedSkillsStorage();
      } else {
        // Ограничение выбора: максимум 10 навыков
        if (selectedSkills.length >= 10) {
          alert("Сконцентрируемся на 10 навыках!");
          return;
        }
        // Если лимит не достигнут — выбираем навык
        skill.classList.add('selected');
        selectedSkills.push(skill);
        updateCounters();
        updateSelectedSkillsStorage();
      }
    });
  });

  function updateCounters(){
    selectedSkills.forEach(function(skill, index){
      let counter = skill.querySelector('.skill-counter');
      if (counter) {
        counter.textContent = index + 1;
      }
    });
  }
  function updateSelectedSkillsStorage(){
    let selectedIds = selectedSkills.map(skill => skill.getAttribute('data-skill-id'));
    localStorage.setItem('selectedSkills', JSON.stringify(selectedIds));
  }

  // Обработка кнопки "Получить план изучения"
  const getPlanButton = document.getElementById('get-plan');
  getPlanButton.addEventListener('click', function(){
    if(selectedSkills.length === 0){
      alert('Выбери навык для изучения :)');
      return;
    }
    const studyPlan = document.getElementById('study-plan');
    const planList = document.getElementById('plan-list');
    planList.innerHTML = ''; // Очистка предыдущего содержимого
    // Для каждого выбранного навыка создаём группу: заголовок + список ссылок
    selectedSkills.forEach(function(skill){
      let planLinkData = skill.getAttribute('data-plan');
      let skillName = skill.firstChild.textContent.trim();
      let groupHeader = document.createElement('h3');
      groupHeader.textContent = skillName;
      planList.appendChild(groupHeader);
      let ul = document.createElement('ul');
      // Разбиваем data-plan по разделителю "|"
      let links = planLinkData.split('|');
      links.forEach(function(link){
        let li = document.createElement('li');
        let a = document.createElement('a');
        a.href = link.trim();
        a.textContent = link.trim();
        a.target = '_blank';
        li.appendChild(a);
        ul.appendChild(li);
      });
      planList.appendChild(ul);
    });
    studyPlan.style.display = 'block';
    studyPlan.scrollIntoView({ behavior: 'smooth' });
  });
});

document.addEventListener("DOMContentLoaded", function() {
  const toggleHeader = document.getElementById("toggle-superpower");
  const skillsBlock = document.getElementById("superpower-skills");

  toggleHeader.addEventListener("click", function() {
    // Переключаем отображение блока с навыками
    if (skillsBlock.style.display === "none" || skillsBlock.style.display === "") {
      skillsBlock.style.display = "block";
    } else {
      skillsBlock.style.display = "none";
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const prefix = "index_";
  const sections = Array.from(document.querySelectorAll('#checklist-items .section'));
  const prevBtn  = document.getElementById('prev-section');
  const nextBtn  = document.getElementById('next-section');

  // Восстанавливаем текущую секцию (или 0)
  let current = parseInt(localStorage.getItem(prefix + 'currentSection'), 10);
  if (isNaN(current) || current < 0 || current >= sections.length) {
    current = 0;
  }

  function showSection(idx) {
    sections.forEach((sec, i) => {
      sec.style.display = (i === idx) ? 'block' : 'none';
    });
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === sections.length - 1;
    localStorage.setItem(prefix + 'currentSection', idx);
  }

  prevBtn.addEventListener('click', () => {
    if (current > 0) showSection(--current);
  });
  nextBtn.addEventListener('click', () => {
    if (current < sections.length - 1) showSection(++current);
  });

  // Показываем при инициализации
  showSection(current);
});