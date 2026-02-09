/****************************************************
 *  ИГРА FLAPPY BIRD (РОКЕТА) С УРОВНЯМИ
 ****************************************************/
var flappyCvs = document.getElementById("canvas");
// Запретить выделение и двойной тап именно на канвасе
flappyCvs.style.userSelect = "none";
flappyCvs.style.webkitUserSelect = "none";
flappyCvs.style.msUserSelect = "none";
flappyCvs.style.touchAction = "none";
flappyCvs.style.webkitTouchCallout = "none";
var flappyCtx = flappyCvs.getContext("2d");

var fixedHeight = 412;
// Смещение земли
var floorOffset = 100;

// ** ПЕРЕМЕННЫЕ ДЛЯ АНИМАЦИИ СМЕНЫ УРОВНЯ **
let levelSwitching = false;
let levelSwitchStartTime = 0;
const levelSwitchDuration = 400; // длительность в миллисекундах
let nextLevel = 0;

// ФИЗИКА РАКЕТЫ
var velocity = 0;                  // текущая скорость по вертикали
var thrustAcceleration = -0.2;     // ускорение ракеты при включённом двигателе (вверх)
var gravityAcceleration = 0.1;     // ускорение при гравитации (вниз) — уменьшили, чтобы ракета падала медленнее
var maxFallSpeed = 5;              // максимальная скорость падения
var maxRiseSpeed = -5;             // максимальная скорость подъёма
var isThrusting = false;           // флаг, горит ли двигатель

// ** АВТОПИЛОТ **
var autoFlight = true;             // флаг автопилота
function enableAutoFlappyFlight() { autoFlight = true; }
function disableAutoFlight()       { autoFlight = false; }

// Система частиц для IT-терминов
var particles = [];
var particleTerms = ['API', 'GIT', 'QA', 'smoke', 'unit', 'Back', 'manual', 'Фича', 'Баг', 'DEBUG'];
var rocketWidth = 100, rocketHeight = 55; // размеры ракеты для расчёта точки спавна

function spawnParticles() {
    const term = particleTerms[Math.floor(Math.random() * particleTerms.length)];
    const px = bX - 10; // чуть левее ракеты
    const py = bY + rocketHeight / 2;
    // угол разброса от -45 до +45 градусов
    const angle = Math.random() * Math.PI / 2 - Math.PI / 4;
    const speed = Math.random() * 2 + 1; // от 1 до 3
    const vx = -Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    particles.push({ x: px, y: py, vx: vx, vy: vy, life: 30, maxLife: 80, text: term });
}

// Изображения
var bird = new Image();       // будет использоваться как ракета
var fg = new Image();
var pipeUp = new Image();
var pipeBottom = new Image();
var restartImg = new Image();

bird.src = "img/rocket2.png";         // замените на img/rocket.png, когда загрузите
restartImg.src = "img/restart.png";

// Скины (по желанию оставить)
let selectableCharacters = [
    { name: "birdClassic", src: "img/rocket2.png" },
    { name: "birdRed",     src: "img/rocket3.png" },
    { name: "birdBlue",    src: "img/rocket4.png" }
];
selectableCharacters.forEach(char => {
    const img = new Image();
    img.src = char.src;
    char.imageObj = img;
    char.width = 60;
    char.height = 30;
});

// Звуки
var fly = new Audio();
var score_audio = new Audio();
fly.src = "audio/fly.mp3";
score_audio.src = "audio/score.mp3";

// Монеты
var coinCount = 0;
var coins = [];
var lastCoinSpawnScore = 0;
var coinImg = new Image();
coinImg.src = "img/coin.png";
var coinWidth = 30;
var coinHeight = 30;

// Декор
var decorations = [];
var lastDecorationSpawnScore = -1;
var decorationCycleIndex = 0;
var availableProDecor = [];
var availableTextDecor = [];
var decorationWidth = 150;
var decorationHeight = 230;

// Параметры игры
var gap = 190;
var constant;
var bX = 160;
var bY = 150;
var flappyScore = 0;
var pipeInterval = 290;

// Флаги и структуры
var flappyGameOver = false;
var pipe = [];

const initialPipes = 5;
const minPipeOffset = -70;
const maxPipeOffset = 90;
for (let i = 0; i < initialPipes; i++) {
    pipe.push({
        x: flappyCvs.width + i * (pipeInterval + 60),
        y: Math.floor(Math.random() * (maxPipeOffset - minPipeOffset + 1)) + minPipeOffset - 220,
        spawnedNext: i === initialPipes - 1 ? false : true,
        scored: false  // инициализируем scored
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
    let shuffledArray = array.slice();
    for (let i = shuffledArray.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
    }
    return shuffledArray;
}

// Уровни
let levels = [
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
// Перемешиваем порядок уровней при загрузке
levels = shuffleArray(levels);

let currentLevel = 0;

// Функция для обновления уровня и (при необходимости) обновления цвета уже отображаемых декораций
function updateLevel() {
    const levelThresholds = [4, 15, 30, 50, 80, 110, 150, 190, 230, 260];
    let newLevel = 0;
    for (let i = 0; i < levelThresholds.length; i++) {
        if (flappyScore >= levelThresholds[i]) newLevel = i + 1;
    }
    if (newLevel !== currentLevel && !levelSwitching) {
        // Начинаем анимацию смены
        levelSwitching = true;
        levelSwitchStartTime = performance.now();
        nextLevel = newLevel;
    }
    // Если сейчас не в анимации — сразу обновляем спрайты
    if (!levelSwitching) {
        currentLevel = newLevel;
        const lvl = levels[currentLevel];
        pipeUp.src = lvl.pipeUpSrc;
        pipeBottom.src = lvl.pipeBottomSrc;
        fg.src = lvl.fgSrc;
    }
}

function updateDecorationsColor() {
    decorations.forEach(decor => {
        loadSvgWithColor(decor.originalSrc, levels[currentLevel].decorColor, function(newSrc) {
            decor.img.src = newSrc;
        });
    });
}

function resizeFlappyCanvas() {
    flappyCvs.height = fixedHeight;
    flappyCvs.width = flappyCvs.clientWidth;
    pipeInterval = 290;
}
window.addEventListener("resize", resizeFlappyCanvas);
resizeFlappyCanvas();

// УПРАВЛЕНИЕ

// Space — держать для тяги
document.addEventListener("keydown", function(event) {
    if (event.code === "Space") {
        event.preventDefault();
        if (flappyGameOver) {
            resetGame();  // рестарт по пробелу
        } else {
            disableAutoFlight();
            isThrusting = true;
        }
    }
    if (event.code === "ArrowUp") {
        if (!flappyGameOver) {
            enableAutoFlappyFlight();
        }
    }
});
document.addEventListener("keyup", function(event) {
    if (event.code === "Space") isThrusting = false;
});

flappyCvs.addEventListener("pointerdown", function(e) {
    // отключаем автопилот
    disableAutoFlight();
    // включаем тягу
    isThrusting = true;
});

// На любое отпущение — выключаем тягу и эмулируем click
flappyCvs.addEventListener("pointerup", function(e) {
    // выключаем тягу
    isThrusting = false;

    // эмулируем click, чтобы сработал ваш обработчик рестарта/скинов
    const clickEvent = new MouseEvent("click", {
        clientX: e.clientX,
        clientY: e.clientY,
        bubbles: true,
        cancelable: true
    });
    flappyCvs.dispatchEvent(clickEvent);
});

// Одинарный клик — рестарт при Game Over или выбор скина
flappyCvs.addEventListener("click", function(e) {
    const rect = flappyCvs.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    if (flappyGameOver) {
        // область рестарта (100×130px в центре)
        const rw = 100, rh = 130;
        const rx = (flappyCvs.width - rw) / 2;
        const ry = (fixedHeight - rh) / 2;
        if (clickX >= rx && clickX <= rx + rw && clickY >= ry && clickY <= ry + rh) {
            resetGame();
        }
        return;
    }

    // выбор скина
    for (let char of selectableCharacters) {
        if (
            clickX >= char.x &&
            clickX <= char.x + char.width &&
            clickY >= char.y &&
            clickY <= char.y + char.height
        ) {
            disableAutoFlight();
            bird.src = char.src;
            break;
        }
    }
});

// Спавн монет и декораций
function spawnCoin() {
    var minY = 50, maxY = fixedHeight - fg.height + floorOffset - coinHeight - 20;
    var coinY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
    coins.push({ x: flappyCvs.width, y: coinY });
}
function loadSvgWithColor(url, color, callback) {
    fetch(url).then(r => r.text()).then(svgText => {
        let colored = svgText.replace(/#FEFEFE/gi, color);
        let blob = new Blob([colored], { type: "image/svg+xml" });
        callback(URL.createObjectURL(blob));
    }).catch(() => callback(url));
}
function spawnDecoration(optionalX) {
    var startX = optionalX !== undefined ? optionalX : flappyCvs.width;
    if (!availableTextDecor.length) availableTextDecor = shuffleArray(commonDecorations.filter(s => s.includes('_text')));
    if (!availableProDecor.length)  availableProDecor  = shuffleArray(commonDecorations.filter(s => s.includes('_pro')));
    var pattern = ['pro','pro','pro','text','pro','pro','pro','text'];
    var type = pattern[decorationCycleIndex % pattern.length];
    decorationCycleIndex++;
    let srcList = type === 'text' ? availableTextDecor : availableProDecor;
    let chosen = srcList.shift() || (type === 'text' ? availableProDecor.shift() : availableTextDecor.shift());
    if (!chosen) return;
    let dw = chosen.includes('_text') ? 300 : 150, dh = chosen.includes('_text') ? 180 : 250;
    let minY = 10, bottomMargin = chosen.includes('_text') ? 100 : 50;
    let maxY = fixedHeight - fg.height + floorOffset - dh - bottomMargin;
    let decorY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
    loadSvgWithColor(chosen, levels[currentLevel].decorColor, function(url) {
        let img = new Image(); img.src = url;
        decorations.push({ x: startX, y: decorY, img, width: dw, height: dh, originalSrc: chosen });
    });
}
function initDecorations() {
    decorations = []; let spacing = 400;
    for (let x = 0; x < flappyCvs.width; x += spacing) spawnDecoration(x);
    lastDecorationSpawnScore = 0;
}

// Коллизии
function detectCollision(pObj, pW, pH, constant, bW, bH) {
    if ((bX + bW > pObj.x && bX < pObj.x + pW && (bY < pObj.y + pH || bY + bH > pObj.y + constant))
        || (bY + bH >= fixedHeight - fg.height + floorOffset)) {
        flappyGameOver = true;
    }
}

let prevError = 0;

// Главный цикл отрисовки
function drawFlappy() {
    // Обработка анимации смены уровня
    let animOffset = 0;
    if (levelSwitching) {
        let now = performance.now();
        let elapsed = now - levelSwitchStartTime;
        const half = levelSwitchDuration / 2;

        if (elapsed < half) {
            // Фаза 1: выезд старых труб
            animOffset = fixedHeight * (elapsed / half);
        } else if (elapsed < levelSwitchDuration) {
            // Фаза 2: заезд новых труб
            if (currentLevel !== nextLevel) {
                // Обновляем спрайты один раз в начале второй фазы
                currentLevel = nextLevel;
                updateDecorationsColor();
                const lvl = levels[currentLevel];
                pipeUp.src = lvl.pipeUpSrc;
                pipeBottom.src = lvl.pipeBottomSrc;
                fg.src = lvl.fgSrc;
            }
            let t2 = (elapsed - half) / half;
            animOffset = fixedHeight * (1 - t2);
        } else {
            // Конец анимации смены
            levelSwitching = false;
            animOffset = 0;
        }
    }

    // Проверяем флаг смены уровня (либо запускаем анимацию, либо ничего не делаем внутри)
    updateLevel();

    // Фон
    flappyCtx.fillStyle = levels[currentLevel].backgroundColor;
    flappyCtx.fillRect(0, 0, flappyCvs.width, fixedHeight);

    // Декор
    if (!flappyGameOver && flappyScore % 3 === 0 && flappyScore !== lastDecorationSpawnScore) {
        spawnDecoration(); lastDecorationSpawnScore = flappyScore;
    }
    decorations.forEach((d, i) => {
        d.x -= 1;
        flappyCtx.drawImage(d.img, d.x, d.y, d.width, d.height);
        if (d.x + d.width < 0) decorations.splice(i, 1);
    });

    // Трубы и счёт
    const pipeW = 72, pipeH = 320, bW = 100, bH = 55;
    for (let i = 0; i < pipe.length; i++) {
        constant = pipeH + gap;
        const px = pipe[i].x;
        const py = pipe[i].y;

        // Верхняя труба с анимацией смещения вверх
        flappyCtx.drawImage(pipeUp, px, py - animOffset, pipeW, pipeH);
        // Нижняя труба с анимацией смещения вниз
        flappyCtx.drawImage(pipeBottom, px, py + constant + animOffset, pipeW, pipeH);

        if (!flappyGameOver) {
            pipe[i].x -= 1.9;
            if (!pipe[i].spawnedNext && pipe[i].x < flappyCvs.width - pipeInterval) {
                pipe.push({
                    x: flappyCvs.width,
                    y: Math.floor(Math.random() * (maxPipeOffset - minPipeOffset + 1)) + minPipeOffset - 220,
                    spawnedNext: false, scored: false
                });
                pipe[i].spawnedNext = true;
            }
            detectCollision(pipe[i], pipeW, pipeH, constant, bW, bH);
            if (!pipe[i].scored && pipe[i].x + pipeW < bX) {
                flappyScore++;
                score_audio.play();
                pipe[i].scored = true;
            }
            if (pipe[i].x + pipeW < 0) { pipe.splice(i, 1); i--; }
        }
    }

    // Монеты
    if (!flappyGameOver) {
        coins.forEach((c, i) => {
            c.x -= 2; flappyCtx.drawImage(coinImg, c.x, c.y, coinWidth, coinHeight);
            if (bX < c.x + coinWidth && bX + bW > c.x && bY < c.y + coinHeight && bY + bH > c.y) {
                coinCount++; coins.splice(i, 1);
            } else if (c.x + coinWidth < 0) coins.splice(i, 1);
        });
        if (flappyScore > 0 && flappyScore % 5 === 0 && flappyScore !== lastCoinSpawnScore) {
            spawnCoin(); lastCoinSpawnScore = flappyScore;
        }
    }

    // Земля
    flappyCtx.drawImage(fg, 0, fixedHeight - fg.height + floorOffset, flappyCvs.width, fg.height);

    // ФИЗИКА И ЧАСТИЦЫ

    if (!flappyGameOver) {
        if (autoFlight) {
            const nextPipe = pipe.find(p => p.x + pipeW >= bX);
            let targetCenter = fixedHeight / 2;
            if (nextPipe) {
                const gapTop = nextPipe.y + pipeH;
                targetCenter = gapTop + gap / 2;
            }
            const birdCenter = bY + bH / 2;
            const error = targetCenter - birdCenter;
            const DESIRED_FACTOR = 0.04;
            const desiredVel = error * DESIRED_FACTOR;
            const SMOOTH = 0.04;
            velocity += (desiredVel - velocity) * SMOOTH;
        } else {
            if (isThrusting) {
                velocity += thrustAcceleration;
                // Спавним частицы при тяге
                for (let i = 0; i < 3; i++) {
                    spawnParticles();
                }
            } else {
                velocity += gravityAcceleration;
            }
        }
        velocity = Math.max(Math.min(velocity, maxFallSpeed), maxRiseSpeed);
        bY += velocity;
    }

    // Обновление и отрисовка частиц
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        flappyCtx.globalAlpha = p.life / p.maxLife;
        flappyCtx.fillStyle = "#FFF";
        flappyCtx.font = "12px Fira Code";
        flappyCtx.fillText(p.text, p.x, p.y);
        if (p.life <= 0) particles.splice(i, 1);
    });
    flappyCtx.globalAlpha = 1; // сброс прозрачности

    // Поворот ракеты
    flappyCtx.save();
    let angle = velocity * 0.12;
    flappyCtx.translate(bX + bW / 2, bY + bH / 2);
    flappyCtx.rotate(angle);
    flappyCtx.drawImage(bird, -bW / 2, -bH / 2, bW, bH);
    flappyCtx.restore();

    // Счёт и монетки
    flappyCtx.fillStyle = "#000"; flappyCtx.font = "20px Fira Code";
    flappyCtx.fillText("Счет: " + flappyScore, 10, fixedHeight - 20);
    let cx = flappyCvs.width - 150, cy = 30;
    flappyCtx.drawImage(coinImg, cx, cy, coinWidth, coinHeight);
    flappyCtx.fillText("x " + coinCount, cx + coinWidth + 10, cy + coinHeight / 2 + 7);

    // Выбор скинов
    if (flappyScore<1) drawCharacterSelection();

    // Рестарт
    if (flappyGameOver) {
        const rw = 240, rh = 180, rx = (flappyCvs.width - rw) / 2, ry = (fixedHeight - rh) / 2;
        flappyCtx.drawImage(restartImg, rx, ry, rw, rh);
    }

    requestAnimationFrame(drawFlappy);
}

// Скины
function drawCharacterSelection() {
    let startX = 150, spacing = 80;
    let cfh = fg.height || 100;
    let charY = fixedHeight - cfh + floorOffset - 72;
    selectableCharacters.forEach(char => {
        flappyCtx.drawImage(char.imageObj, startX, charY, char.width, char.height);
        char.x = startX; char.y = charY;
        startX += spacing;
    });
}

// Сброс игры
function resetGame() {
    // Перемешиваем порядок уровней при рестарте
    levels = shuffleArray(levels);
    flappyGameOver = false; flappyScore = 0; bX = 160; bY = 150;
    pipe = []; coinCount = 0; coins = []; lastCoinSpawnScore = 0;
    decorations = []; lastDecorationSpawnScore = -1; decorationCycleIndex = 0;
    availableProDecor = []; availableTextDecor = [];
    particles = []; // очистка частиц
    for (let i = 0; i < initialPipes; i++) {
        pipe.push({
            x: flappyCvs.width + i * (pipeInterval + 60),
            y: Math.floor(Math.random() * (maxPipeOffset - minPipeOffset + 1)) + minPipeOffset - 220,
            spawnedNext: i === initialPipes - 1 ? false : true, scored: false
        });
    }
    initDecorations();
    enableAutoFlappyFlight();
}

// Запуск
initDecorations();
enableAutoFlappyFlight();
drawFlappy();

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

// --- Чек-лист: выбор проверок ---
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('#checklist-items .skill-link').forEach(function(item) {
    const id = item.dataset.checkId;
    if (localStorage.getItem('check_' + id) === 'true') {
      item.classList.add('selected');
    }
    item.addEventListener('click', function(e) {
      e.preventDefault();
      item.classList.toggle('selected');
      localStorage.setItem('check_' + id, item.classList.contains('selected'));
    });
  });
});

// --- Подсчёт, метки и диаграмма ---
document.addEventListener('DOMContentLoaded', function() {
  const resultsButton = document.getElementById('check-results');
  if (!resultsButton) return;

  resultsButton.addEventListener('click', function() {
    document.querySelectorAll('#checklist-items .mark').forEach(m => m.remove());

    const items = Array.from(document.querySelectorAll('#checklist-items .skill-link'));
    const totalTrueCount = items.filter(i => i.dataset.expected === 'true').length;
    let correctCount = 0;
    let wrongCount = 0;

    items.forEach(item => {
      const expected = item.dataset.expected === 'true';
      const selected = item.classList.contains('selected');

      if (selected) {
        if (expected) correctCount++;
        else wrongCount++;
      }

      const mark = document.createElement('span');
      mark.classList.add('mark');
      if (selected && expected) {
        mark.classList.add('correct');
        mark.textContent = '✔';
      } else if (selected && !expected) {
        mark.classList.add('incorrect');
        mark.textContent = '✖';
      } else if (!selected && !expected) {
        mark.classList.add('unselected');
        mark.textContent = '✖';
      } else if (!selected && expected) {
        mark.classList.add('unselected');
        mark.textContent = '✔';
      }
      item.insertAdjacentElement('afterend', mark);
    });

    const denom = totalTrueCount + wrongCount;
    const percent = denom > 0 ? (correctCount / denom) * 100 : 0;
    const pie = document.getElementById('resultsPie');
    if (pie) {
      pie.style.background = `conic-gradient(green 0% ${percent}%, red ${percent}% 100%)`;
      pie.textContent = `${Math.round(percent)}%`;
    }

    const txt = document.getElementById('resultsText');
    if (!txt) return;
    let message = '';
    if (percent < 20) {
      message = 'У тебя откуда руки растут? Ты пропустил очень много багов в прод. ' +
                'Попробуй внимательно пройти каждую проверку еще раз. Иначе не пройдешь испыталку :(';
    } else if (percent < 50) {
      message = 'Не торопись, тебе есть куда стремиться. ' +
                'Вернись к проверкам, возможно, ты что-то упустил. Не опускай руки!';
    } else if (percent < 80) {
      message = 'Отличная работа — ты нашёл много критических багов! ' +
                'Однако пару моментов всё же пропустил. Большое спасибо за усилия, ' +
                'доработай ещё чуть-чуть и получится идеально. Может быть ты нашел баги в проверках, которые значатся как успешные? В таком случае нужно уточнить требования у аналитика.';
    } else if (percent < 99) {
      message = 'Ура! Ты продемонстрировал высокий уровень тестирования и внимательность. ' +
                'Твой опыт очевиден, и качество покрытия почти идеально. Так держать!';
    } else {
      message = 'Ашалеть! Тестировщик-монстр активирован! Мы вовремя успели протестировать функционал. Ты поможешь завести баг-репорты?';
    }
    txt.textContent = message;
  });
});
