/* =====================================================
   PDF.JS CONFIGURATION
===================================================== */

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


/* =====================================================
   DOM ELEMENTS
===================================================== */

const pdfModeBtn = document.getElementById("pdf-mode-btn");
const articleModeBtn = document.getElementById("article-mode-btn");
const pdfModePanel = document.getElementById("pdf-mode");
const articleModePanel = document.getElementById("article-mode");

const pdfUpload = document.getElementById("pdf-upload");
const pdfUrl = document.getElementById("pdf-url");
const loadUrlBtn = document.getElementById("load-url-btn");
const statusText = document.getElementById("pdf-status");

const gameArea = document.getElementById("game-area");
const textDisplay = document.getElementById("text-display");
const typingInput = document.getElementById("typing-input");
const levelDisplay = document.getElementById("level-display");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const restartBtn = document.getElementById("restart-btn");
const pdfName = document.getElementById("pdf-name");
const pdfPages = document.getElementById("pdf-pages");
const accuracyDisplay = document.getElementById("accuracy");
const wpmDisplay = document.getElementById("wpm");
const progressDisplay = document.getElementById("progress");

/* Dictionary Modal Elements */
const dictionaryPopup = document.getElementById("dictionary-popup");
const dictionaryWord = document.getElementById("dictionary-word");
const dictionaryPhonetic = document.getElementById("dictionary-phonetic");
const dictionaryAudio = document.getElementById("dictionary-audio");
const dictionaryContent = document.getElementById("dictionary-content");
const dictionaryClose = document.getElementById("dictionary-close");

let currentAudio = null;


/* =====================================================
   MODE SWITCHING
===================================================== */

if (pdfModeBtn && articleModeBtn) {
    pdfModeBtn.addEventListener("click", () => {
        pdfModeBtn.classList.add("active");
        articleModeBtn.classList.remove("active");
        if (pdfModePanel) pdfModePanel.classList.remove("hidden");
        if (articleModePanel) articleModePanel.classList.add("hidden");
    });

    articleModeBtn.addEventListener("click", () => {
        articleModeBtn.classList.add("active");
        pdfModeBtn.classList.remove("active");
        if (articleModePanel) articleModePanel.classList.remove("hidden");
        if (pdfModePanel) pdfModePanel.classList.add("hidden");
    });
}


/* =====================================================
   GAME STATE
===================================================== */

let pdfText = "";
let levels = [];
let currentLevel = 0;
let startTime = null;
let gameFinished = false;

const CHARS_PER_LEVEL = 500;


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
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            if (pdfName) pdfName.textContent = file.name;
            if (pdfPages) pdfPages.textContent = `${pdf.numPages} pages`;

            await processPDF(pdf);
        } catch (error) {
            console.error(error);
            setStatus("❌ PDF 讀取失敗：" + error.message);
        }
    });
}


/* =====================================================
   PDF URL LOADING
===================================================== */

if (loadUrlBtn) {
    loadUrlBtn.addEventListener("click", async function () {
        const url = pdfUrl ? pdfUrl.value.trim() : "";

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
            setStatus("🌐 正在載入 PDF URL...");
            const loadingTask = pdfjsLib.getDocument({ url: url });
            const pdf = await loadingTask.promise;

            if (pdfName) pdfName.textContent = getFileNameFromURL(url);
            if (pdfPages) pdfPages.textContent = `${pdf.numPages} pages`;

            await processPDF(pdf);
        } catch (error) {
            console.error(error);
            setStatus("❌ 無法載入 PDF URL。可能是 CORS 限制。");
        }
    });
}


/* =====================================================
   PROCESS PDF
===================================================== */

async function processPDF(pdf) {
    setStatus("🔎 正在提取 PDF 文字...");
    let allText = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        setStatus(`🔎 正在讀取第 ${pageNumber} / ${pdf.numPages} 頁...`);
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = extractPageText(textContent);
        allText += pageText + "\n\n";
    }

    setStatus("🧹 正在清理 PDF 文字...");
    pdfText = cleanPDFText(allText);

    if (!pdfText || pdfText.length < 20) {
        setStatus("❌ PDF 裡面搵唔到足夠文字。可能係掃描圖片 PDF。");
        return;
    }

    levels = createLevels(pdfText, CHARS_PER_LEVEL);

    if (levels.length === 0) {
        setStatus("❌ 無法建立遊戲關卡");
        return;
    }

    currentLevel = 0;
    if (gameArea) gameArea.classList.remove("hidden");
    showLevel();

    setStatus(`✅ PDF 載入成功！共 ${levels.length} 個關卡`);
}


/* =====================================================
   EXTRACT PAGE TEXT
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


/* =====================================================
   CLEAN PDF TEXT
===================================================== */

function cleanPDFText(text) {
    let cleaned = text;

    cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    cleaned = cleaned.replace(/^\s*\d+\s*$/gm, "");
    cleaned = cleaned.replace(/^\s*Page\s+\d+\s*$/gim, "");
    cleaned = cleaned.replace(/^\s*[-–—]\s*\d+\s*[-–—]\s*$/gm, "");
    cleaned = cleaned.replace(/[ \t]+/g, " ");
    cleaned = cleaned.replace(/([A-Za-z])-\s*\n\s*([A-Za-z])/g, "$1$2");
    cleaned = cleaned.replace(/([a-zA-Z0-9,.;:!?])\n(?=[a-zA-Z0-9])/g, "$1 ");
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
   CREATE LEVELS
===================================================== */

function createLevels(text, charsPerLevel) {
    const result = [];
    text = text.replace(/\s+/g, " ").trim();

    let start = 0;

    while (start < text.length) {
        let end = Math.min(start + charsPerLevel, text.length);

        if (end < text.length) {
            const sentenceEnd = text.lastIndexOf(".", end);
            const spaceEnd = text.lastIndexOf(" ", end);

            if (sentenceEnd > start + 300) {
                end = sentenceEnd + 1;
            } else if (spaceEnd > start + 300) {
                end = spaceEnd;
            }
        }

        const levelText = text.slice(start, end).trim();
        if (levelText.length > 0) {
            result.push(levelText);
        }

        start = end;
    }

    return result;
}


/* =====================================================
   SHOW LEVEL
===================================================== */

function showLevel() {
    if (!levels.length) return;

    const text = levels[currentLevel];
    if (levelDisplay) levelDisplay.textContent = `Level ${currentLevel + 1} / ${levels.length}`;

    renderText(text);

    if (typingInput) {
        typingInput.value = "";
        typingInput.disabled = false;
        setTimeout(() => typingInput.focus(), 100);
    }

    gameFinished = false;
    startTime = null;

    updateStats();

    if (prevBtn) prevBtn.disabled = currentLevel === 0;
    if (nextBtn) nextBtn.disabled = currentLevel === levels.length - 1;
}


/* =====================================================
   RENDER TEXT
===================================================== */

function renderText(text) {
    if (!textDisplay) return;
    textDisplay.innerHTML = "";

    for (let i = 0; i < text.length; i++) {
        const span = document.createElement("span");
        span.className = "char";
        span.textContent = text[i];

        if (i === 0) {
            span.classList.add("current");
        }

        textDisplay.appendChild(span);
    }
}


/* =====================================================
   TYPING ENGINE
===================================================== */

if (typingInput) {
    typingInput.addEventListener("input", function () {
        if (gameFinished) return;

        const typed = typingInput.value;
        const target = levels[currentLevel] || "";

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


/* =====================================================
   CHARACTER DISPLAY UPDATE
===================================================== */

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
        current.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}


/* =====================================================
   STATISTICS COMPUTATION
===================================================== */

function updateStats() {
    const typed = typingInput ? typingInput.value : "";
    const target = levels[currentLevel] || "";

    let correct = 0;

    for (let i = 0; i < typed.length && i < target.length; i++) {
        if (typed[i] === target[i]) {
            correct++;
        }
    }

    let accuracy = 100;
    if (typed.length > 0) {
        accuracy = (correct / typed.length) * 100;
    }
    if (accuracyDisplay) accuracyDisplay.textContent = `${accuracy.toFixed(1)}%`;

    let progress = 0;
    if (target.length > 0) {
        progress = Math.min((typed.length / target.length) * 100, 100);
    }
    if (progressDisplay) progressDisplay.textContent = `${progress.toFixed(0)}%`;

    let wpm = 0;
    if (startTime !== null && typed.length > 0) {
        const elapsed = (Date.now() - startTime) / 1000 / 60;
        if (elapsed > 0) {
            wpm = (correct / 5) / elapsed;
        }
    }
    if (wpmDisplay) wpmDisplay.textContent = Math.round(wpm);
}


/* =====================================================
   FINISH LEVEL
===================================================== */

function finishLevel() {
    gameFinished = true;
    if (typingInput) typingInput.disabled = true;

    updateStats();

    const accuracy = accuracyDisplay ? accuracyDisplay.textContent : "100%";
    const wpm = wpmDisplay ? wpmDisplay.textContent : "0";

    if (currentLevel < levels.length - 1) {
        setStatus(`🎉 Level ${currentLevel + 1} 完成！ Accuracy: ${accuracy} | WPM: ${wpm}`);
    } else {
        setStatus(`🏆 全部完成！ Accuracy: ${accuracy} | WPM: ${wpm}`);
    }
}


/* =====================================================
   CONTROLS & NAVIGATION
===================================================== */

if (nextBtn) {
    nextBtn.addEventListener("click", function () {
        if (currentLevel < levels.length - 1) {
            currentLevel++;
            showLevel();
        }
    });
}

if (prevBtn) {
    prevBtn.addEventListener("click", function () {
        if (currentLevel > 0) {
            currentLevel--;
            showLevel();
        }
    });
}

if (restartBtn) {
    restartBtn.addEventListener("click", function () {
        showLevel();
    });
}


/* =====================================================
   DICTIONARY INTEGRATION (Free Dictionary API)
===================================================== */

if (textDisplay) {
    textDisplay.addEventListener("dblclick", async function () {
        const selection = window.getSelection().toString().trim();
        const word = selection.replace(/[^a-zA-Z]/g, "").toLowerCase();

        if (!word) return;

        openDictionaryModal(word);
    });
}

async function openDictionaryModal(word) {
    if (!dictionaryPopup) return;

    dictionaryWord.textContent = word;
    dictionaryPhonetic.textContent = "Loading...";
    dictionaryContent.innerHTML = "<p>載入中...</p>";
    dictionaryPopup.classList.remove("hidden");

    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        if (!response.ok) throw new Error("Word not found");

        const data = await response.json();
        const entry = data[0];

        // Phonetic & Audio
        const phonetic = entry.phonetic || (entry.phonetics.find(p => p.text)?.text) || "";
        dictionaryPhonetic.textContent = phonetic;

        const audioUrl = entry.phonetics.find(p => p.audio && p.audio.length > 0)?.audio || "";
        if (audioUrl && dictionaryAudio) {
            dictionaryAudio.style.display = "inline-block";
            dictionaryAudio.onclick = () => {
                if (currentAudio) currentAudio.pause();
                currentAudio = new Audio(audioUrl);
                currentAudio.play();
            };
        } else if (dictionaryAudio) {
            dictionaryAudio.style.display = "none";
        }

        // Definitions
        let html = "";
        entry.meanings.forEach(meaning => {
            html += `<div style="margin-bottom: 12px;">
                <strong><i>${meaning.partOfSpeech}</i></strong>
                <ul style="margin: 4px 0; padding-left: 20px;">`;
            meaning.definitions.slice(0, 3).forEach(def => {
                html += `<li>${def.definition}${def.example ? `<br><small style="color:#666;">"${def.example}"</small>` : ""}</li>`;
            });
            html += `</ul></div>`;
        });

        dictionaryContent.innerHTML = html;
    } catch (err) {
        dictionaryPhonetic.textContent = "";
        dictionaryContent.innerHTML = `<p style="color: #e74c3c;">找不到此單字的詳細解釋。</p>`;
    }
}

if (dictionaryClose) {
    dictionaryClose.addEventListener("click", () => {
        if (dictionaryPopup) dictionaryPopup.classList.add("hidden");
    });
}


/* =====================================================
   HELPERS
===================================================== */

function setStatus(message) {
    if (statusText) statusText.textContent = message;
}

function getFileNameFromURL(url) {
    try {
        const parsed = new URL(url);
        const filename = parsed.pathname.split("/").pop();
        return filename || "PDF Document";
    } catch {
        return "PDF Document";
    }
}
