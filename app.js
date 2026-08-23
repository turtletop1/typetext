/* =====================================================
   Typing Game - Complete Optimized Code v2.0
   ===================================================== */

// =====================================================
// 1️⃣ Global Configuration
// =====================================================

const CONFIG = {
    PDF_WORKER: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
    PDF_LINE_HEIGHT_THRESHOLD: 5,
    
    CHARS_PER_LEVEL: 500,
    MIN_TEXT_LENGTH: 20,
    MIN_CUSTOM_TEXT_LENGTH: 5,
    
    SPEECH_RATE: 0.9,
    SPEECH_LANG: "en-US",
    
    TRANSLATION_CACHE_SIZE: 100,
    
    DICTIONARY_API: "https://api.dictionaryapi.dev/api/v2/entries/en/",
    TRANSLATION_API: "https://api.mymemory.translated.net/get",
};

// =====================================================
// 2️⃣ Game State Management
// =====================================================

const GameState = {
    pdfText: "",
    levels: [],
    currentLevel: 0,
    startTime: null,
    gameFinished: false,
    
    currentAudio: null,
    currentLookupWord: "",
    
    loadingState: "idle", // "idle" | "loading" | "loaded"
    loadedPdfDoc: null,
    
    reset() {
        this.pdfText = "";
        this.levels = [];
        this.currentLevel = 0;
        this.startTime = null;
        this.gameFinished = false;
        this.currentLookupWord = "";
        this.loadingState = "idle";
    },
    
    setLoading(state) {
        this.loadingState = state;
    },
    
    createLevels(text, charsPerLevel) {
        this.levels = createLevels(text, charsPerLevel);
        return this.levels;
    },
    
    getCurrentText() {
        return this.levels[this.currentLevel] || "";
    },
    
    getTotalLevels() {
        return this.levels.length;
    },
};

// =====================================================
// 3️⃣ DOM Element Selectors
// =====================================================

const DOM = {
    pdfModeBtn: () => document.getElementById("pdf-mode-btn"),
    articleModeBtn: () => document.getElementById("article-mode-btn"),
    pdfModePanel: () => document.getElementById("pdf-mode"),
    articleModePanel: () => document.getElementById("article-mode"),
    
    pdfUpload: () => document.getElementById("pdf-upload"),
    pdfUrl: () => document.getElementById("pdf-url"),
    loadUrlBtn: () => document.getElementById("load-url-btn"),
    pdfStatus: () => document.getElementById("pdf-status"),
    pdfName: () => document.getElementById("pdf-name"),
    pdfPages: () => document.getElementById("pdf-pages"),
    
    pdfStartPageInput: () => document.getElementById("pdf-start-page"),
    pdfEndPageInput: () => document.getElementById("pdf-end-page"),
    applyPageRangeBtn: () => document.getElementById("apply-page-range-btn"),
    pageRangeContainer: () => document.getElementById("page-range-container"),
    
    gameArea: () => document.getElementById("game-area"),
    textDisplay: () => document.getElementById("text-display"),
    typingInput: () => document.getElementById("typing-input"),
    levelDisplay: () => document.getElementById("level-display"),
    levelSelect: () => document.getElementById("level-select"),
    prevBtn: () => document.getElementById("prev-btn"),
    nextBtn: () => document.getElementById("next-btn"),
    restartBtn: () => document.getElementById("restart-btn"),
    
    accuracyDisplay: () => document.getElementById("accuracy"),
    wpmDisplay: () => document.getElementById("wpm"),
    progressDisplay: () => document.getElementById("progress"),
    
    dictionaryPopup: () => document.getElementById("dictionary-popup"),
    dictionaryWord: () => document.getElementById("dictionary-word"),
    dictionaryPhonetic: () => document.getElementById("dictionary-phonetic"),
    dictionaryAudio: () => document.getElementById("dictionary-audio"),
    dictionaryContent: () => document.getElementById("dictionary-content"),
    dictionaryClose: () => document.getElementById("dictionary-close"),
    
    customTextInput: () => document.getElementById("custom-text-input"),
    startCustomTextBtn: () => document.getElementById("start-custom-text-btn"),
    articleStatus: () => document.getElementById("article-status"),
    
    articleSelect: () => document.getElementById("articleSelect"),
    articleContainer: () => document.getElementById("articleContainer"),
    
    toggleFormBtn: () => document.getElementById("toggleFormBtn"),
    addArticleContainer: () => document.getElementById("addArticleContainer"),
    newTitle: () => document.getElementById("newTitle"),
    newContent: () => document.getElementById("newContent"),
    addAndDownloadBtn: () => document.getElementById("addAndDownloadBtn"),
};

// =====================================================
// 4️⃣ Translation Cache System
// =====================================================

const TranslationCache = (() => {
    const cache = new Map();
    const MAX_SIZE = CONFIG.TRANSLATION_CACHE_SIZE;
    
    return {
        get(text) {
            return cache.get(text);
        },
        set(text, translation) {
            if (cache.size >= MAX_SIZE) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            cache.set(text, translation);
        },
        has(text) {
            return cache.has(text);
        },
        clear() {
            cache.clear();
        },
        size() {
            return cache.size;
        },
    };
})();

// =====================================================
// 5️⃣ Audio Management System
// =====================================================

const AudioManager = {
    currentAudio: null,
    
    setAudio(audioUrl, fallbackWord) {
        this.stopCurrent();
        
        const audioObj = new Audio(audioUrl);
        this.currentAudio = {
            element: audioObj,
            play: () => {
                audioObj.play().catch(() => {
                    console.warn("Audio play failed, falling back to Web Speech API");
                    this.speak(fallbackWord);
                });
            }
        };
    },
    
    speak(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = CONFIG.SPEECH_LANG;
            utterance.rate = CONFIG.SPEECH_RATE;
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("Browser does not support SpeechSynthesis API");
        }
    },
    
    play() {
        if (this.currentAudio?.play) {
            this.currentAudio.play();
        } else if (GameState.currentLookupWord) {
            this.speak(GameState.currentLookupWord);
        }
    },
    
    stopCurrent() {
        if (this.currentAudio?.element) {
            this.currentAudio.element.pause();
            this.currentAudio.element.currentTime = 0;
            this.currentAudio.element.src = "";
        }
        this.currentAudio = null;
    },
    
    destroy() {
        this.stopCurrent();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
};

// =====================================================
// 6️⃣ Event Manager
// =====================================================

const EventManager = {
    listeners: [],
    
    attach(element, event, handler) {
        if (!element) return;
        element.addEventListener(event, handler);
        this.listeners.push({ element, event, handler });
    },
    
    attachAll(config) {
        config.forEach(([element, event, handler]) => {
            this.attach(element, event, handler);
        });
    },
    
    removeAll() {
        this.listeners.forEach(({ element, event, handler }) => {
            if (element) element.removeEventListener(event, handler);
        });
        this.listeners = [];
    }
};

// =====================================================
// 7️⃣ Initialization
// =====================================================

function initializeEventListeners() {
    EventManager.attachAll([
        [DOM.pdfUpload(), "change", handlePDFUpload],
        [DOM.loadUrlBtn(), "click", handleLoadURL],
        [DOM.applyPageRangeBtn(), "click", handleApplyPageRange],
        [DOM.nextBtn(), "click", () => navigateLevel(1)],
        [DOM.prevBtn(), "click", () => navigateLevel(-1)],
        [DOM.restartBtn(), "click", () => showLevel()],
        [DOM.typingInput(), "input", handleTyping],
        [DOM.levelSelect(), "change", handleLevelSelect],
        [DOM.startCustomTextBtn(), "click", handleStartCustomText],
        [DOM.dictionaryClose(), "click", closeDictionary],
        [DOM.dictionaryAudio(), "click", playCurrentAudio],
        [DOM.pdfModeBtn(), "click", () => switchMode("pdf")],
        [DOM.articleModeBtn(), "click", () => switchMode("article")],
        [DOM.addAndDownloadBtn(), "click", handleAddAndDownload],
    ]);
}

function initializeWordClickDelegation() {
    const textDisplay = DOM.textDisplay();
    if (!textDisplay) return;
    
    textDisplay.addEventListener("click", (e) => {
        if (!e.target.classList.contains("char")) return;
        
        const clickedChar = e.target;
        let word = "";
        let current = clickedChar;
        
        while (current && /^[A-Za-z]$/.test(current.textContent)) {
            word = current.textContent + word;
            current = current.previousElementSibling;
        }
        
        current = clickedChar;
        while (current && /^[A-Za-z]$/.test(current.textContent)) {
            if (current !== clickedChar) word += current.textContent;
            current = current.nextElementSibling;
        }
        
        if (word) {
            lookupWord(word.toLowerCase().trim());
        }
    });
}

function initializeFormToggle() {
    const toggleBtn = DOM.toggleFormBtn();
    const container = DOM.addArticleContainer();
    
    if (!toggleBtn || !container) return;
    
    toggleBtn.addEventListener("click", () => {
        const isHidden = container.style.display === "none";
        container.style.display = isHidden ? "block" : "none";
        toggleBtn.textContent = isHidden ? "✖ 關閉新增表單" : "➕ 新增文章";
    });
}

// =====================================================
// 8️⃣ PDF Processing
// =====================================================

function setupPageRangeUI(totalPages) {
    const startInput = DOM.pdfStartPageInput();
    const endInput = DOM.pdfEndPageInput();
    const container = DOM.pageRangeContainer();
    
    if (!startInput || !endInput) return;
    
    startInput.min = "1";
    startInput.max = totalPages.toString();
    startInput.value = "1";
    
    endInput.min = "1";
    endInput.max = totalPages.toString();
    endInput.value = totalPages.toString();
    
    if (container) container.classList.remove("hidden");
}

function extractPageText(textContent) {
    let result = "";
    let previousY = null;
    
    for (const item of textContent.items) {
        const text = item.str.trim();
        if (!text) continue;
        
        const currentY = item.transform ? item.transform[5] : null;
        
        if (previousY !== null && currentY !== null && 
            Math.abs(currentY - previousY) > CONFIG.PDF_LINE_HEIGHT_THRESHOLD) {
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
    return text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/^\s*\d+\s*$/gm, "")
        .replace(/^\s*Page\s+\d+\s*$/gim, "")
        .replace(/^\s*[-–—]\s*\d+\s*[-–—]\s*$/gm, "")
        .replace(/([A-Za-z])-\s*\n\s*([A-Za-z])/g, "$1$2")
        .replace(/([a-zA-Z0-9,.;:!?])\n(?=[a-zA-Z0-9])/g, "$1 ")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{2,}/g, "\n")
        .replace(/\s+([,.!?;:])/g, "$1")
        .replace(/\(\s+/g, "(")
        .replace(/\s+\)/g, ")")
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join("\n")
        .trim();
}

async function processPDF(pdf, startPage = 1, endPage = null) {
    if (GameState.loadingState === "loading") {
        setStatus("⚠️ PDF 正在加載中，請稍候...");
        return;
    }
    
    GameState.setLoading("loading");
    setStatus("🔎 正在提取 PDF 文字...");
    
    try {
        const maxPages = pdf.numPages;
        if (!endPage || endPage > maxPages) endPage = maxPages;
        if (startPage < 1) startPage = 1;
        
        let allText = "";
        
        for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
            setStatus(`🔎 正在讀取第 ${pageNumber} / ${endPage} 頁...`);
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const pageText = extractPageText(textContent);
            allText += pageText + "\n\n";
        }
        
        setStatus("🧹 正在清理 PDF 文字...");
        GameState.pdfText = cleanPDFText(allText);
        
        if (!GameState.pdfText || GameState.pdfText.length < CONFIG.MIN_TEXT_LENGTH) {
            setStatus("❌ 所選頁數內搵唔到足夠文字。");
            GameState.setLoading("loaded");
            return;
        }
        
        setStatus("🎮 正在建立遊戲關卡...");
        GameState.createLevels(GameState.pdfText, CONFIG.CHARS_PER_LEVEL);
        
        if (GameState.getTotalLevels() === 0) {
            setStatus("❌ 無法建立遊戲關卡");
            GameState.setLoading("loaded");
            return;
        }
        
        updateLevelSelect();
        GameState.currentLevel = 0;
        const gameArea = DOM.gameArea();
        if (gameArea) gameArea.classList.remove("hidden");
        showLevel();
        
        setStatus(`✅ 已載入第 ${startPage}-${endPage} 頁！共 ${GameState.getTotalLevels()} 個關卡`);
        GameState.setLoading("loaded");
        
    } catch (error) {
        console.error("PDF Error:", error);
        setStatus("❌ PDF 處理失敗：" + error.message);
        GameState.setLoading("loaded");
    }
}

// =====================================================
// 9️⃣ Game Core Logic
// =====================================================

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
    if (!GameState.getTotalLevels()) return;
    
    const text = GameState.getCurrentText();
    
    const levelDisplay = DOM.levelDisplay();
    if (levelDisplay) {
        levelDisplay.textContent = `Level ${GameState.currentLevel + 1} / ${GameState.getTotalLevels()}`;
    }
    
    const levelSelect = DOM.levelSelect();
    if (levelSelect) levelSelect.value = GameState.currentLevel.toString();
    
    renderText(text);
    
    const typingInput = DOM.typingInput();
    if (typingInput) {
        typingInput.value = "";
        typingInput.disabled = false;
    }
    
    GameState.gameFinished = false;
    GameState.startTime = null;
    
    updateStats();
    updateNavigationButtons();
    
    setTimeout(() => { 
        if (typingInput) typingInput.focus(); 
    }, 100);
}

function renderText(text) {
    const textDisplay = DOM.textDisplay();
    if (!textDisplay) return;
    
    textDisplay.innerHTML = "";
    
    for (let i = 0; i < text.length; i++) {
        const span = document.createElement("span");
        span.className = "char";
        span.textContent = text[i];
        
        if (i === 0) span.classList.add("current");
        if (/^[A-Za-z]$/.test(text[i])) span.classList.add("clickable-word");
        
        textDisplay.appendChild(span);
    }
}

function updateCharacterDisplay(typed, target) {
    const textDisplay = DOM.textDisplay();
    if (!textDisplay) return;
    
    const chars = textDisplay.querySelectorAll(".char");
    
    chars.forEach((char, index) => {
        char.classList.remove("correct", "incorrect", "current");
        
        if (index < typed.length) {
            char.classList.add(typed[index] === target[index] ? "correct" : "incorrect");
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

function updateStats() {
    const typingInput = DOM.typingInput();
    if (!typingInput) return;
    
    const typed = typingInput.value;
    const target = GameState.getCurrentText();
    
    let correct = 0;        // 計算打對嘅字符數量
    for (let i = 0; i < typed.length && i < target.length; i++) {
        if (typed[i] === target[i]) correct++;
    }
    
    const accuracy = typed.length > 0 ? (correct / typed.length) * 100 : 100;
    const accuracyDisplay = DOM.accuracyDisplay();
    if (accuracyDisplay) accuracyDisplay.textContent = `${accuracy.toFixed(1)}%`;
    
    const progress = target.length > 0 ? Math.min((typed.length / target.length) * 100, 100) : 0;    // 顯示總字符完成進度（ UI 面板上依然顯示輸入進度）
    const progressDisplay = DOM.progressDisplay();
    if (progressDisplay) progressDisplay.textContent = `${progress.toFixed(0)}%`;
    
    let wpm = 0;
    if (GameState.startTime !== null && typed.length > 0) {
        const elapsedMinutes = (Date.now() - GameState.startTime) / 1000 / 60;
        if (elapsedMinutes > 0) wpm = (correct / 5) / elapsedMinutes;
    }
    const wpmDisplay = DOM.wpmDisplay();
    if (wpmDisplay) wpmDisplay.textContent = Math.round(wpm);

    const container = document.getElementById('turtle-track');
    const image = document.getElementById('turtle-display');
    if (image) {
        image.src = "img.svg";     
    }
    
    if (container && image) {
       
        const maxX = container.offsetWidth - image.offsetWidth;      // 計算圖片可以移動嘅最大 X 坐標（容器寬度 - 圖片寬度)
        
        const correctRatio = target.length > 0 ? Math.min(correct / target.length, 1) : 0;  // 基於正確字數嘅比例（0到1之間）
        
        const currentX = maxX * correctRatio;   // 當前位置 = 最大移動距離*正確字數比例
        
        image.style.left = `${currentX}px`;     // 更新圖片 CSS 位置
    }
}

function finishLevel() {
    GameState.gameFinished = true;
    const typingInput = DOM.typingInput();
    if (typingInput) typingInput.disabled = true;
    
    updateStats();
    
    const image = document.getElementById('turtle-display');
    if (image) {
        image.src = "1f422.gif";     
    }
    
    const accuracy = DOM.accuracyDisplay()?.textContent || "0%";
    const wpm = DOM.wpmDisplay()?.textContent || "0";
    
    if (GameState.currentLevel < GameState.getTotalLevels() - 1) {
        setStatus(`🎉 Level ${GameState.currentLevel + 1} 完成！ Accuracy: ${accuracy} | WPM: ${wpm}`);
    } else {
        setStatus(`🏆 全部完成！ Accuracy: ${accuracy} | WPM: ${wpm}`);
    }
}

function navigateLevel(direction) {
    const newLevel = GameState.currentLevel + direction;
    if (newLevel >= 0 && newLevel < GameState.getTotalLevels()) {
        GameState.currentLevel = newLevel;
        showLevel();
    }
}

function updateNavigationButtons() {
    const prevBtn = DOM.prevBtn();
    const nextBtn = DOM.nextBtn();
    
    if (prevBtn) prevBtn.disabled = GameState.currentLevel === 0;
    if (nextBtn) nextBtn.disabled = GameState.currentLevel === GameState.getTotalLevels() - 1;
}

function updateLevelSelect() {
    const levelSelect = DOM.levelSelect();
    if (!levelSelect || GameState.getTotalLevels() === 0) return;
    
    levelSelect.innerHTML = "";
    GameState.levels.forEach((_, index) => {
        const option = document.createElement("option");
        option.value = index.toString();
        option.textContent = `Level ${index + 1} / ${GameState.getTotalLevels()}`;
        levelSelect.appendChild(option);
    });
    levelSelect.disabled = false;
}

// =====================================================
// 🔟 Dictionary & Translation Logic
// =====================================================

async function translateToZh(text) {
    if (TranslationCache.has(text)) {
        return TranslationCache.get(text);
    }
    
    try {
        const params = new URLSearchParams({
            q: text,
            langpair: "en|zh-TW"
        });
        
        const res = await fetch(`${CONFIG.TRANSLATION_API}?${params}`);
        const transData = await res.json();
        const result = transData.responseData?.translatedText || "";
        
        TranslationCache.set(text, result);
        return result;
    } catch (error) {
        console.warn("Translation failed:", error);
        return "";
    }
}

async function lookupWord(word) {
    word = word.trim().toLowerCase();
    if (!word) return;
    
    GameState.currentLookupWord = word;
    
    const dictionaryPopup = DOM.dictionaryPopup();
    const dictionaryWord = DOM.dictionaryWord();
    const dictionaryContent = DOM.dictionaryContent();
    
    if (!dictionaryPopup || !dictionaryWord || !dictionaryContent) return;
    
    dictionaryPopup.classList.remove("hidden");
    dictionaryWord.textContent = word;
    
    const dictionaryPhonetic = DOM.dictionaryPhonetic();
    if (dictionaryPhonetic) dictionaryPhonetic.textContent = "Loading...";
    dictionaryContent.innerHTML = "🔎 正在查字典與翻譯...";
    
    const dictionaryAudio = DOM.dictionaryAudio();
    if (dictionaryAudio) dictionaryAudio.disabled = false;
    
    AudioManager.speak(word);
    
    try {
        const response = await fetch(`${CONFIG.DICTIONARY_API}${encodeURIComponent(word)}`);
        if (!response.ok) throw new Error("Word not found");
        
        const data = await response.json();
        if (!data || !data.length) throw new Error("No dictionary result");
        
        const entry = data[0];
        
        const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text && p.text.trim())?.text;
        if (dictionaryPhonetic) dictionaryPhonetic.textContent = phonetic || "";
        
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
                    AudioManager.setAudio(blobUrl, word);
                })
                .catch(() => {
                    AudioManager.speak(word);
                });
        }
        
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
                    
                    (async () => {
                        const zhText = await translateToZh(def.definition);
                        const zhDisplay = zhText ? `<br><span style="color: #2b6cb0; font-size: 0.9em;">🇹🇼 ${zhText}</span>` : "";
                        div.innerHTML = `<strong>${index + 1}.</strong> ${def.definition}${zhDisplay}`;
                    })();
                    
                    div.innerHTML = `<strong>${index + 1}.</strong> ${def.definition}`;
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
        console.warn("Dictionary lookup failed:", error);
        if (dictionaryPhonetic) dictionaryPhonetic.textContent = "";
        dictionaryContent.innerHTML = "<p>⚠️ 字典 API 連線異常，仍可點擊發音按鈕收聽語音。</p>";
    }
}

function closeDictionary() {
    const dictionaryPopup = DOM.dictionaryPopup();
    if (dictionaryPopup) dictionaryPopup.classList.add("hidden");
}

function playCurrentAudio() {
    AudioManager.play();
}

// =====================================================
// 1️⃣1️⃣ Article Loader & Custom Text Management
// =====================================================

async function loadArticlesFromGit() {
    const articleSelectContainer = document.querySelector(".article-selector");
    const articleContainer = DOM.articleContainer();
    const customTextInput = DOM.customTextInput();
    
    if (!articleSelectContainer) return;
    
    try {
        const response = await fetch("./articles.json");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const rootData = await response.json(); // 傳入樹狀資料 { options: [...] }
        
        // 重置選單容器
        articleSelectContainer.innerHTML = "";
        
        // 遞迴/動態創建選單的函式
        function buildSelectMenu(currentBranch, level = 0) {
            // 清除當前層級之後的所有舊選單 (避免選單殘留)
            const existingSelects = articleSelectContainer.querySelectorAll(`select[data-level]`);
            existingSelects.forEach(sel => {
                if (parseInt(sel.dataset.level, 10) >= level) {
                    sel.remove();
                }
            });

            // 如果該節點沒有子選項，代表已經到達最終文章節點
            if (!currentBranch || !currentBranch.options) {
                renderArticle(currentBranch);
                return;
            }

            // 清空舊文章顯示
            clearContent();

            // 創建新的下拉選單
            const select = document.createElement("select");
            select.dataset.level = level;

            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = `-- 請選擇第 ${level + 1} 層項目 --`;
            select.appendChild(defaultOption);

            currentBranch.options.forEach((item, index) => {
                const option = document.createElement("option");
                option.value = index; // 使用陣列 index 作為 value
                option.textContent = item.title || item.name || `選項 ${index + 1}`;
                select.appendChild(option);
            });

            // 監聽選單變更
            select.addEventListener("change", (e) => {
                const selectedIndex = e.target.value;
                if (selectedIndex === "") {
                    // 清除後續選單與內容
                    buildSelectMenu(null, level + 1);
                    return;
                }
                
                const nextNode = currentBranch.options[selectedIndex];
                // 渲染下一層或顯示文章內容
                buildSelectMenu(nextNode, level + 1);
            });

            articleSelectContainer.appendChild(select);
        }

        // 渲染文章內容
        function renderArticle(articleNode) {
            if (articleNode && (articleNode.content || articleNode.title)) {
                if (articleContainer) {
                    articleContainer.innerHTML = `
                        <h3>${articleNode.title || '無標題'}</h3>
                        <p>${articleNode.content || ''}</p>
                    `;
                }
                if (customTextInput) {
                    customTextInput.value = articleNode.content || "";
                }
            } else {
                clearContent();
            }
        }

        // 清空顯示區域
        function clearContent() {
            if (articleContainer) articleContainer.innerHTML = "";
            if (customTextInput) customTextInput.value = "";
        }

        // 開始繪製第一層
        buildSelectMenu(rootData, 0);

    } catch (error) {
        console.error("Failed to load articles.json:", error);
        if (articleContainer) {
            articleContainer.innerHTML = "<p>⚠️ 無法載入文章選單，請檢查 articles.json 檔案路徑。</p>";
        }
    }
}


function handleStartCustomText() {
    const input = DOM.customTextInput()?.value.trim();
    if (!input || input.length < CONFIG.MIN_CUSTOM_TEXT_LENGTH) {
        setStatus("⚠️ 請輸入至少 5 個字元的文章內容！");
        return;
    }
    
    GameState.reset();
    GameState.pdfText = input;
    GameState.createLevels(input, CONFIG.CHARS_PER_LEVEL);
    
    updateLevelSelect();
    const gameArea = DOM.gameArea();
    if (gameArea) gameArea.classList.remove("hidden");
    
    showLevel();
    setStatus(`✅ 已載入自訂文章！共 ${GameState.getTotalLevels()} 個關卡`);

    // Hide the entire article mode section
    const articleModePanel = DOM.articleModePanel();
    if (articleModePanel) {
        articleModePanel.classList.add("hidden"); 
        // Or use inline style if you don't use CSS classes:
        // articleModePanel.style.display = "none";
    }
}


async function handleAddAndDownload() {
    const titleInput = DOM.newTitle();
    const contentInput = DOM.newContent();
    
    const title = titleInput?.value.trim();
    const content = contentInput?.value.trim();
    
    if (!title || !content) {
        alert("請填寫標題與內容！");
        return;
    }
    
    let articles = [];
    try {
        const res = await fetch("./articles.json");
        if (res.ok) articles = await res.json();
    } catch (e) {
        console.warn("Could not load existing articles.json, creating new file.");
    }
    
    const newArticle = {
        id: "art_" + Date.now(),
        title: title,
        content: content
    };
    
    articles.push(newArticle);
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(articles, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "articles.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    
    if (titleInput) titleInput.value = "";
    if (contentInput) contentInput.value = "";
}

// =====================================================
// 1️⃣2️⃣ Event Handlers & Utility Functions
// =====================================================

async function handlePDFUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
        setStatus("❌ 請選擇 PDF 檔案");
        return;
    }
    
    try {
        setStatus("📖 正在讀取 PDF...");
        const arrayBuffer = await file.arrayBuffer();
        const loadedPdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        GameState.loadedPdfDoc = loadedPdfDoc;
        
        const pdfName = DOM.pdfName();
        const pdfPages = DOM.pdfPages();
        if (pdfName) pdfName.textContent = file.name;
        if (pdfPages) pdfPages.textContent = `(共 ${loadedPdfDoc.numPages} 頁)`;
        
        setupPageRangeUI(loadedPdfDoc.numPages);
        await processPDF(loadedPdfDoc, 1, loadedPdfDoc.numPages);
        
    } catch (error) {
        console.error("PDF Error:", error);
        setStatus("❌ PDF 讀取失敗：" + error.message);
    }
}

async function handleLoadURL() {
    const pdfUrl = DOM.pdfUrl();
    const url = pdfUrl?.value?.trim();
    
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
        const loadedPdfDoc = await pdfjsLib.getDocument({ url }).promise;
        
        GameState.loadedPdfDoc = loadedPdfDoc;
        
        const pdfName = DOM.pdfName();
        const pdfPages = DOM.pdfPages();
        if (pdfName) pdfName.textContent = getFileNameFromURL(url);
        if (pdfPages) pdfPages.textContent = `(共 ${loadedPdfDoc.numPages} 頁)`;
        
        setupPageRangeUI(loadedPdfDoc.numPages);
        await processPDF(loadedPdfDoc, 1, loadedPdfDoc.numPages);
        
    } catch (error) {
        console.error("URL PDF Error:", error);
        setStatus("❌ 無法載入 PDF。可能是 CORS 限制。");
    }
}

async function handleApplyPageRange() {
    const startInput = DOM.pdfStartPageInput();
    const endInput = DOM.pdfEndPageInput();
    
    if (!GameState.loadedPdfDoc) {
        setStatus("⚠️ 請先載入 PDF 檔案！");
        return;
    }
    
    let start = parseInt(startInput?.value || "1", 10);
    let end = parseInt(endInput?.value || GameState.loadedPdfDoc.numPages, 10);
    const total = GameState.loadedPdfDoc.numPages;
    
    if (isNaN(start) || start < 1) start = 1;
    if (isNaN(end) || end > total) end = total;
    if (start > end) {
        setStatus("⚠️ 起始頁數不能大於結束頁數！");
        return;
    }
    
    if (startInput) startInput.value = start.toString();
    if (endInput) endInput.value = end.toString();
    
    await processPDF(GameState.loadedPdfDoc, start, end);
}

function handleTyping(event) {
    if (GameState.gameFinished) return;
    
    const typed = event.target.value;
    const target = GameState.getCurrentText();
    
    if (GameState.startTime === null && typed.length > 0) {
        GameState.startTime = Date.now();
    }
    
    updateCharacterDisplay(typed, target);
    updateStats();
    
    if (typed.length >= target.length) {
        finishLevel();
    }
}

function handleLevelSelect(e) {
    const levelIndex = parseInt(e.target.value, 10);
    if (!isNaN(levelIndex) && levelIndex >= 0 && levelIndex < GameState.getTotalLevels()) {
        GameState.currentLevel = levelIndex;
        showLevel();
    }
}

function switchMode(mode) {
    const pdfPanel = DOM.pdfModePanel();
    const articlePanel = DOM.articleModePanel();
    const pdfBtn = DOM.pdfModeBtn();
    const articleBtn = DOM.articleModeBtn();
    
    if (mode === "pdf") {
        if (pdfPanel) pdfPanel.classList.remove("hidden");
        if (articlePanel) articlePanel.classList.add("hidden");
        if (pdfBtn) pdfBtn.classList.add("active");
        if (articleBtn) articleBtn.classList.remove("active");
    } else {
        if (pdfPanel) pdfPanel.classList.add("hidden");
        if (articlePanel) articlePanel.classList.remove("hidden");
        if (pdfBtn) pdfBtn.classList.remove("active");
        if (articleBtn) articleBtn.classList.add("active");
    }
}

function setStatus(msg) {
    const pdfStatus = DOM.pdfStatus();
    const articleStatus = DOM.articleStatus();
    if (pdfStatus) pdfStatus.textContent = msg;
    if (articleStatus) articleStatus.textContent = msg;
}

function getFileNameFromURL(url) {
    try {
        const pathname = new URL(url).pathname;
        return pathname.substring(pathname.lastIndexOf('/') + 1) || "Document.pdf";
    } catch {
        return "Document.pdf";
    }
}

// =====================================================
// 1️⃣3️⃣ App Initialization Trigger
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    if (typeof pdfjsLib !== "undefined") {
        pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDF_WORKER;
    }
    
    initializeEventListeners();
    initializeWordClickDelegation();
    initializeFormToggle();
    loadArticlesFromGit();
});
