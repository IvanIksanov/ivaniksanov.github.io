
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




/***********************
 * --- QA Skills ---
 ***********************/
document.addEventListener('DOMContentLoaded', function(){
  // Массив для хранения выбранных навыков
  let selectedSkills = [];
  const skillLinks = document.querySelectorAll('#qa-skills .skill-links a');
  const defaultSkillIds = [
    'test-design',
    'postman',
    'charles',
    'rest-api',
    'MySQL',
    'dbeaver',
    'jira',
    'java',
    'OOP',
    'selenium'
  ];

  // Восстанавливаем выбор из localStorage
  const savedSelected = localStorage.getItem('selectedSkills');
  let savedSkillIds = [];
  let hasSavedSelection = false;
  if (savedSelected) {
    try {
      const parsed = JSON.parse(savedSelected);
      if (Array.isArray(parsed) && parsed.length > 0) {
        savedSkillIds = parsed;
        hasSavedSelection = true;
      }
    } catch (e) {
      hasSavedSelection = false;
    }
  }
  if (!hasSavedSelection) {
    savedSkillIds = defaultSkillIds;
    localStorage.setItem('selectedSkills', JSON.stringify(savedSkillIds));
    localStorage.setItem('showStudyPlan', 'true');
  }
  skillLinks.forEach(skill => {
    const skillId = skill.getAttribute('data-skill-id');
    if (savedSkillIds.includes(skillId)) {
      skill.classList.add('selected');
      selectedSkills.push(skill);
    }
  });
  updateCounters();

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
        // Ограничение выбора: максимум 20 навыков
        if (selectedSkills.length >= 20) {
          alert("Сконцентрируемся на 20 навыках!");
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

  const studyPlan = document.getElementById('study-plan');
  const planList = document.getElementById('plan-list');
  const shouldShowPlan = localStorage.getItem('showStudyPlan') === 'true';
  if (shouldShowPlan && selectedSkills.length > 0) {
    renderStudyPlan(false);
  }

  // Обработка кнопки "Получить план изучения"
  const getPlanButton = document.getElementById('get-plan');
  getPlanButton.addEventListener('click', function(){
    if(selectedSkills.length === 0){
      alert('Выбери навык для изучения :)');
      return;
    }
    localStorage.setItem('showStudyPlan', 'true');
    renderStudyPlan(true);
  });

  function renderStudyPlan(shouldScroll) {
    planList.innerHTML = '';
    const visitedKey = 'studyPlanVisitedLinks';
    const visitedMap = loadVisitedLinks(visitedKey);
    selectedSkills.forEach(function(skill){
      let planLinkData = skill.getAttribute('data-plan') || '';
      let skillName = skill.firstChild.textContent.trim();
      let skillId = skill.getAttribute('data-skill-id') || '';

      let group = document.createElement('div');
      group.className = 'plan-group';
      if (skillId === 'java') {
        group.classList.add('plan-group-java');
      }

      let groupHeader = document.createElement('h3');
      groupHeader.textContent = skillName;
      group.appendChild(groupHeader);

      let grid = document.createElement('div');
      grid.className = 'plan-grid';

      let links = planLinkData.split('|');
      links.forEach(function(link, index){
        let url = link.trim();
        if (!url) return;

        let parsed = parseResourceUrl(url);
        let typeLabel = getResourceType(parsed);

        let card = document.createElement('a');
        card.href = url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.className = 'resource-card';
        card.dataset.url = url;
        card.dataset.type = typeLabel;
        if (visitedMap[url]) {
          card.classList.add('is-visited');
        }
        if (skillId === 'java') {
          card.classList.add('resource-java');
        }

        let top = document.createElement('div');
        top.className = 'resource-top';

        let number = document.createElement('span');
        number.className = 'resource-number';
        number.textContent = index + 1;

        let type = document.createElement('span');
        type.className = 'resource-type';
        type.textContent = typeLabel;

        let visited = document.createElement('span');
        visited.className = 'resource-visited';
        visited.textContent = 'Открыто';

        top.appendChild(number);
        top.appendChild(type);
        top.appendChild(visited);

        let title = document.createElement('div');
        title.className = 'resource-title';
        title.textContent = parsed.displayHost || parsed.fallback;

        let subtitle = document.createElement('div');
        subtitle.className = 'resource-subtitle';
        subtitle.textContent = parsed.displayPath || parsed.fallback;

        card.appendChild(top);
        card.appendChild(title);
        card.appendChild(subtitle);

        card.addEventListener('click', function(){
          visitedMap[url] = true;
          saveVisitedLinks(visitedKey, visitedMap);
          card.classList.add('is-visited');
        });

        grid.appendChild(card);
      });

      group.appendChild(grid);
      planList.appendChild(group);
    });
    studyPlan.style.display = 'block';
    if (shouldScroll) {
      studyPlan.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function parseResourceUrl(url) {
    try {
      let parsed = new URL(url);
      let host = parsed.hostname.replace(/^www\./, '');
      let path = parsed.pathname.replace(/\/$/, '');
      let displayPath = path ? host + path : host;
      return {
        hostname: host,
        pathname: parsed.pathname || '',
        displayHost: host,
        displayPath: displayPath,
        fallback: url
      };
    } catch (e) {
      return { hostname: '', pathname: '', displayHost: url, displayPath: url, fallback: url };
    }
  }

  function loadVisitedLinks(key) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  function saveVisitedLinks(key, map) {
    localStorage.setItem(key, JSON.stringify(map));
  }

  function getResourceType(resource) {
    const host = (resource.hostname || '').toLowerCase();
    const path = (resource.pathname || '').toLowerCase();
    const videoHosts = [
      'youtube.com',
      'youtu.be',
      'rutube.ru',
      'vk.com',
      'vimeo.com',
      'live.dzen.ru'
    ];
    const trainerHosts = [
      'stepik.org',
      'karpov.courses',
      'sql-academy.org',
      'mystery.knightlab.com',
      'edclub.com',
      'keybr.com',
      'klava.org',
      'duolingo.com',
      'puzzle-english.com',
      'puzzle-movies.com',
      'learngitbranching.js.org',
      'hacksplaining.com'
    ];
    const postHosts = [
      't.me',
      'telegram.me',
      'set.ki'
    ];
    const courseHosts = [
      'stepik.org',
      'karpov.courses'
    ];
    const courseHostSuffixes = [
      '.teachable.com'
    ];

    if (videoHosts.some((item) => host === item || host.endsWith('.' + item))) {
      return 'Видео';
    }
    if (postHosts.some((item) => host === item || host.endsWith('.' + item))) {
      return 'Пост';
    }
    if (
      courseHosts.some((item) => host === item || host.endsWith('.' + item)) ||
      courseHostSuffixes.some((item) => host.endsWith(item)) ||
      host.includes('course') ||
      path.includes('course')
    ) {
      return 'Курс';
    }
    if (trainerHosts.some((item) => host === item || host.endsWith('.' + item))) {
      return 'Тренажер';
    }
    return 'Статья';
  }
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

document.addEventListener("DOMContentLoaded", function() {
  const smoothTargets = [
    { hash: "#plan-list", id: "plan-list" },
    { hash: "#tg-links", id: "tg-links" }
  ];

  smoothTargets.forEach(function(target) {
    const section = document.getElementById(target.id);
    if (!section) return;

    const anchors = document.querySelectorAll(`.skills-cover a[href="${target.hash}"]`);
    anchors.forEach(function(anchor) {
      anchor.addEventListener("click", function(e) {
        e.preventDefault();
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });
});


// --- КАРУСЕЛЬ ИЗОБРАЖЕНИЙ ---
document.addEventListener('DOMContentLoaded', function () {
    let currentIndex = 0;
    const items = document.querySelectorAll('.carousel-images .carousel-item');
    if (!items.length) return;
    let autoRotateId = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    function showImage(index) {
        items.forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
    }

    function startAutoRotate() {
        stopAutoRotate();
        autoRotateId = setInterval(function() {
            currentIndex = (currentIndex + 1) % items.length;
            showImage(currentIndex);
        }, 8000);
    }

    function stopAutoRotate() {
        if (autoRotateId) {
            clearInterval(autoRotateId);
            autoRotateId = null;
        }
    }

    document.getElementById('prev').addEventListener('click', function() {
        console.log("Кнопка Назад нажата"); // Лог для отладки
        currentIndex = (currentIndex > 0) ? currentIndex - 1 : items.length - 1;
        showImage(currentIndex);
        startAutoRotate();
    });

    document.getElementById('next').addEventListener('click', function() {
        console.log("Кнопка Вперед нажата"); // Лог для отладки
        currentIndex = (currentIndex < items.length - 1) ? currentIndex + 1 : 0;
        showImage(currentIndex);
        startAutoRotate();
    });

    // Изначально показываем первое изображение
    showImage(currentIndex);
    startAutoRotate();

});

// --- БУРГЕР-МЕНЮ ---
document.addEventListener('DOMContentLoaded', function () {
    const burgerMenu = document.querySelector('.burger-menu');
    const navLinks = document.querySelector('nav ul');

    burgerMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
});
