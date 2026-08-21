// ==========================================
// 1. 全域變數與 State
// ==========================================
let pdfDoc = null;
let currentLevels = [];      // 儲存當前拆分好的段落/關卡陣列
let currentLevelIndex = 0;   // 當前關卡索引
let startTime = null;
let timerInterval = null;

// ==========================================
// 2. DOM 元素取得
// ==========================================
// Mode Buttons & Panels
const pdfModeBtn = document.getElementById('pdf-mode-btn');
const articleModeBtn = document.getElementById('article-mode-btn');
const pdfModePanel = document.getElementById('pdf-mode');
const articleModePanel = document.getElementById('article-mode');

// PDF Elements
const pdfUrlInput = document.getElementById('pdf-url');
const loadUrlBtn = document.getElementById('load-url-btn');
const pdfUploadInput = document.getElementById('pdf-upload');
const pdfNameDisplay = document.getElementById('pdf-name');
const pdfPagesDisplay = document.getElementById('pdf-pages');
const pageRangeContainer = document.getElementById('page-range-container');
const pdfStartPageInput = document.getElementById('pdf-start-page');
const pdfEndPageInput = document.getElementById('pdf-end-page');
const applyPageRangeBtn = document.getElementById('apply-page-range-btn');
const pdfStatus = document.getElementById('pdf-status');

// Article / Custom Text Elements
const articleSelect = document.getElementById('articleSelect');
const customTextInput = document.getElementById('custom-text-input');
const startCustomTextBtn = document.getElementById('start-custom-text-btn');
const toggleFormBtn = document.getElementById('toggleFormBtn');
const addArticleContainer = document.getElementById('addArticleContainer');
const addAndDownloadBtn = document.getElementById('addAndDownloadBtn');

// Game Elements
const gameArea = document.getElementById('game-area');
const turtleDisplay = document.getElementById('turtle-display');
const turtleTrack = document.getElementById('turtle-track');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const levelSelect = document.getElementById('level-select');
const levelDisplay = document.getElementById('level-display');
const contentTitle = document.getElementById('content-title');
const contentSource = document.getElementById('content-source');
const originalLink = document.getElementById('original-link');
const textDisplay = document.getElementById('text-display');
const typingInput = document.getElementById('typing-input');
const accuracyDisplay = document.getElementById('accuracy');
const wpmDisplay = document.getElementById('wpm');
const progressDisplay = document.getElementById('progress');
const restartBtn = document.getElementById('restart-btn');

// Dictionary Elements
const dictionaryPopup = document.getElementById('dictionary-popup');
const dictionaryClose = document.getElementById('dictionary-close');
const dictionaryWord = document.getElementById('dictionary-word');
const dictionaryPhonetic = document.getElementById('dictionary-phonetic');
const dictionaryAudio = document.getElementById('dictionary-audio');
const dictionaryContent = document.getElementById('dictionary-content');

// ==========================================
// 3. 初始化與模式切換
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initModeSwitching();
    initArticleSection();
    initPDFEvents();
    initTypingEngine();
    initDictionary();
});

function initModeSwitching() {
    pdfModeBtn.addEventListener('click', () => {
        pdfModeBtn.classList.add('active');
        articleModeBtn.classList.remove('active');
        pdfModePanel.classList.remove('hidden');
        articleModePanel.classList.add('hidden');
    });

    articleModeBtn.addEventListener('click', () => {
        articleModeBtn.classList.add('active');
        pdfModeBtn.classList.remove('active');
        articleModePanel.classList.remove('hidden');
        pdfModePanel.classList.add('hidden');
    });
}

// ==========================================
// 4. 烏龜移動與進度更新核心邏輯
// ==========================================
function updateGameStats() {
    const targetText = currentLevels[currentLevelIndex] || "";
    const typedText = typingInput.value;

    // A. 計算打字進度 (Progress)
    const totalLen = targetText.length;
    const typedLen = typedText.length;
    let progressPercent = totalLen > 0 ? Math.min(100, (typedLen / totalLen) * 100) : 0;
    progressDisplay.innerText = `${Math.round(progressPercent)}%`;

    // B. 更新烏龜位置 (0% ~ 95% left)
    const maxLeftPosition = 95; // 避免烏龜超出右側軌道邊界
    const currentLeft = (progressPercent / 100) * maxLeftPosition;
    turtleDisplay.style.left = `${currentLeft}%`;

    // C. 計算正確率 (Accuracy)
    let correctChars = 0;
    for (let i = 0; i < typedLen; i++) {
        if (typedText[i] === targetText[i]) {
            correctChars++;
        }
    }
    const accuracy = typedLen > 0 ? (correctChars / typedLen) * 100 : 100;
    accuracyDisplay.innerText = `${Math.round(accuracy)}%`;

    // D. 計算 WPM (Words Per Minute)
    if (!startTime && typedLen > 0) {
        startTime = new Date();
    }
    if (startTime && typedLen > 0) {
        const timeElapsedMin = (new Date() - startTime) / 60000;
        const wordsTyped = correctChars / 5; // 標準英打 5 字元算 1 word
        const wpm = timeElapsedMin > 0 ? Math.round(wordsTyped / timeElapsedMin) : 0;
        wpmDisplay.innerText = wpm;
    }

    // E. 即時渲染高亮文字 (正確綠色 / 錯誤紅色)
    renderTextComparison(targetText, typedText);
}

function renderTextComparison(target, typed) {
    let html = '';
    for (let i = 0; i < target.length; i++) {
        const char = target[i];
        if (i < typed.length) {
            if (typed[i] === char) {
                html += `<span class="correct" style="color: #2e7d32; background-color: #e8f5e9;">${escapeHTML(char)}</span>`;
            } else {
                html += `<span class="incorrect" style="color: #c62828; background-color: #ffebee;">${escapeHTML(char)}</span>`;
            }
        } else if (i === typed.length) {
            html += `<span class="current" style="border-bottom: 2px solid #2196f3; background-color: #e3f2fd;">${escapeHTML(char)}</span>`;
        } else {
            html += `<span>${escapeHTML(char)}</span>`;
        }
    }
    textDisplay.innerHTML = html;
}

function escapeHTML(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function resetLevelStats() {
    typingInput.value = '';
    startTime = null;
    accuracyDisplay.innerText = '100%';
    wpmDisplay.innerText = '0';
    progressDisplay.innerText = '0%';
    turtleDisplay.style.left = '0%';
    
    if (currentLevels.length > 0) {
        renderTextComparison(currentLevels[currentLevelIndex], '');
    }
}

// ==========================================
// 5. 打字區域與關卡控制事件
// ==========================================
function initTypingEngine() {
    // 監聽輸入框按鍵 input 事件
    typingInput.addEventListener('input', () => {
        updateGameStats();
    });

    // 重來按鈕
    restartBtn.addEventListener('click', () => {
        resetLevelStats();
        typingInput.focus();
    });

    // 關卡切換事件
    prevBtn.addEventListener('click', () => {
        if (currentLevelIndex > 0) {
            loadLevel(currentLevelIndex - 1);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentLevelIndex < currentLevels.length - 1) {
            loadLevel(currentLevelIndex + 1);
        }
    });

    levelSelect.addEventListener('change', (e) => {
        loadLevel(parseInt(e.target.value, 10));
    });
}

function setupGameLevels(textArray, title = "Custom Text", source = "User Input") {
    currentLevels = textArray.filter(text => text.trim().length > 0);
    if (currentLevels.length === 0) return;

    currentLevelIndex = 0;
    contentTitle.innerText = title;
    contentSource.innerText = source;

    // 下拉選單更新
    levelSelect.innerHTML = '';
    currentLevels.forEach((_, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        option.innerText = `Level ${idx + 1}`;
        levelSelect.appendChild(option);
    });
    levelSelect.disabled = false;

    gameArea.classList.remove('hidden');
    loadLevel(0);
}

function loadLevel(index) {
    currentLevelIndex = index;
    levelSelect.value = index;
    levelDisplay.innerText = `Level ${index + 1} / ${currentLevels.length}`;
    
    prevBtn.disabled = (index === 0);
    nextBtn.disabled = (index === currentLevels.length - 1);

    resetLevelStats();
    typingInput.focus();
}

// ==========================================
// 6. PDF 解析與載入邏輯
// ==========================================
function initPDFEvents() {
    // 透過 URL 載入 PDF
    loadUrlBtn.addEventListener('click', () => {
        const url = pdfUrlInput.value.trim();
        if (url) loadPDFFromUrl(url);
    });

    // 透過檔案上傳 PDF
    pdfUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            pdfNameDisplay.innerText = file.name;
            const fileReader = new FileReader();
            fileReader.onload = function () {
                const typedarray = new Uint8Array(this.result);
                loadPDFData(typedarray);
            };
            fileReader.readAsArrayBuffer(file);
        }
    });

    // 套用頁數範圍按鈕
    applyPageRangeBtn.addEventListener('click', () => {
        if (!pdfDoc) return;
        const start = parseInt(pdfStartPageInput.value, 10);
        const end = parseInt(pdfEndPageInput.value, 10);
        extractPDFText(start, end);
    });
}

async function loadPDFFromUrl(url) {
    try {
        pdfStatus.innerText = "Loading PDF...";
        pdfDoc = await pdfjsLib.getDocument(url).promise;
        onPDFLoaded();
    } catch (err) {
        pdfStatus.innerText = "Failed to load PDF: " + err.message;
    }
}

async function loadPDFData(data) {
    try {
        pdfStatus.innerText = "Loading PDF...";
        pdfDoc = await pdfjsLib.getDocument({ data: data }).promise;
        onPDFLoaded();
    } catch (err) {
        pdfStatus.innerText = "Failed to parse PDF: " + err.message;
    }
}

function onPDFLoaded() {
    const numPages = pdfDoc.numPages;
    pdfPagesDisplay.innerText = `(Total: ${numPages} pages)`;
    pdfStartPageInput.max = numPages;
    pdfEndPageInput.max = numPages;
    pdfStartPageInput.value = 1;
    pdfEndPageInput.value = Math.min(5, numPages);
    pageRangeContainer.classList.remove('hidden');
    pdfStatus.innerText = "PDF loaded. Click 'Apply Page Range' to generate levels.";
    
    extractPDFText(1, Math.min(5, numPages));
}

async function extractPDFText(startPage, endPage) {
    pdfStatus.innerText = "Extracting text from PDF...";
    let fullText = '';

    startPage = Math.max(1, startPage);
    endPage = Math.min(pdfDoc.numPages, endPage);

    for (let i = startPage; i <= endPage; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
    }

    // 將內文拆分成段落（按雙換行或適當長度）
    const paragraphs = fullText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 20);
    
    if (paragraphs.length > 0) {
        pdfStatus.innerText = `Successfully extracted ${paragraphs.length} levels!`;
        setupGameLevels(paragraphs, pdfNameDisplay.innerText || "PDF Article", "PDF File");
    } else {
        pdfStatus.innerText = "No readable text found in the selected page range.";
    }
}

// ==========================================
// 7. 文章模式與自訂文本邏輯
// ==========================================
function initArticleSection() {
    // 開始自訂打字練習按鈕
    startCustomTextBtn.addEventListener('click', () => {
        const rawText = customTextInput.value.trim();
        if (!rawText) return;

        // 將輸入文章依據段落拆分為關卡
        const paragraphs = rawText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
        setupGameLevels(paragraphs, "Custom Article", "User Input");
    });

    // 展開/折疊新增文章區塊
    toggleFormBtn?.addEventListener('click', () => {
        if (addArticleContainer.style.display === 'none') {
            addArticleContainer.style.display = 'block';
        } else {
            addArticleContainer.style.display = 'none';
        }
    });

    // 下載 articles.json 邏輯
    addAndDownloadBtn?.addEventListener('click', () => {
        const title = document.getElementById('newTitle').value.trim();
        const content = document.getElementById('newContent').value.trim();

        if (!title || !content) {
            alert('請填寫標題與內容！');
            return;
        }

        const newArticle = { id: Date.now(), title, content };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify([newArticle], null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "articles.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });
}

// ==========================================
// 8. 字典彈窗與單字查詢功能
// ==========================================
function initDictionary() {
    // 雙擊文字區域查字典
    textDisplay.addEventListener('dblclick', () => {
        const selection = window.getSelection().toString().trim();
        // 確保選取的是單個英文單字
        if (selection && /^[a-zA-Z]+$/.test(selection)) {
            fetchWordDefinition(selection);
        }
    });

    dictionaryClose.addEventListener('click', () => {
        dictionaryPopup.classList.add('hidden');
    });
}

async function fetchWordDefinition(word) {
    dictionaryWord.innerText = word;
    dictionaryPhonetic.innerText = "查詢中...";
    dictionaryContent.innerText = "正在載入字典資料...";
    dictionaryPopup.classList.remove('hidden');

    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!response.ok) throw new Error("Word not found");

        const data = await response.json();
        const entry = data[0];

        // 讀音
        const phonetic = entry.phonetic || (entry.phonetics.find(p => p.text)?.text) || '';
        dictionaryPhonetic.innerText = phonetic;

        // 發音音訊
        const audioUrl = entry.phonetics.find(p => p.audio && p.audio.length > 0)?.audio;
        if (audioUrl) {
            dictionaryAudio.style.display = 'inline-block';
            dictionaryAudio.onclick = () => new Audio(audioUrl).play();
        } else {
            dictionaryAudio.style.display = 'none';
        }

        // 解釋
        let meaningsHTML = '';
        entry.meanings.forEach(m => {
            meaningsHTML += `<p><strong>[${m.partOfSpeech}]</strong> ${m.definitions[0].definition}</p>`;
        });
        dictionaryContent.innerHTML = meaningsHTML;

    } catch (err) {
        dictionaryPhonetic.innerText = '';
        dictionaryAudio.style.display = 'none';
        dictionaryContent.innerText = "找不到該單字的定義。";
    }
}
