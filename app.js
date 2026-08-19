/* =====================================================
   PDF.JS CONFIGURATION
===================================================== */

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


/* =====================================================
   CHECK JAVASCRIPT
===================================================== */

console.log("✅ app.js loaded successfully!");


/* =====================================================
   DOM ELEMENTS
===================================================== */
// 新增 PDF 頁數控制 DOM
const pdfStartPageInput = document.getElementById("pdf-start-page");
const pdfEndPageInput = document.getElementById("pdf-end-page");
const applyPageRangeBtn = document.getElementById("apply-page-range-btn");
const pageRangeContainer = document.getElementById("page-range-container");

// 全域變數：暫存載入的 PDF Document 物件
let loadedPdfDoc = null;

// Mode buttons
const pdfModeBtn = document.getElementById("pdf-mode-btn");
const articleModeBtn = document.getElementById("article-mode-btn");
const pdfModePanel = document.getElementById("pdf-mode");
const articleModePanel = document.getElementById("article-mode");

// PDF
const pdfUpload = document.getElementById("pdf-upload");
const pdfUrl = document.getElementById("pdf-url");
const loadUrlBtn = document.getElementById("load-url-btn");
const statusText = document.getElementById("pdf-status");

// Game
const gameArea = document.getElementById("game-area");
const textDisplay = document.getElementById("text-display");
const typingInput = document.getElementById("typing-input");
const levelDisplay = document.getElementById("level-display");
const levelSelect = document.getElementById("level-select"); // 新增 Level 選單元素
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const restartBtn = document.getElementById("restart-btn");

// PDF information
const pdfName = document.getElementById("pdf-name");
const pdfPages = document.getElementById("pdf-pages");

// Statistics
const accuracyDisplay = document.getElementById("accuracy");
const wpmDisplay = document.getElementById("wpm");
const progressDisplay = document.getElementById("progress");

// Custom Article Mode
const customTextInput = document.getElementById("custom-text-input");
const startCustomTextBtn = document.getElementById("start-custom-text-btn");
const articleStatusText = document.getElementById("article-status");

/* =====================================================
   DICTIONARY ELEMENTS
===================================================== */

const dictionaryPopup = document.getElementById("dictionary-popup");
const dictionaryWord = document.getElementById("dictionary-word");
const dictionaryPhonetic = document.getElementById("dictionary-phonetic");
const dictionaryAudio = document.getElementById("dictionary-audio");
const dictionaryContent = document.getElementById("dictionary-content");
const dictionaryClose = document.getElementById("dictionary-close");


/* =====================================================
   GAME STATE
===================================================== */

let pdfText = "";
let levels = [];
let currentLevel = 0;
let startTime = null;
let gameFinished = false;
let currentAudio = null;

const CHARS_PER_LEVEL = 500;


/* =====================================================
   MODE SWITCHING
===================================================== */

if (pdfModeBtn && articleModeBtn) {
    pdfModeBtn.addEventListener("click", function () {
        pdfModeBtn.classList.add("active");
        articleModeBtn.classList.remove("active");
        if (pdfModePanel) pdfModePanel.classList.remove("hidden");
        if (articleModePanel) articleModePanel.classList.add("hidden");
    });

    articleModeBtn.addEventListener("click", function () {
        articleModeBtn.classList.add("active");
        pdfModeBtn.classList.remove("active");
        if (articleModePanel) articleModePanel.classList.remove("hidden");
        if (pdfModePanel) pdfModePanel.classList.add("hidden");
    });
}


/* =====================================================
   LOCAL PDF UPLOAD
===================================================== */

if (pdfUpload) {
    pdfUpload.addEventListener("change", async function (event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
            setStatus("❌ 請選擇 PDF 檔案");
            return;
        }

        try {
            setStatus("📖 正在讀取 PDF...");
            const arrayBuffer = await file.arrayBuffer();
            loadedPdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            if (pdfName) pdfName.textContent = file.name;
            if (pdfPages) pdfPages.textContent = `(共 ${loadedPdfDoc.numPages} 頁)`;

            // 初始化頁數輸入框範圍
            setupPageRangeUI(loadedPdfDoc.numPages);

            // 預設讀取全部頁數
            await processPDF(loadedPdfDoc, 1, loadedPdfDoc.numPages);
        } catch (error) {
            console.error("PDF Error:", error);
            setStatus("❌ PDF 讀取失敗：" + error.message);
        }
    });
}

// 設定頁數輸入框範圍與顯示
function setupPageRangeUI(totalPages) {
    if (pdfStartPageInput && pdfEndPageInput && pageRangeContainer) {
        pdfStartPageInput.min = 1;
        pdfStartPageInput.max = totalPages;
        pdfStartPageInput.value = 1;

        pdfEndPageInput.min = 1;
        pdfEndPageInput.max = totalPages;
        pdfEndPageInput.value = totalPages;

        pageRangeContainer.classList.remove("hidden");
    }
}

// 點擊「套用頁數」按鈕時重新擷取文字
if (applyPageRangeBtn) {
    applyPageRangeBtn.addEventListener("click", async function () {
        if (!loadedPdfDoc) {
            setStatus("⚠️ 請先載入 PDF 檔案！");
            return;
        }

        let start = parseInt(pdfStartPageInput.value, 10);
        let end = parseInt(pdfEndPageInput.value, 10);
        const total = loadedPdfDoc.numPages;

        // 頁數邊界檢查
        if (isNaN(start) || start < 1) start = 1;
        if (isNaN(end) || end > total) end = total;
        if (start > end) {
            setStatus("⚠️ 起始頁數不能大於結束頁數！");
            return;
        }

        pdfStartPageInput.value = start;
        pdfEndPageInput.value = end;

        await processPDF(loadedPdfDoc, start, end);
    });
}

/* =====================================================
   PDF URL
===================================================== */

if (loadUrlBtn) {
    loadUrlBtn.addEventListener("click", async function () {
        const url = pdfUrl.value.trim();
        if (!url) {
            setStatus("⚠️ 請輸入 PDF URL");
            return;
        }

        try {
            new URL(url);
        } catch {
            setStatus("❌ URL 格式不正確");
            return;
        }

        try {
            setStatus("🌐 正在載入 PDF...");
            const loadingTask = pdfjsLib.getDocument({ url: url });
            loadedPdfDoc = await loadingTask.promise;

            if (pdfName) pdfName.textContent = getFileNameFromURL(url);
            if (pdfPages) pdfPages.textContent = `(共 ${loadedPdfDoc.numPages} 頁)`;

            // 初始化頁數輸入框範圍
            setupPageRangeUI(loadedPdfDoc.numPages);

            // 預設讀取全部頁數
            await processPDF(loadedPdfDoc, 1, loadedPdfDoc.numPages);
        } catch (error) {
            console.error("URL PDF Error:", error);
            setStatus("❌ 無法載入 PDF。可能是 PDF 網站的 CORS 限制。");
        }
    });
}

/* =====================================================
   PROCESS PDF (支援指定頁數範圍)
===================================================== */

async function processPDF(pdf, startPage = 1, endPage = null) {
    const maxPages = pdf.numPages;
    if (!endPage || endPage > maxPages) endPage = maxPages;
    if (startPage < 1) startPage = 1;

    setStatus(`🔎 正在提取 PDF 文字 (第 ${startPage} 至 ${endPage} 頁)...`);
    let allText = "";

    // 只讀取指定範圍內的頁數
    for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
        setStatus(`🔎 正在讀取第 ${pageNumber} / ${endPage} 頁...`);
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = extractPageText(textContent);
        allText += pageText + "\n\n";
    }

    setStatus("🧹 正在清理 PDF 文字...");
    pdfText = cleanPDFText(allText);

    if (!pdfText || pdfText.length < 20) {
        setStatus("❌ 所選頁數內搵唔到足夠文字。這可能是掃描圖片或空白頁。");
        return;
    }

    setStatus("🎮 正在建立遊戲關卡...");
    levels = createLevels(pdfText, CHARS_PER_LEVEL);

    if (levels.length === 0) {
        setStatus("❌ 無法建立遊戲關卡");
        return;
    }

    // 動態構建 Level 下拉選單選項
    if (levelSelect) {
        levelSelect.innerHTML = "";
        levels.forEach((_, index) => {
            const option = document.createElement("option");
            option.value = index;
            option.textContent = `Level ${index + 1} / ${levels.length}`;
            levelSelect.appendChild(option);
        });
        levelSelect.disabled = false;
    }

    currentLevel = 0;
    if (gameArea) gameArea.classList.remove("hidden");
    showLevel();
    setStatus(`✅ 已載入第 ${startPage}-${endPage} 頁！共 ${levels.length} 個關卡`);
}

/* =====================================================
   EXTRACT & CLEAN PDF TEXT
===================================================== */

function extractPageText(textContent) {
    let result = "";
    let previousY = null;

    for (const item of textContent.items) {
        const text = item.str.trim();
        if (!text) continue;

        const currentY = item.transform ? item.transform[5] : null;

        if (previousY !== null && currentY !== null && Math.abs(currentY - previousY) > 5) {
            result += "\n";
        } else {
            result += " ";
        }

        result += text;
        previousY = currentY;
    }
    return result;
}

function cleanPDFText(text) {
    let cleaned = text;
    cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    cleaned = cleaned.replace(/^\s*\d+\s*$/gm, "");
    cleaned = cleaned.replace(/^\s*Page\s+\d+\s*$/gim, "");
    cleaned = cleaned.replace(/^\s*[-–—]\s*\d+\s*[-–—]\s*$/gm, "");
    cleaned = cleaned.replace(/([A-Za-z])-\s*\n\s*([A-Za-z])/g, "$1$2");
    cleaned = cleaned.replace(/([a-zA-Z0-9,.;:!?])\n(?=[a-zA-Z0-9])/g, "$1 ");
    cleaned = cleaned.replace(/[ \t]+/g, " ");
    cleaned = cleaned.replace(/\n{2,}/g, "\n");
    cleaned = cleaned.replace(/\s+([,.!?;:])/g, "$1");
    cleaned = cleaned.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");

    cleaned = cleaned
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join("\n");

    return cleaned.trim();
}


/* =====================================================
   CREATE LEVELS & SHOW LEVEL
===================================================== */

function createLevels(text, charsPerLevel) {
    const result = [];
    text = text.replace(/\s+/g, " ").trim();
    let start = 0;

    while (start < text.length) {
        let end = Math.min(start + charsPerLevel, text.length);

        if (end < text.length) {
            const sentenceEnd = text.lastIndexOf(".", end);
            const questionEnd = text.lastIndexOf("?", end);
            const exclamationEnd = text.lastIndexOf("!", end);
            const bestSentenceEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd);
            const spaceEnd = text.lastIndexOf(" ", end);

            if (bestSentenceEnd > start + 300) {
                end = bestSentenceEnd + 1;
            } else if (spaceEnd > start + 300) {
                end = spaceEnd;
            }
        }

        const levelText = text.slice(start, end).trim();
        if (levelText.length > 0) result.push(levelText);
        start = end;
    }
    return result;
}

function showLevel() {
    if (!levels.length) return;

    const text = levels[currentLevel];

    if (levelDisplay) levelDisplay.textContent = `Level ${currentLevel + 1} / ${levels.length}`;
    if (levelSelect) levelSelect.value = currentLevel;

    renderText(text);

    if (typingInput) {
        typingInput.value = "";
        typingInput.disabled = false;
    }

    gameFinished = false;
    startTime = null;

    updateStats();

    if (prevBtn) prevBtn.disabled = currentLevel === 0;
    if (nextBtn) nextBtn.disabled = currentLevel === levels.length - 1;

    setTimeout(() => { if (typingInput) typingInput.focus(); }, 100);
}


/* =====================================================
   RENDER TEXT & TYPING
===================================================== */

function renderText(text) {
    if (!textDisplay) return;
    textDisplay.innerHTML = "";

    for (let i = 0; i < text.length; i++) {
        const span = document.createElement("span");
        span.className = "char";
        span.textContent = text[i];
        if (i === 0) span.classList.add("current");
        textDisplay.appendChild(span);
    }

    makeWordsClickable();
}

if (typingInput) {
    typingInput.addEventListener("input", function () {
        if (gameFinished) return;

        const typed = typingInput.value;
        const target = levels[currentLevel];

        if (typed.length > 0 && startTime === null) {
            startTime = Date.now();
        }

        updateCharacterDisplay(typed, target);
        updateStats();

        if (typed.length >= target.length && typed === target) {
            finishLevel();
        }
    });
}

function updateCharacterDisplay(typed, target) {
    if (!textDisplay) return;
    const chars = textDisplay.querySelectorAll(".char");

    chars.forEach((char, index) => {
        char.classList.remove("correct", "incorrect", "current");

        if (index < typed.length) {
            if (typed[index] === target[index]) {
                char.classList.add("correct");
            } else {
                char.classList.add("incorrect");
            }
        }

        if (index === typed.length) {
            char.classList.add("current");
        }
    });

    const current = textDisplay.querySelector(".current");
    if (current) {
        current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}


/* =====================================================
   STATISTICS & CONTROLS
===================================================== */

function updateStats() {
    if (!typingInput) return;

    const typed = typingInput.value;
    const target = levels[currentLevel] || "";
    let correct = 0;

    for (let i = 0; i < typed.length && i < target.length; i++) {
        if (typed[i] === target[i]) correct++;
    }

    let accuracy = typed.length > 0 ? (correct / typed.length) * 100 : 100;
    if (accuracyDisplay) accuracyDisplay.textContent = `${accuracy.toFixed(1)}%`;

    let progress = target.length > 0 ? Math.min((typed.length / target.length) * 100, 100) : 0;
    if (progressDisplay) progressDisplay.textContent = `${progress.toFixed(0)}%`;

    let wpm = 0;
    if (startTime !== null && typed.length > 0) {
        const elapsedMinutes = (Date.now() - startTime) / 1000 / 60;
        if (elapsedMinutes > 0) wpm = (correct / 5) / elapsedMinutes;
    }
    if (wpmDisplay) wpmDisplay.textContent = Math.round(wpm);
}

function finishLevel() {
    gameFinished = true;
    if (typingInput) typingInput.disabled = true;
    updateStats();

    const accuracy = accuracyDisplay ? accuracyDisplay.textContent : "0%";
    const wpm = wpmDisplay ? wpmDisplay.textContent : "0";

    if (currentLevel < levels.length - 1) {
        setStatus(`🎉 Level ${currentLevel + 1} 完成！ Accuracy: ${accuracy} | WPM: ${wpm}`);
    } else {
        setStatus(`🏆 全部完成！ Accuracy: ${accuracy} | WPM: ${wpm}`);
    }
}

if (nextBtn) nextBtn.addEventListener("click", () => { if (currentLevel < levels.length - 1) { currentLevel++; showLevel(); } });
if (prevBtn) prevBtn.addEventListener("click", () => { if (currentLevel > 0) { currentLevel--; showLevel(); } });
if (restartBtn) restartBtn.addEventListener("click", () => showLevel());

if (levelSelect) {
    levelSelect.addEventListener("change", (e) => {
        const selectedLevel = parseInt(e.target.value, 10);
        if (!isNaN(selectedLevel) && selectedLevel >= 0 && selectedLevel < levels.length) {
            currentLevel = selectedLevel;
            showLevel();
        }
    });
}

function setStatus(message) { if (statusText) statusText.textContent = message; }
function getFileNameFromURL(url) {
    try {
        const parsed = new URL(url);
        return parsed.pathname.split("/").pop() || "PDF Document";
    } catch {
        return "PDF Document";
    }
}

/* =====================================================
   DICTIONARY LOGIC & CLICKABLE WORDS
===================================================== */

let currentLookupWord = "";

// 1. Web Speech API 語音合成 Function (作為 100% 穩定的備援機制)
function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    } else {
        console.warn("SpeechSynthesis API not supported on this browser.");
    }
}

// 2. 免費 MyMemory 翻譯 API 轉繁體中文
async function translateToZh(text) {
    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-TW`);
        const transData = await res.json();
        return transData.responseData?.translatedText || "";
    } catch {
        return "";
    }
}

function makeWordsClickable() {
    if (!textDisplay) return;
    const chars = textDisplay.querySelectorAll(".char");
    let i = 0;

    while (i < chars.length) {
        if (/^[A-Za-z]$/.test(chars[i].textContent)) {
            const start = i;
            let word = "";

            while (i < chars.length && /^[A-Za-z]$/.test(chars[i].textContent)) {
                word += chars[i].textContent;
                i++;
            }

            const end = i - 1;

            for (let j = start; j <= end; j++) {
                chars[j].classList.add("clickable-word");
                chars[j].onclick = (event) => {
                    event.stopPropagation();
                    lookupWord(word);
                };
            }
        } else {
            i++;
        }
    }
}

async function lookupWord(word) {
    word = word.trim().toLowerCase();
    if (!word || !dictionaryPopup || !dictionaryWord || !dictionaryContent) return;

    currentLookupWord = word;

    dictionaryPopup.classList.remove("hidden");
    dictionaryWord.textContent = word;

    if (dictionaryPhonetic) dictionaryPhonetic.textContent = "Loading...";
    dictionaryContent.innerHTML = "🔎 正在查字典與翻譯...";

    if (dictionaryAudio) dictionaryAudio.disabled = false;
    
    // 預設發音：直接使用瀏覽器原生 TTS
    currentAudio = {
        play: () => speakText(word)
    };

    try {
        const response = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(word));
        if (!response.ok) throw new Error("Word not found");

        const data = await response.json();
        if (!data || !data.length) throw new Error("No dictionary result");

        const entry = data[0];

        // Phonetic
        const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text && p.text.trim())?.text;
        if (dictionaryPhonetic) dictionaryPhonetic.textContent = phonetic || "";

        // Audio 處理：使用 fetch + Blob 預下載音檔，避免 ORB 阻擋觸發 DOMException
        const audioData = entry.phonetics?.find(p => p.audio && p.audio.trim().length > 0);
        if (audioData && audioData.audio) {
            let audioUrl = audioData.audio;
            if (audioUrl.startsWith("//")) {
                audioUrl = "https:" + audioUrl;
            }

            fetch(audioUrl)
                .then(res => {
                    if (!res.ok) throw new Error("Audio fetch failed");
                    return res.blob();
                })
                .then(blob => {
                    const blobUrl = URL.createObjectURL(blob);
                    const audioObj = new Audio(blobUrl);
                    currentAudio = {
                        play: () => audioObj.play().catch(() => speakText(word))
                    };
                })
                .catch(() => {
                    currentAudio = {
                        play: () => speakText(word)
                    };
                });
        }

        // Definitions & Chinese Translation
        dictionaryContent.innerHTML = "";
        if (!entry.meanings || entry.meanings.length === 0) {
            dictionaryContent.innerHTML = "<p>❌ 沒有找到解釋。</p>";
            return;
        }

        for (const meaning of entry.meanings) {
            const section = document.createElement("div");
            section.className = "dictionary-definition";

            const part = document.createElement("div");
            part.className = "dictionary-part";
            part.textContent = meaning.partOfSpeech || "Definition";
            section.appendChild(part);

            if (meaning.definitions) {
                const defs = meaning.definitions.slice(0, 3);
                for (let index = 0; index < defs.length; index++) {
                    const def = defs[index];
                    const div = document.createElement("div");
                    div.className = "dictionary-definition-text";

                    // 取得繁體中文翻譯
                    const zhText = await translateToZh(def.definition);
                    const zhDisplay = zhText ? `<br><span style="color: #2b6cb0; font-size: 0.9em;">🇹🇼 ${zhText}</span>` : "";

                    div.innerHTML = `<strong>${index + 1}.</strong> ${def.definition}${zhDisplay}`;
                    section.appendChild(div);

                    if (def.example) {
                        const example = document.createElement("div");
                        example.className = "dictionary-example";
                        example.textContent = `Example: "${def.example}"`;
                        section.appendChild(example);
                    }
                }
            }

            dictionaryContent.appendChild(section);
        }

    } catch (error) {
        if (dictionaryPhonetic) dictionaryPhonetic.textContent = "";
        dictionaryContent.innerHTML = "<p>⚠️ 字典 API 連線異常，仍可點擊發音按鈕收聽語音。</p>";
    }
}

// Dictionary Close & Audio Events
if (dictionaryClose) {
    dictionaryClose.addEventListener("click", () => {
        if (dictionaryPopup) dictionaryPopup.classList.add("hidden");
    });
}

if (dictionaryAudio) {
    dictionaryAudio.addEventListener("click", () => {
        if (currentAudio && typeof currentAudio.play === "function") {
            currentAudio.play();
        } else if (currentLookupWord) {
            speakText(currentLookupWord);
        }
    });
}

/* =====================================================
   CUSTOM TEXT / ARTICLE MODE LOGIC
===================================================== */

if (startCustomTextBtn && customTextInput) {
    startCustomTextBtn.addEventListener("click", function () {
        const rawText = customTextInput.value.trim();

        if (!rawText) {
            if (articleStatusText) articleStatusText.textContent = "⚠️ 請先輸入或貼上文字！";
            return;
        }

        // 清理文字格式
        const cleanedText = cleanPDFText(rawText);

        if (cleanedText.length < 5) {
            if (articleStatusText) articleStatusText.textContent = "❌ 輸入的內容過短，請輸入更多內容。";
            return;
        }

        // 切割成關卡 (每關約 500 字元)
        levels = createLevels(cleanedText, CHARS_PER_LEVEL);

        if (levels.length === 0) {
            if (articleStatusText) articleStatusText.textContent = "❌ 無法生成關卡。";
            return;
        }

        // 更新 Level 下拉選單
        if (levelSelect) {
            levelSelect.innerHTML = "";
            levels.forEach((_, index) => {
                const option = document.createElement("option");
                option.value = index;
                option.textContent = `Level ${index + 1} / ${levels.length}`;
                levelSelect.appendChild(option);
            });
            levelSelect.disabled = false;
        }

        // 設置文章來源標題
        const contentTitle = document.getElementById("content-title");
        const contentSource = document.getElementById("content-source");
        if (contentTitle) contentTitle.textContent = "Custom Text";
        if (contentSource) contentSource.textContent = `Total Length: ${cleanedText.length} chars`;

        currentLevel = 0;
        if (gameArea) gameArea.classList.remove("hidden");
        showLevel();

        if (articleStatusText) articleStatusText.textContent = `✅ 成功載入文章！共 ${levels.length} 個關卡`;
        
        // 自動平滑捲動到遊戲區域
        gameArea.scrollIntoView({ behavior: "smooth" });
    });
}

// 頁面載入完成後自動讀取 Git 倉庫中的 articles.json
document.addEventListener("DOMContentLoaded", () => {
    loadArticlesFromGit();
});

async function loadArticlesFromGit() {
    const articleSelect = document.getElementById("articleSelect");
    const articleContainer = document.getElementById("articleContainer");

    try {
        // 從相對路徑讀取與 index.html 同目錄的 articles.json
        const response = await fetch("./articles.json");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const articles = await response.json();

        // 動態生成下拉選單選項
        articles.forEach(article => {
            const option = document.createElement("option");
            option.value = article.id;
            option.textContent = article.title;
            articleSelect.appendChild(option);
        });

        // 當使用者切換選項時更新顯示內容
        articleSelect.addEventListener("change", (e) => {
            const selectedId = e.target.value;
            const selectedArticle = articles.find(a => a.id === selectedId);

            if (selectedArticle) {
                // 如果你的打字練習器需要更新文字，可以將文字帶入打字區域：
                // example: textToTypeContainer.innerText = selectedArticle.content;
                if (articleContainer) {
                    articleContainer.innerHTML = `
                        <h3>${selectedArticle.title}</h3>
                        <p>${selectedArticle.content}</p>
                    `;
                }
            } else {
                if (articleContainer) articleContainer.innerHTML = "";
            }
        });

    } catch (error) {
        console.error("Failed to load articles.json:", error);
        if (articleContainer) {
            articleContainer.innerHTML = "<p>⚠️ 無法載入文章選單，請檢查 articles.json 檔案路徑。</p>";
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const downloadBtn = document.getElementById("addAndDownloadBtn");
    if (downloadBtn) {
        downloadBtn.addEventListener("click", handleAddAndDownload);
    }
});

async function handleAddAndDownload() {
    const titleInput = document.getElementById("newTitle");
    const contentInput = document.getElementById("newContent");

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
        alert("⚠️ 請填寫標題同埋內容！");
        return;
    }

    let articlesList = [];

    // 1. 嘗試讀取現有的 articles.json（如果有的話）
    try {
        const response = await fetch("./articles.json");
        if (response.ok) {
            articlesList = await response.json();
        }
    } catch (err) {
        console.warn("未找到現有 articles.json 或讀取失敗，將建立全新 JSON 陣列。");
    }

    // 2. 建立新文章物件並加進陣列
    const newArticle = {
        id: "article-" + Date.now(),
        title: title,
        content: content
    };
    articlesList.push(newArticle);

    // 3. 觸發瀏覽器下載 articles.json
    downloadJsonFile(articlesList, "articles.json");

    // 4. 清空輸入框
    titleInput.value = "";
    contentInput.value = "";
    alert("✅ 已成功下載 articles.json！請將檔案覆蓋專案目錄並 git push。");
}

// 輔助函式：將 JS 物件轉成 JSON 檔案並下載
function downloadJsonFile(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2); // 保持格式排版
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    
    // 清理 DOM 與 URL 物件
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
