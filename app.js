/* =====================================================
   Typing Game - 完全優化版本 v2.0
   所有功能 + 性能優化 + 代碼品質改進
   ===================================================== */

// =====================================================
// 1️⃣ 全局配置 (集中管理所有常數)
// =====================================================

const CONFIG = {
    // PDF 相關
    PDF_WORKER: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
    PDF_LINE_HEIGHT_THRESHOLD: 5,
    
    // 遊戲設定
    CHARS_PER_LEVEL: 500,
    MIN_TEXT_LENGTH: 20,
    MIN_CUSTOM_TEXT_LENGTH: 5,
    
    // 語音設定
    SPEECH_RATE: 0.9,
    SPEECH_LANG: "en-US",
    
    // 快取設定
    TRANSLATION_CACHE_SIZE: 100,
    
    // API 端點
    DICTIONARY_API: "https://api.dictionaryapi.dev/api/v2/entries/en/",
    TRANSLATION_API: "https://api.mymemory.translated.net/get",
};

// =====================================================
// 2️⃣ 遊戲狀態管理 (替代全局變數)
// =====================================================

const GameState = {
    // 遊戲數據
    pdfText: "",
    levels: [],
    currentLevel: 0,
    startTime: null,
    gameFinished: false,
    
    // 音頻
    currentAudio: null,
    currentLookupWord: "",
    
    // 加載狀態
    loadingState: "idle", // "idle" | "loading" | "loaded"
    loadedPdfDoc: null,
    
    /**
     * 重置遊戲狀態
     */
    reset() {
        this.pdfText = "";
        this.levels = [];
        this.currentLevel = 0;
        this.startTime = null;
        this.gameFinished = false;
        this.currentLookupWord = "";
        this.loadingState = "idle";
    },
    
    /**
     * 設定加載狀態
     */
    setLoading(state) {
        this.loadingState = state;
    },
    
    /**
     * 創建遊戲關卡
     */
    createLevels(text, charsPerLevel) {
        this.levels = createLevels(text, charsPerLevel);
        return this.levels;
    },
    
    /**
     * 獲取當前關卡文本
     */
    getCurrentText() {
        return this.levels[this.currentLevel] || "";
    },
    
    /**
     * 獲取關卡總數
     */
    getTotalLevels() {
        return this.levels.length;
    },
};

// =====================================================
// 3️⃣ DOM 元素管理
// =====================================================

const DOM = {
    // PDF 模式
    pdfModeBtn: () => document.getElementById("pdf-mode-btn"),
    articleModeBtn: () => document.getElementById("article-mode-btn"),
    pdfModePanel: () => document.getElementById("pdf-mode"),
    articleModePanel: () => document.getElementById("article-mode"),
    
    // PDF 加載
    pdfUpload: () => document.getElementById("pdf-upload"),
    pdfUrl: () => document.getElementById("pdf-url"),
    loadUrlBtn: () => document.getElementById("load-url-btn"),
    pdfStatus: () => document.getElementById("pdf-status"),
    pdfName: () => document.getElementById("pdf-name"),
    pdfPages: () => document.getElementById("pdf-pages"),
    
    // 頁數範圍
    pdfStartPageInput: () => document.getElementById("pdf-start-page"),
    pdfEndPageInput: () => document.getElementById("pdf-end-page"),
    applyPageRangeBtn: () => document.getElementById("apply-page-range-btn"),
    pageRangeContainer: () => document.getElementById("page-range-container"),
    
    // 遊戲區域
    gameArea: () => document.getElementById("game-area"),
    textDisplay: () => document.getElementById("text-display"),
    typingInput: () => document.getElementById("typing-input"),
    levelDisplay: () => document.getElementById("level-display"),
    levelSelect: () => document.getElementById("level-select"),
    prevBtn: () => document.getElementById("prev-btn"),
    nextBtn: () => document.getElementById("next-btn"),
    restartBtn: () => document.getElementById("restart-btn"),
    
    // 統計顯示
    accuracyDisplay: () => document.getElementById("accuracy"),
    wpmDisplay: () => document.getElementById("wpm"),
    progressDisplay: () => document.getElementById("progress"),
    
    // 字典
    dictionaryPopup: () => document.getElementById("dictionary-popup"),
    dictionaryWord: () => document.getElementById("dictionary-word"),
    dictionaryPhonetic: () => document.getElementById("dictionary-phonetic"),
    dictionaryAudio: () => document.getElementById("dictionary-audio"),
    dictionaryContent: () => document.getElementById("dictionary-content"),
    dictionaryClose: () => document.getElementById("dictionary-close"),
    
    // 自訂文章
    customTextInput: () => document.getElementById("custom-text-input"),
    startCustomTextBtn: () => document.getElementById("start-custom-text-btn"),
    articleStatus: () => document.getElementById("article-status"),
    
    // 文章管理
    articleSelect: () => document.getElementById("articleSelect"),
    articleContainer: () => document.getElementById("articleContainer"),
    contentTitle: () => document.getElementById("content-title"),
    contentSource: () => document.getElementById("content-source"),
    
    // 新增文章表單
    toggleFormBtn: () => document.getElementById("toggleFormBtn"),
    addArticleContainer: () => document.getElementById("addArticleContainer"),
    newTitle: () => document.getElementById("newTitle"),
    newContent: () => document.getElementById("newContent"),
    addAndDownloadBtn: () => document.getElementById("addAndDownloadBtn"),
};

// =====================================================
// 4️⃣ 翻譯快取系統
// =====================================================

const TranslationCache = (() => {
    const cache = new Map();
    const MAX_SIZE = CONFIG.TRANSLATION_CACHE_SIZE;
    
    return {
        /**
         * 獲取緩存的翻譯
         */
        get(text) {
            return cache.get(text);
        },
        
        /**
         * 保存翻譯到緩存
         */
        set(text, translation) {
            // 移除最舊的項目以保持大小限制
            if (cache.size >= MAX_SIZE) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            cache.set(text, translation);
        },
        
        /**
         * 檢查是否存在緩存
         */
        has(text) {
            return cache.has(text);
        },
        
        /**
         * 清空所有緩存
         */
        clear() {
            cache.clear();
        },
        
        /**
         * 獲取緩存大小
         */
        size() {
            return cache.size;
        },
    };
})();

// =====================================================
// 5️⃣ 音頻管理系統
// =====================================================

const AudioManager = {
    currentAudio: null,
    
    /**
     * 設定音頻檔案
     */
    setAudio(audioUrl, fallbackWord) {
        // 清理舊音頻
        this.stopCurrent();
        
        const audioObj = new Audio(audioUrl);
        this.currentAudio = {
            element: audioObj,
            play: () => {
                audioObj.play().catch(() => {
                    console.warn("音頻播放失敗，使用文字轉語音");
                    this.speak(fallbackWord);
                });
            }
        };
    },
    
    /**
     * 使用 Web Speech API 播放語音
     */
    speak(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = CONFIG.SPEECH_LANG;
            utterance.rate = CONFIG.SPEECH_RATE;
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("瀏覽器不支持 SpeechSynthesis API");
        }
    },
    
    /**
     * 播放當前音頻
     */
    play() {
        if (this.currentAudio?.play) {
            this.currentAudio.play();
        } else if (GameState.currentLookupWord) {
            this.speak(GameState.currentLookupWord);
        }
    },
    
    /**
     * 停止當前音頻
     */
    stopCurrent() {
        if (this.currentAudio?.element) {
            this.currentAudio.element.pause();
            this.currentAudio.element.currentTime = 0;
            this.currentAudio.element.src = "";
        }
        this.currentAudio = null;
    },
    
    /**
     * 銷毀音頻系統
     */
    destroy() {
        this.stopCurrent();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
};

// =====================================================
// 6️⃣ 事件管理器 (統一管理所有事件監聽)
// =====================================================

const EventManager = {
    listeners: [],
    
    /**
     * 附加單個事件監聽
     */
    attach(element, event, handler) {
        if (!element) return;
        element.addEventListener(event, handler);
        this.listeners.push({ element, event, handler });
    },
    
    /**
     * 批量附加事件監聽
     */
    attachAll(config) {
        config.forEach(([element, event, handler]) => {
            this.attach(element, event, handler);
        });
    },
    
    /**
     * 移除所有事件監聽
     */
    removeAll() {
        this.listeners.forEach(({ element, event, handler }) => {
            if (element) element.removeEventListener(event, handler);
        });
        this.listeners = [];
    }
};

// =====================================================
// 7️⃣ 初始化系統
// =====================================================

/**
 * 初始化所有事件監聽器
 */
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

/**
 * 初始化事件委託 (單詞點擊)
 */
function initializeWordClickDelegation() {
    const textDisplay = DOM.textDisplay();
    if (!textDisplay) return;
    
    textDisplay.addEventListener("click", (e) => {
        if (!e.target.classList.contains("char")) return;
        
        const clickedChar = e.target;
        let word = "";
        let current = clickedChar;
        
        // 向後收集字符
        while (current && /^[A-Za-z]$/.test(current.textContent)) {
            word = current.textContent + word;
            current = current.previousElementSibling;
        }
        
        // 向前收集字符
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

/**
 * 初始化表單切換
 */
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
// 8️⃣ PDF 處理函數
// =====================================================

/**
 * 設定頁數輸入框範圍
 */
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

/**
 * 提取頁面文本
 */
function extractPageText(textContent) {
    let result = "";
    let previousY = null;
    
    for (const item of textContent.items) {
        const text = item.str.trim();
        if (!text) continue;
        
        const currentY = item.transform ? item.transform[5] : null;
        
        // 判斷是否換行
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

/**
 * 清理 PDF 文本
 */
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

/**
 * 處理 PDF 並創建遊戲關卡
 */
async function processPDF(pdf, startPage = 1, endPage = null) {
    // 防止重複加載
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
        
        // 逐頁提取文本
        for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
            setStatus(`🔎 正在讀取第 ${pageNumber} / ${endPage} 頁...`);
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const pageText = extractPageText(textContent);
            allText += pageText + "\n\n";
        }
        
        // 清理文本
        setStatus("🧹 正在清理 PDF 文字...");
        GameState.pdfText = cleanPDFText(allText);
        
        if (!GameState.pdfText || GameState.pdfText.length < CONFIG.MIN_TEXT_LENGTH) {
            setStatus("❌ 所選頁數內搵唔到足夠文字。");
            GameState.setLoading("loaded");
            return;
        }
        
        // 創建關卡
        setStatus("🎮 正在建立遊戲關卡...");
        GameState.createLevels(GameState.pdfText, CONFIG.CHARS_PER_LEVEL);
        
        if (GameState.getTotalLevels() === 0) {
            setStatus("❌ 無法建立遊戲關卡");
            GameState.setLoading("loaded");
            return;
        }
        
        // 更新 UI
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
// 9️⃣ 關卡和遊戲邏輯
// =====================================================

/**
 * 創建遊戲關卡
 */
function createLevels(text, charsPerLevel) {
    const result = [];
    text = text.replace(/\s+/g, " ").trim();
    let start = 0;
    
    while (start < text.length) {
        let end = Math.min(start + charsPerLevel, text.length);
        
        // 在完整的句子末尾分割
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

/**
 * 顯示當前關卡
 */
function showLevel() {
    if (!GameState.getTotalLevels()) return;
    
    const text = GameState.getCurrentText();
    
    // 更新關卡顯示
    const levelDisplay = DOM.levelDisplay();
    if (levelDisplay) {
        levelDisplay.textContent = `Level ${GameState.currentLevel + 1} / ${GameState.getTotalLevels()}`;
    }
    
    const levelSelect = DOM.levelSelect();
    if (levelSelect) levelSelect.value = GameState.currentLevel.toString();
    
    // 渲染文本
    renderText(text);
    
    // 清空輸入框
    const typingInput = DOM.typingInput();
    if (typingInput) {
        typingInput.value = "";
        typingInput.disabled = false;
    }
    
    // 重置遊戲狀態
    GameState.gameFinished = false;
    GameState.startTime = null;
    
    updateStats();
    updateNavigationButtons();
    
    // 焦點到輸入框
    setTimeout(() => { 
        if (typingInput) typingInput.focus(); 
    }, 100);
}

/**
 * 渲染文本 (優化版：不在這裡綁定事件監聽)
 */
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

/**
 * 更新字符顯示狀態
 */
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
    
    // 滾動到當前字符
    const current = textDisplay.querySelector(".current");
    if (current) {
        current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}

/**
 * 更新遊戲統計
 */
function updateStats() {
    const typingInput = DOM.typingInput();
    if (!typingInput) return;
    
    const typed = typingInput.value;
    const target = GameState.getCurrentText();
    
    // 計算準確度
    let correct = 0;
    for (let i = 0; i < typed.length && i < target.length; i++) {
        if (typed[i] === target[i]) correct++;
    }
    
    const accuracy = typed.length > 0 ? (correct / typed.length) * 100 : 100;
    const accuracyDisplay = DOM.accuracyDisplay();
    if (accuracyDisplay) accuracyDisplay.textContent = `${accuracy.toFixed(1)}%`;
    
    // 計算進度
    const progress = target.length > 0 ? Math.min((typed.length / target.length) * 100, 100) : 0;
    const progressDisplay = DOM.progressDisplay();
    if (progressDisplay) progressDisplay.textContent = `${progress.toFixed(0)}%`;
    
    // 計算 WPM
    let wpm = 0;
    if (GameState.startTime !== null && typed.length > 0) {
        const elapsedMinutes = (Date.now() - GameState.startTime) / 1000 / 60;
        if (elapsedMinutes > 0) wpm = (correct / 5) / elapsedMinutes;
    }
    const wpmDisplay = DOM.wpmDisplay();
    if (wpmDisplay) wpmDisplay.textContent = Math.round(wpm);
}

/**
 * 完成當前關卡
 */
function finishLevel() {
    GameState.gameFinished = true;
    const typingInput = DOM.typingInput();
    if (typingInput) typingInput.disabled = true;
    
    updateStats();
    
    const accuracy = DOM.accuracyDisplay()?.textContent || "0%";
    const wpm = DOM.wpmDisplay()?.textContent || "0";
    
    if (GameState.currentLevel < GameState.getTotalLevels() - 1) {
        setStatus(`🎉 Level ${GameState.currentLevel + 1} 完成！ Accuracy: ${accuracy} | WPM: ${wpm}`);
    } else {
        setStatus(`🏆 全部完成！ Accuracy: ${accuracy} | WPM: ${wpm}`);
    }
}

/**
 * 導航到其他關卡
 */
function navigateLevel(direction) {
    const newLevel = GameState.currentLevel + direction;
    if (newLevel >= 0 && newLevel < GameState.getTotalLevels()) {
        GameState.currentLevel = newLevel;
        showLevel();
    }
}

/**
 * 更新導航按鈕狀態
 */
function updateNavigationButtons() {
    const prevBtn = DOM.prevBtn();
    const nextBtn = DOM.nextBtn();
    
    if (prevBtn) prevBtn.disabled = GameState.currentLevel === 0;
    if (nextBtn) nextBtn.disabled = GameState.currentLevel === GameState.getTotalLevels() - 1;
}

/**
 * 更新 Level 選單
 */
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
// 🔟 字典功能
// =====================================================

/**
 * 優化版翻譯函式 (使用緩存)
 */
async function translateToZh(text) {
    // 檢查緩存
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
        
        // 保存到緩存
        TranslationCache.set(text, result);
        
        return result;
    } catch (error) {
        console.warn("翻譯失敗:", error);
        return "";
    }
}

/**
 * 查詞
 */
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
    
    // 重置音頻按鈕
    const dictionaryAudio = DOM.dictionaryAudio();
    if (dictionaryAudio) dictionaryAudio.disabled = false;
    
    // 預設發音：使用文字轉語音
    AudioManager.speak(word);
    
    try {
        const response = await fetch(`${CONFIG.DICTIONARY_API}${encodeURIComponent(word)}`);
        if (!response.ok) throw new Error("Word not found");
        
        const data = await response.json();
        if (!data || !data.length) throw new Error("No dictionary result");
        
        const entry = data[0];
        
        // 顯示音標
        const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text && p.text.trim())?.text;
        if (dictionaryPhonetic) dictionaryPhonetic.textContent = phonetic || "";
        
        // 處理音頻
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
                    // 備用文字轉語音
                    AudioManager.speak(word);
                });
        }
        
        // 顯示定義
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
                    
                    // 非同步獲取繁體中文翻譯
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
        console.warn("字典查詢失敗:", error);
        if (dictionaryPhonetic) dictionaryPhonetic.textContent = "";
        dictionaryContent.innerHTML = "<p>⚠️ 字典 API 連線異常，仍可點擊發音按鈕收聽語音。</p>";
    }
}

/**
 * 關閉字典
 */
function closeDictionary() {
    const dictionaryPopup = DOM.dictionaryPopup();
    if (dictionaryPopup) dictionaryPopup.classList.add("hidden");
}

/**
 * 播放當前單詞音頻
 */
function playCurrentAudio() {
    AudioManager.play();
}

// =====================================================
// 1️⃣1️⃣ 自訂文章模式
// =====================================================

/**
 * 從文章列表加載
 */
async function loadArticlesFromGit() {
    const articleSelect = DOM.articleSelect();
    const articleContainer = DOM.articleContainer();
    
    if (!articleSelect) return;
    
    try {
        const response = await fetch("./articles.json");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const articles = await response.json();
        
        // 添加預設選項
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "選擇一篇文章...";
        articleSelect.appendChild(defaultOption);
        
        // 動態生成選項
        articles.forEach(article => {
            const option = document.createElement("option");
            option.value = article.id;
            option.textContent = article.title;
            articleSelect.appendChild(option);
        });
        
        // 監聽選項變化
        articleSelect.addEventListener("change", (e) => {
            const selectedId = e.target.value;
            const selectedArticle = articles.find(a => a.id === selectedId);
            
            if (selectedArticle) {
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

// =====================================================
// 1️⃣2️⃣ 事件處理函數
// =====================================================

/**
 * 處理 PDF 上傳
 */
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

/**
 * 處理 PDF URL 加載
 */
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

/**
 * 處理應用頁數範圍
 */
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
    
    // 邊界檢查
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

/**
 * 處理打字輸入
 */
function handleTyping(event) {
    if (GameState.gameFinished) return;
    
    const typed = event.target.value;
    const target = GameState.getCurrentText();
    
    // 啟動計時
    if (typed.length > 0 && GameState.startTime === null) {
        GameState.startTime = Date.now();
    }
    
    updateCharacterDisplay(typed, target);
    updateStats();
    
    // 檢查完成
    if (typed.length >= target.length && typed === target) {
        finishLevel();
    }
}

/**
 * 處理關卡選擇
 */
function handleLevelSelect(event) {
    const selectedLevel = parseInt(event.target.value, 10);
    if (!isNaN(selectedLevel) && selectedLevel >= 0 && selectedLevel < GameState.getTotalLevels()) {
        GameState.currentLevel = selectedLevel;
        showLevel();
    }
}

/**
 * 處理自訂文章開始
 */
function handleStartCustomText() {
    const customTextInput = DOM.customTextInput();
    const articleStatus = DOM.articleStatus();
    const rawText = customTextInput?.value?.trim();
    
    if (!rawText) {
        if (articleStatus) articleStatus.textContent = "⚠️ 請先輸入或貼上文字！";
        return;
    }
    
    const cleanedText = cleanPDFText(rawText);
    
    if (cleanedText.length < CONFIG.MIN_CUSTOM_TEXT_LENGTH) {
        if (articleStatus) articleStatus.textContent = "❌ 輸入的內容過短。";
        return;
    }
    
    GameState.createLevels(cleanedText, CONFIG.CHARS_PER_LEVEL);
    
    if (GameState.getTotalLevels() === 0) {
        if (articleStatus) articleStatus.textContent = "❌ 無法生成關卡。";
        return;
    }
    
    updateLevelSelect();
    
    const contentTitle = DOM.contentTitle();
    const contentSource = DOM.contentSource();
    if (contentTitle) contentTitle.textContent = "Custom Text";
    if (contentSource) contentSource.textContent = `Total Length: ${cleanedText.length} chars`;
    
    GameState.currentLevel = 0;
    const gameArea = DOM.gameArea();
    if (gameArea) gameArea.classList.remove("hidden");
    showLevel();
    
    if (articleStatus) articleStatus.textContent = `✅ 成功載入文章！共 ${GameState.getTotalLevels()} 個關卡`;
    gameArea?.scrollIntoView({ behavior: "smooth" });
}

/**
 * 處理新增文章並下載
 */
async function handleAddAndDownload() {
    const newTitle = DOM.newTitle();
    const newContent = DOM.newContent();
    
    const title = newTitle?.value?.trim();
    const content = newContent?.value?.trim();
    
    if (!title || !content) {
        alert("⚠️ 請填寫標題同埋內容！");
        return;
    }
    
    let articlesList = [];
    
    // 嘗試讀取現有 articles.json
    try {
        const response = await fetch("./articles.json");
        if (response.ok) {
            articlesList = await response.json();
        }
    } catch (err) {
        console.warn("未找到現有 articles.json");
    }
    
    // 建立新文章
    const newArticle = {
        id: "article-" + Date.now(),
        title: title,
        content: content
    };
    articlesList.push(newArticle);
    
    // 下載 JSON 檔案
    downloadJsonFile(articlesList, "articles.json");
    
    // 清空表單
    if (newTitle) newTitle.value = "";
    if (newContent) newContent.value = "";
    
    alert("✅ 已成功下載 articles.json！請將檔案覆蓋專案目錄並 git push。");
}

/**
 * 切換模式 (PDF / Article)
 */
function switchMode(mode) {
    const pdfModeBtn = DOM.pdfModeBtn();
    const articleModeBtn = DOM.articleModeBtn();
    const pdfModePanel = DOM.pdfModePanel();
    const articleModePanel = DOM.articleModePanel();
    
    if (mode === "pdf") {
        pdfModeBtn?.classList.add("active");
        articleModeBtn?.classList.remove("active");
        pdfModePanel?.classList.remove("hidden");
        articleModePanel?.classList.add("hidden");
    } else {
        articleModeBtn?.classList.add("active");
        pdfModeBtn?.classList.remove("active");
        articleModePanel?.classList.remove("hidden");
        pdfModePanel?.classList.add("hidden");
    }
}

// =====================================================
// 1️⃣3️⃣ 輔助函數
// =====================================================

/**
 * 設定狀態信息
 */
function setStatus(message) {
    const statusElement = DOM.pdfStatus() || DOM.articleStatus();
    if (statusElement) statusElement.textContent = message;
}

/**
 * 從 URL 獲取檔案名稱
 */
function getFileNameFromURL(url) {
    try {
        return new URL(url).pathname.split("/").pop() || "PDF Document";
    } catch {
        return "PDF Document";
    }
}

/**
 * 下載 JSON 檔案
 */
function downloadJsonFile(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// =====================================================
// 1️⃣4️⃣ 應用初始化 (主要入口)
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Typing Game 初始化開始...");
    
    try {
        // 初始化 PDF.js
        if (window.pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDF_WORKER;
            console.log("✅ PDF.js 已初始化");
        }
        
        // 初始化事件監聽
        initializeEventListeners();
        console.log("✅ 事件監聽已初始化");
        
        // 初始化事件委託 (單詞點擊)
        initializeWordClickDelegation();
        console.log("✅ 事件委託已初始化");
        
        // 初始化表單切換
        initializeFormToggle();
        console.log("✅ 表單切換已初始化");
        
        // 加載文章列表
        loadArticlesFromGit();
        console.log("✅ 文章列表已加載");
        
        console.log("✅ Typing Game 應用初始化完成！");
        
    } catch (error) {
        console.error("❌ 應用初始化失敗:", error);
    }
});

// 頁面卸載時清理資源
window.addEventListener("beforeunload", () => {
    AudioManager.destroy();
    EventManager.removeAll();
    TranslationCache.clear();
});

// =====================================================
// 確認應用已加載
// =====================================================

console.log("✅ app-optimized-v2.js 已成功加載！");