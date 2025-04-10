let words = [];
let currentWordIndex = 0;
let timer = null;
let baseDelay = 60000 / 300; // по умолчанию 300 WPM
let isPlaying = false;      // активен ли режим скорочтения (пробел зажат)
let isSpaceDown = false;    // флаг зажатости пробела
let isEditorActive = false; // активен ли редактор чтения
let selectedWordIndex = 0;  // индекс выбранного слова для продолжения

const wordDisplay = document.getElementById("wordDisplay");
const editorOverlay = document.getElementById("editorOverlay");
const editorContent = document.getElementById("editorContent");

// Глобальный массив со всеми созданными span-элементами редактора
let editorSpans = [];

// Элементы настроек (шторки)
const speedRange = document.getElementById("speedRange");
const speedDisplay = document.getElementById("speedDisplay");
const fontSelect = document.getElementById("fontSelect");
const fontSizeInput = document.getElementById("fontSize");
const hamburgerBtn = document.getElementById("hamburgerBtn");
const closeDrawerBtn = document.getElementById("closeDrawerBtn");
const settingsDrawer = document.getElementById("settingsDrawer");

// Обновление скорости воспроизведения
speedRange.addEventListener("input", function() {
  let wpm = parseInt(this.value);
  baseDelay = 60000 / wpm;
  speedDisplay.textContent = wpm;
});

// Обновление стилей шрифта и размера
function updateDisplayStyles() {
  const fontFamily = fontSelect.value;
  const fontSize = fontSizeInput.value + "px";
  wordDisplay.style.fontFamily = fontFamily;
  wordDisplay.style.fontSize = fontSize;
  editorContent.style.fontFamily = fontFamily;
  editorContent.style.fontSize = fontSize;
}
fontSelect.addEventListener("change", updateDisplayStyles);
fontSizeInput.addEventListener("change", updateDisplayStyles);

// Обработка загрузки файла (поддерживаются txt, epub, pdf, fb2, mobi)
document.getElementById("fileInput").addEventListener("change", function(e) {
  let file = e.target.files[0];
  if (file) {
    let fileName = file.name.toLowerCase();
    if (fileName.endsWith(".txt")) {
      let reader = new FileReader();
      reader.onload = function(e) {
        processText(e.target.result);
      }
      reader.readAsText(file, "UTF-8");
    } else if (fileName.endsWith(".epub")) {
      processEpub(file);
    } else if (fileName.endsWith(".pdf")) {
      processPdf(file);
    } else if (fileName.endsWith(".fb2")) {
      processFb2(file);
    } else if (fileName.endsWith(".mobi")) {
      processMobi(file);
    } else {
      alert("Неподдерживаемый формат. Загрузите .txt, .epub, .pdf, .fb2 или .mobi");
    }
  }
});

// Разбивка полного текста на слова и однократное построение редактора
function processText(fullText) {
  words = fullText.split(/\s+/).filter(word => word.length > 0);
  currentWordIndex = 0;
  updateDisplayStyles();
  if (words.length > 0) {
    showWord(words[currentWordIndex]);
  }
  // Строим редактор чтения один раз
  editorContent.innerHTML = "";
  editorSpans = [];
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < words.length; i++) {
    const span = document.createElement("span");
    span.textContent = words[i] + " ";
    span.setAttribute("data-index", i);
    span.addEventListener("click", function() {
      editorSpans.forEach(s => s.classList.remove("selected"));
      span.classList.add("selected");
      selectedWordIndex = parseInt(span.getAttribute("data-index"));
    });
    fragment.appendChild(span);
    editorSpans.push(span);
  }
  editorContent.appendChild(fragment);
}

// Обработка epub с использованием epub.js
function processEpub(file) {
  let url = URL.createObjectURL(file);
  let book = ePub(url);
  book.loaded.spine.then(function(spineItems) {
    let promises = spineItems.map(function(item) {
      return item.render().then(function(docFragment) {
        return docFragment.textContent;
      });
    });
    Promise.all(promises).then(function(chaptersText) {
      processText(chaptersText.join(" "));
    }).catch(function(error) {
      console.error("Ошибка чтения epub:", error);
    });
  }).catch(function(error) {
    console.error("Ошибка загрузки epub:", error);
  });
}

// Обработка PDF с использованием pdf.js
function processPdf(file) {
  let reader = new FileReader();
  reader.onload = function(e) {
    let arrayBuffer = e.target.result;
    pdfjsLib.getDocument({data: arrayBuffer}).promise.then(function(pdf) {
      let numPages = pdf.numPages;
      let pagePromises = [];
      for (let i = 1; i <= numPages; i++) {
        pagePromises.push(pdf.getPage(i).then(function(page) {
          return page.getTextContent().then(function(textContent) {
            return textContent.items.map(item => item.str).join(" ");
          });
        }));
      }
      Promise.all(pagePromises).then(function(pagesText) {
        processText(pagesText.join(" "));
      }).catch(function(error) {
        console.error("Ошибка обработки PDF-страниц:", error);
      });
    }).catch(function(error) {
      console.error("Ошибка чтения PDF:", error);
    });
  }
  reader.readAsArrayBuffer(file);
}

// Обработка fb2 (XML)
function processFb2(file) {
  let reader = new FileReader();
  reader.onload = function(e) {
    let fullText = e.target.result;
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(fullText, "application/xml");
    let bodies = xmlDoc.getElementsByTagName("body");
    let textContent = "";
    if (bodies.length > 1) {
      textContent = bodies[1].textContent;
    } else if (bodies.length === 1) {
      textContent = bodies[0].textContent;
    }
    processText(textContent);
  }
  reader.readAsText(file, "UTF-8");
}

// Обработка mobi (экспериментально)
function processMobi(file) {
  let reader = new FileReader();
  reader.onload = function(e) {
    let arrayBuffer = e.target.result;
    try {
      let decoder = new TextDecoder("utf-8");
      let text = decoder.decode(arrayBuffer);
      let cleanText = text.replace(/[^\x20-\x7E\s]+/g, " ");
      processText(cleanText);
    } catch (error) {
      console.error("Ошибка чтения mobi:", error);
    }
  }
  reader.readAsArrayBuffer(file);
}

// Показ слова с анимацией
function showWord(word) {
  wordDisplay.classList.remove("fade");
  void wordDisplay.offsetWidth; // reflow для сброса анимации
  wordDisplay.textContent = word;
  wordDisplay.classList.add("fade");
  updateDisplayStyles();
  // Обновляем выбранное слово как последнее отображённое
  selectedWordIndex = currentWordIndex;
}

// Режим скорочтения: показываем следующее слово
function displayNextWord() {
  if (!isPlaying || isEditorActive) return;
  if (currentWordIndex >= words.length) {
    isPlaying = false;
    return;
  }
  showWord(words[currentWordIndex]);
  currentWordIndex++;
  timer = setTimeout(displayNextWord, baseDelay);
}

// Запуск и пауза скорочтения
function startReading() {
  if (!isPlaying && !isEditorActive && words.length > 0) {
    isPlaying = true;
    displayNextWord();
  }
}
function pauseReading() {
  isPlaying = false;
  clearTimeout(timer);
}

// Показываем редактор с уже сформированным содержимым и обновляем выделение
function showEditorOverlay() {
  isEditorActive = true;
  editorOverlay.style.display = "block";
  // Всегда устанавливаем выбранное слово как последнее показанное слово
  selectedWordIndex = Math.max(0, currentWordIndex - 1);
  editorSpans.forEach(span => span.classList.remove("selected"));
  if (editorSpans[selectedWordIndex]) {
    editorSpans[selectedWordIndex].classList.add("selected");
    scrollToSelectedWord();
  }
}

// Скрываем редактор
function hideEditorOverlay() {
  isEditorActive = false;
  editorOverlay.style.display = "none";
}

// Прокручиваем так, чтобы выделенный элемент был виден
function scrollToSelectedWord() {
  let selected = editorContent.querySelector("span.selected");
  if (selected) {
    selected.scrollIntoView({behavior: "smooth", block: "center"});
  }
}

// Управление шторкой настроек
function showSettingsDrawer() {
  settingsDrawer.style.display = "block";
}
function hideSettingsDrawer() {
  settingsDrawer.style.display = "none";
}

// Обработчики кнопок шторки
hamburgerBtn.addEventListener("click", function() {
  if (settingsDrawer.style.display === "none" || settingsDrawer.style.display === "") {
    showSettingsDrawer();
  } else {
    hideSettingsDrawer();
  }
});
closeDrawerBtn.addEventListener("click", hideSettingsDrawer);

// Обработка нажатия и отпускания пробела (для десктопа)
document.addEventListener("keydown", function(e) {
  if (e.code === "Space") {
    e.preventDefault(); // предотвращаем прокрутку
    isSpaceDown = true;
    // Если редактор активен, обновляем currentWordIndex из выбранного слова и скрываем редактор
    if (isEditorActive) {
      hideEditorOverlay();
      currentWordIndex = selectedWordIndex;
    }
    hideSettingsDrawer();
    if (!isPlaying) {
      startReading();
    }
  }
});
document.addEventListener("keyup", function(e) {
  if (e.code === "Space") {
    isSpaceDown = false;
    pauseReading();
    // При отпускании пробела сразу показываем редактор без задержек
    showEditorOverlay();
  }
});

// Обработка тапа для мобильных устройств
document.addEventListener("touchstart", function(e) {
  e.preventDefault(); // предотвращаем нежелательное поведение (например, прокрутку)
  isSpaceDown = true;
  if (isEditorActive) {
    hideEditorOverlay();
    currentWordIndex = selectedWordIndex;
  }
  hideSettingsDrawer();
  if (!isPlaying) {
    startReading();
  }
});
document.addEventListener("touchend", function(e) {
  isSpaceDown = false;
  pauseReading();
  showEditorOverlay();
});