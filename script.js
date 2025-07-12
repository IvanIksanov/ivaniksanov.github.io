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
 *  ИГРА FLAPPY BIRD (РОКЕТА) С УРОВНЯМИ
 ****************************************************/
var flappyCvs = document.getElementById("canvas");
var flappyCtx = flappyCvs.getContext("2d");

var fixedHeight = 412;
// Смещение земли
var floorOffset = 100;

// ФИЗИКА РАКЕТЫ
var velocity = 0;                  // текущая скорость по вертикали
var thrustAcceleration = -0.2;     // ускорение ракеты при включённом двигателе (вверх)
var gravityAcceleration = 0.1;     // ускорение при гравитации (вниз) — уменьшили, чтобы ракета падала медленнее
var maxFallSpeed = 5;              // максимальная скорость падения
var maxRiseSpeed = -5;             // максимальная скорость подъёма
var isThrusting = false;           // флаг, горит ли двигатель

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
// убрали старую gravity
var flappyScore = 0;
var pipeInterval = 290;

// Флаги и структуры
var flappyGameOver = false;
var autoFlight = true;
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
        if (flappyScore >= levelThresholds[i]) newLevel = i + 1;
    }
    if (newLevel !== currentLevel) {
        currentLevel = newLevel;
        updateDecorationsColor();
    }
    const lvl = levels[currentLevel];
    pipeUp.src = lvl.pipeUpSrc;
    pipeBottom.src = lvl.pipeBottomSrc;
    fg.src = lvl.fgSrc;
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
});
document.addEventListener("keyup", function(event) {
    if (event.code === "Space") isThrusting = false;
});
flappyCvs.addEventListener("mousedown", function() { disableAutoFlight(); isThrusting = true; });
flappyCvs.addEventListener("mouseup",   function() { isThrusting = false; });
flappyCvs.addEventListener("touchstart",function(e){ e.preventDefault(); disableAutoFlight(); isThrusting = true; });
flappyCvs.addEventListener("touchend",  function(e){ e.preventDefault(); isThrusting = false; });
flappyCvs.addEventListener("click", function(e) {
    const rect = flappyCvs.getBoundingClientRect();
    const clickX = e.clientX - rect.left, clickY = e.clientY - rect.top;
    if (flappyGameOver) {
        const rw=100, rh=130, rx=(flappyCvs.width-rw)/2, ry=(fixedHeight-rh)/2;
        if (clickX>=rx&&clickX<=rx+rw&&clickY>=ry&&clickY<=ry+rh) resetGame();
        return;
    }
    for (let char of selectableCharacters) {
        if (clickX>=char.x&&clickX<=char.x+char.width&&clickY>=char.y&&clickY<=char.y+char.height) {
            disableAutoFlight(); bird.src=char.src; break;
        }
    }
});

// Автопилот
function enableAutoFlappyFlight() { autoFlight = true; }
function disableAutoFlight()       { autoFlight = false; }

// Спавн монет и декораций
function spawnCoin() {
    var minY=50, maxY=fixedHeight-fg.height+floorOffset-coinHeight-20;
    var coinY=Math.floor(Math.random()*(maxY-minY+1))+minY;
    coins.push({ x: flappyCvs.width, y: coinY });
}
function loadSvgWithColor(url, color, callback) {
    fetch(url).then(r=>r.text()).then(svgText=>{
        let colored=svgText.replace(/#FEFEFE/gi,color);
        let blob=new Blob([colored],{ type:"image/svg+xml"});
        callback(URL.createObjectURL(blob));
    }).catch(()=>callback(url));
}
function spawnDecoration(optionalX) {
    var startX = optionalX!==undefined?optionalX:flappyCvs.width;
    if (!availableTextDecor.length) availableTextDecor = shuffleArray(commonDecorations.filter(s=>s.includes('_text')));
    if (!availableProDecor.length)  availableProDecor  = shuffleArray(commonDecorations.filter(s=>s.includes('_pro')));
    var pattern=['pro','pro','pro','text','pro','pro','pro','text'];
    var type=pattern[decorationCycleIndex%pattern.length];
    decorationCycleIndex++;
    let srcList=type==='text'?availableTextDecor:availableProDecor;
    let chosen=srcList.shift()|| (type==='text'?availableProDecor.shift():availableTextDecor.shift());
    if(!chosen)return;
    let dw=chosen.includes('_text')?300:150, dh=chosen.includes('_text')?180:250;
    let minY=10, bottomMargin=chosen.includes('_text')?100:50;
    let maxY=fixedHeight-fg.height+floorOffset-dh-bottomMargin;
    let decorY=Math.floor(Math.random()*(maxY-minY+1))+minY;
    loadSvgWithColor(chosen, levels[currentLevel].decorColor, function(url){
        let img=new Image(); img.src=url;
        decorations.push({ x:startX, y:decorY, img, width:dw, height:dh, originalSrc:chosen });
    });
}
function initDecorations() {
    decorations=[]; let spacing=400;
    for (let x=0; x<flappyCvs.width; x+=spacing) spawnDecoration(x);
    lastDecorationSpawnScore=0;
}

// Коллизии
function detectCollision(pObj,pW,pH,constant,bW,bH) {
    if ((bX+bW>pObj.x&&bX<pObj.x+pW&&(bY<pObj.y+pH||bY+bH>pObj.y+constant))
        || (bY+bH>=fixedHeight-fg.height+floorOffset)) {
        flappyGameOver=true;
    }
}

let prevError = 0;

// Главный цикл отрисовки
function drawFlappy() {
    updateLevel();
    flappyCtx.fillStyle = levels[currentLevel].backgroundColor;
    flappyCtx.fillRect(0,0,flappyCvs.width,fixedHeight);

    // Декор
    if (!flappyGameOver && flappyScore%3===0 && flappyScore!==lastDecorationSpawnScore) {
        spawnDecoration(); lastDecorationSpawnScore=flappyScore;
    }
    decorations.forEach((d,i)=>{
        d.x-=1; flappyCtx.drawImage(d.img,d.x,d.y,d.width,d.height);
        if (d.x+d.width<0) decorations.splice(i,1);
    });

    // Трубы и счёт
    const pipeW=72, pipeH=320, bW=100, bH=55;
    for (let i=0;i<pipe.length;i++){
        constant=pipeH+gap;
        flappyCtx.drawImage(pipeUp,pipe[i].x,pipe[i].y,pipeW,pipeH);
        flappyCtx.drawImage(pipeBottom,pipe[i].x,pipe[i].y+constant,pipeW,pipeH);
        if (!flappyGameOver) {
            pipe[i].x-=1.9;
            if (!pipe[i].spawnedNext && pipe[i].x<flappyCvs.width-pipeInterval){
                pipe.push({ x:flappyCvs.width,
                            y:Math.floor(Math.random()*(maxPipeOffset-minPipeOffset+1))+minPipeOffset-220,
                            spawnedNext:false, scored:false });
                pipe[i].spawnedNext=true;
            }
            detectCollision(pipe[i],pipeW,pipeH,constant,bW,bH);
            if(!pipe[i].scored && pipe[i].x+pipeW<bX){
                flappyScore++; score_audio.play(); pipe[i].scored=true;
            }
            if(pipe[i].x+pipeW<0){ pipe.splice(i,1); i--; }
        }
    }

    // Монеты
    if(!flappyGameOver){
        coins.forEach((c,i)=>{
            c.x-=2; flappyCtx.drawImage(coinImg,c.x,c.y,coinWidth,coinHeight);
            if(bX<c.x+coinWidth&&bX+bW>c.x&&bY<c.y+coinHeight&&bY+bH>c.y){
                coinCount++; coins.splice(i,1);
            } else if(c.x+coinWidth<0) coins.splice(i,1);
        });
        if(flappyScore>0 && flappyScore%5===0 && flappyScore!==lastCoinSpawnScore){
            spawnCoin(); lastCoinSpawnScore=flappyScore;
        }
    }

// Земля
flappyCtx.drawImage(fg, 0, fixedHeight - fg.height + floorOffset, flappyCvs.width, fg.height);

// --- ФИЗИКА И УПРОЩЁННЫЙ АВТОПИЛОТ/РУЧНОЕ ---
if (!flappyGameOver) {
    if (autoFlight) {
        // 1) ближайшая труба
        const nextPipe = pipe.find(p => p.x + pipeW >= bX);
        // 2) цель — середина отверстия
        let targetCenter = fixedHeight / 2;
        if (nextPipe) {
            const gapTop = nextPipe.y + pipeH;
            targetCenter = gapTop + gap / 2;
        }
        // 3) ошибка по вертикали
        const birdCenter = bY + bH / 2;
        const error = targetCenter - birdCenter;
        // 4) желаемая скорость пропорционально ошибке
        const DESIRED_FACTOR = 0.04;
        const desiredVel = error * DESIRED_FACTOR;
        // 5) мягкое сглаживание: 10% к новому
        const SMOOTH = 0.04;
        velocity += (desiredVel - velocity) * SMOOTH;
    } else {
        // ручное управление — без изменений
        if (isThrusting) velocity += thrustAcceleration;
        else            velocity += gravityAcceleration;
    }

    // 6) ограничиваем скорость и обновляем Y
    velocity = Math.max(Math.min(velocity, maxFallSpeed), maxRiseSpeed);
    bY += velocity;
}

    // Поворот ракеты
    flappyCtx.save();
    let angle = velocity*0.12;
    flappyCtx.translate(bX+bW/2,bY+bH/2);
    flappyCtx.rotate(angle);
    flappyCtx.drawImage(bird,-bW/2,-bH/2,bW,bH);
    flappyCtx.restore();

    // Счёт и монетки
    flappyCtx.fillStyle="#000"; flappyCtx.font="20px Fira Code";
    flappyCtx.fillText("Счет: "+flappyScore,10,fixedHeight-20);
    let cx=flappyCvs.width-150, cy=30;
    flappyCtx.drawImage(coinImg,cx,cy,coinWidth,coinHeight);
    flappyCtx.fillText("x "+coinCount,cx+coinWidth+10,cy+coinHeight/2+7);

    // Скины
    if(flappyScore<1) drawCharacterSelection();

    // Рестарт
    if(flappyGameOver){
        const rw=240,rh=180,rx=(flappyCvs.width-rw)/2,ry=(fixedHeight-rh)/2;
        flappyCtx.drawImage(restartImg,rx,ry,rw,rh);
    }

    requestAnimationFrame(drawFlappy);
}

// Скины
function drawCharacterSelection(){
    let startX=150, spacing=80;
    let cfh=fg.height||100;
    let charY=fixedHeight-cfh+floorOffset-72;
    selectableCharacters.forEach(char=>{
        flappyCtx.drawImage(char.imageObj,startX,charY,char.width,char.height);
        char.x=startX; char.y=charY;
        startX+=spacing;
    });
}

// Сброс игры
function resetGame(){
    flappyGameOver=false; flappyScore=0; bX=160; bY=150;
    pipe=[]; coinCount=0; coins=[]; lastCoinSpawnScore=0;
    decorations=[]; lastDecorationSpawnScore=-1; decorationCycleIndex=0;
    availableProDecor=[]; availableTextDecor=[];
    for(let i=0;i<initialPipes;i++){
        pipe.push({
            x:flappyCvs.width+i*(pipeInterval+60),
            y:Math.floor(Math.random()*(maxPipeOffset-minPipeOffset+1))+minPipeOffset-220,
            spawnedNext:i===initialPipes-1?false:true, scored:false
        });
    }
    initDecorations();
    enableAutoFlappyFlight();
}

// Запуск
initDecorations();
enableAutoFlappyFlight();
drawFlappy();


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