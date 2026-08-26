/* =====================================================
   Typing Game - Complete Optimized Code v2.0
   ===================================================== */

// =====================================================
// 1️⃣ Global Configuration
// =====================================================

const CONFIG = {
    PDF_WORKER: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",   // 設定 PDF.js 所需的 Web Worker 檔案來源
    PDF_LINE_HEIGHT_THRESHOLD: 5,      // 設定 PDF 文字行的高度判斷閾值
    
    CHARS_PER_LEVEL: 500,               // 設定每層級/關卡包含字數上限，用於閱讀進度計算或內容分段
    MIN_TEXT_LENGTH: 20,               // 設定有效文字的最少字數限制
    MIN_CUSTOM_TEXT_LENGTH: 5,         // 設定自訂文字的最少字數限制
    
    SPEECH_RATE: 0.9,                  // 設定語音合成TTS朗讀語速
    SPEECH_LANG: "en-US",               // 設定語音發音與文字朗讀的預設語言
    
    TRANSLATION_CACHE_SIZE: 100,         // 設定翻譯結果快取的容量上限
    
    DICTIONARY_API: "https://api.dictionaryapi.dev/api/v2/entries/en/",   // 設定英文字典API網址，查詢單字定義、發音與詞性
    TRANSLATION_API: "https://api.mymemory.translated.net/get",         // 設定MyMemory免費翻譯服務API網址
};

// Global state to store current selected article object
let currentSelectedArticle = null;

// =====================================================
// 2️⃣ Game State Management
// =====================================================

const GameState = {
    pdfText: "",            // 儲存從 PDF 檔案中提取出來的完整純文字內容
    levels: [],             // 儲存將文章分割後關卡或章節陣列（如依據字數分成各Level資料）
    currentLevel: 0,        // 紀錄 目前所在 或 正閱讀關卡index值
    startTime: null,         // 紀錄活動,閱讀開始時間戳記（null代表尚未開始），可用計算總耗時
    gameFinished: false,     // 標記遊戲,閱讀測驗 是否已完成 
    currentAnnotations: [],   // 儲存當前文章所對應 中文註解/翻譯標註清單
    
    currentAudio: null,         // 儲存當前正在播放的 Audio 物件實例
    currentLookupWord: "",      // 儲存使用者目前正在點擊或查詢的單字字串
    
    loadingState: "idle", // "idle" | "loading" | "loaded"      // 紀錄系統當前資料載入狀態（idle=閒置、loading=載入中、loaded=載入完成)
    loadedPdfDoc: null,
    
    reset() {
        this.pdfText = "";					// 清空儲存的 PDF 完整文章文字
        this.levels = [];					// 清空分割後的關卡/章節資料陣列
        this.currentLevel = 0;				// 將當前關卡索引值歸零（回到第一關）
        this.startTime = null;				// 重置開始時間戳記（設為 null 表示尚未開始計時）
        this.gameFinished = false;			// 將遊戲/測驗完成狀態重新設定為未完成（false）
        this.currentLookupWord = "";		// 清空目前正在查詢或標示的單字字串
        this.loadingState = "idle";		// 將系統載入狀態恢復為閒置狀態（"idle"）
        this.currentAnnotations = [];		// 清空當前文章對應的中文註解與標註清單
    },
    
    setLoading(state) {
        this.loadingState = state;		    // 設定並更新系統目前的載入狀態（例如傳入 "idle"、"loading" 或 "loaded"）
    },
    
    createLevels(text, charsPerLevel) {			    		// 呼叫切分關卡演算法，將文字分成多個關卡並存入state，最後回傳關卡陣列
        this.levels = createLevels(text, charsPerLevel);		// 呼叫全域/外部createLevels函式進行文字切分，並更新內部levels 屬性
        return this.levels;								    // 回傳處理好的關卡陣列
    },
    
    getCurrentText() {										    // 取得「當前關卡」對應的文字內容
        return this.levels[this.currentLevel] || "";			// 依據 currentLevel索引值取出陣列內容；若超出範圍(如無資料)回傳空字串 "" 防止報錯
    },
    
    getTotalLevels() {										    // 取得關卡的總數量
        return this.levels.length;								//回傳levels陣列的總長度
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
    
    categorySelect: () => document.getElementById("categorySelect"),
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
    const cache = new Map();                  			 //建立個私有Map物件，用來儲存「原文(Key)」與「翻譯結果(Value)
    const MAX_SIZE = CONFIG.TRANSLATION_CACHE_SIZE;      // 讀取全域設定檔中的快取數量上限（例如：100 筆）
    
    return {                            // 回傳一個包含多個操作方法的介面物件
        get(text) {                     // 根據傳入的原文text取出已快取的翻譯結果
            return cache.get(text);      
        },
        set(text, translation) {                                 // 寫入新的翻譯結果
            if (cache.size >= MAX_SIZE) {                        // 檢查快取是否已達到上限值
                const firstKey = cache.keys().next().value;      // 取出 Map 中最早被寫入的第一筆 key
                cache.delete(firstKey);                         // 刪除最早寫入的那筆資料，以騰出空間給新資料
            }
            cache.set(text, translation);               // 將新的原文與翻譯結果存入快取中
        },
        has(text) {                       
            return cache.has(text);          // 檢查指定的原文 text 是否已經存在於快取中 回傳布林值 (true/false)
        },
        clear() {
            cache.clear();               // 清空整個快取，刪除所有儲存的翻譯資料
        },
        size() {
            return cache.size;         // 取得當前快取中已儲存資料總筆數
        },
    };
})();

// =====================================================
// Audio Management System  音訊管理系統
// =====================================================

const AudioManager = {                 	 // 定義一個名為 AudioManager 的物件
    currentAudio: null,                  // 儲存當前正在使用或準備播放的音訊物件實例
    
    setAudio(audioUrl, fallbackWord) {         	// 設定新的音訊來源，需傳入音訊檔網址 (audioUrl) 與備用單字 (fallbackWord
        this.stopCurrent();                     // 在建立新音訊之前，先停止並清除前一次正在播放的語音
        
        const audioObj = new Audio(audioUrl);            // 建立原生 HTML5 Audio 物件實例並載入音訊網址
        this.currentAudio = {                            // 將實例與播放邏輯封裝並賦值給 currentAudio 屬性
            element: audioObj,                           // 儲存原始的 Audio 元素 reference
            play: () => {                                // 定義播放方法
                audioObj.play().catch(() => {            // 嘗試播放音訊檔案
                    console.warn("Audio play failed, falling back to Web Speech API");      // 若音訊播放失敗
                    this.speak(fallbackWord);                          // 自動呼叫內建的語音合成(Web Speech API)來朗讀傳入備用單字
                });
            }
        };
    },
    
    speak(text) {										// 定義Speak方法，接收欲進行語音朗讀的文字字串(text) 
        if ('speechSynthesis' in window) {				// 檢查當前使用者瀏覽器是否支援Web Speech API speechSynthesis語音合成功能
            window.speechSynthesis.cancel();			 // 強制停止/取消當前正播放,排隊中所有語音，避免聲音重疊,積壓
            const utterance = new SpeechSynthesisUtterance(text);	  // 建立新語音朗讀物件Obj (SpeechSynthesisUtterance)，並帶入要發音文字
            utterance.lang = CONFIG.SPEECH_LANG;		  		      // 建立新語音朗讀物件Obj (SpeechSynthesisUtterance)，並帶入要發音文字
            utterance.rate = CONFIG.SPEECH_RATE;					  // 設定朗讀的語言（取自全域設定檔 CONFIG，例如 "en-US"）
            window.speechSynthesis.speak(utterance);			  	  // 呼叫瀏覽器語音合成服務，開始進行文字語音朗讀
        } else {
            console.warn("Browser does not support SpeechSynthesis API");    // 若瀏覽器不支援 SpeechSynthesis API，於控制台印出警告訊息
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

const EventManager = {			// 定義一個名為 EventManager 的物件，用於統一管理與清理 DOM 事件監聽器
    listeners: [],			    // 建立私有陣列，用來儲存所有已註冊的事件資訊（包含 DOM 元素、事件類型與處理函式）
    
    attach(element, event, handler) {		     // 單一事件綁定方法：接收DOM元素(element)、事件類型(event)與事件處理函式(handler)
        if (!element) return;				     // 安全檢查：若傳入的 DOM 元素不存在（null 或 undefined），則直接結束不執行
        
        element.addEventListener(event, handler);		        // 替 DOM 元素掛載指定的事件監聽器
        
        this.listeners.push({ element, event, handler });	     // 將本次綁定的資訊封裝成物件，存入 listeners 陣列中以便後續追蹤與移除
    },
    
    attachAll(config) {			    // 批次事件綁定方法：接收一個包含多個事件設定陣列的設定檔 (config)
        config.forEach(([element, event, handler]) => {		  // 使用解構賦值(Destructuring)取出每設定項 [element,event,handler]
            this.attach(element, event, handler);            // 逐一呼叫 attach 方法進行綁定
        });
    },
    
    removeAll() {				    										    // 一鍵移除所有已註冊事件的方法
        this.listeners.forEach(({ element, event, handler }) => {			    // 巡覽 listeners 陣列中的每一個事件紀錄
            if (element) element.removeEventListener(event, handler);			// 若元素仍然存在於 DOM 中，則將當初綁定的事件監聽器移除
        });
        
        this.listeners = [];        		// 清空紀錄陣列，釋放記憶體
    }
};

// =====================================================
// Initialization  初始化
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

function initializeWordClickDelegation() {   		// 初始化單字點擊事件的委派（Event Delegation）監聽器
    const textDisplay = DOM.textDisplay();   		// 取得用於顯示文章內容的 DOM 元素
    if (!textDisplay) return;               		// 若找不到該顯示元素，則直接結束函式以防止報錯
    
    textDisplay.addEventListener("click", (e) => {             // 在父層容器上記錄點擊事件（採用事件委派，不必為每個字母個別綁定事件）
        if (!e.target.classList.contains("char")) return;      // 檢查被點擊的目標元素是否帶有 "char" 類別，若不是則忽視該點擊
        
        const clickedChar = e.target;               // 記錄當前被點擊的字母 HTML 元素
        let word = "";                              // 初始化用於組合完整單字的字串變數
        let current = clickedChar;                  // 建立指標變數，預設指向點擊的字母元素
        
        while (current && /^[A-Za-z]$/.test(current.textContent)) {    // 【第一階段：向左尋找】從被點擊字母開始，往前（左）檢查前一個兄弟節點是否為英文字母
            word = current.textContent + word;                         // 將字母串接在單字前方（因為是倒回去找）
            current = current.previousElementSibling;                  // 指標移至前一個 HTML 兄弟元素
        }
        current = clickedChar;                                             // 重置指標回到被點擊字母元素
        while (current && /^[A-Za-z]$/.test(current.textContent)) {        //【第二階段：向右尋找】從被點擊字母開始，往後(右)檢查後個兄弟節點是否英文
            if (current !== clickedChar) word += current.textContent;      // 避免重複計算被點擊的字母（第一階段已計入），將後續字母串接在單字後方
            current = current.nextElementSibling;                  			// 指標移至後一個 HTML 兄弟元素
        }
        if (word) {
            lookupWord(word.toLowerCase().trim());         // 將單字轉為小寫並去除首尾空白，然後傳給查單字函式 lookupWord
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

function createLevels(text, charsPerLevel, delimiter = null) {      // 定義切分關卡的函式，接收文本 (text)、每關目標字數 (charsPerLevel)，以及可選切分分隔符號

    if (delimiter && text.includes(delimiter)) {        		// 若有傳入 delimiter 且文本中包含該分隔符號 (例如 "[NEXT]" 或 "\n\n")
        return text
            .split(delimiter)                           // 依照分隔符號將文本切分成陣列
            .map(chunk => chunk.trim())               	// 切除每一段落前後的空白字元
            .filter(chunk => chunk.length > 0);       	// 過濾掉空字串，確保只保留有內容的段落 
    }
    const result = [];                                             // 儲存最終切分出來的所有關卡文本
    const cleanText = text.replace(/[ \t]+/g, " ").trim();         // 將多個連續的空格或 Tab 縮排整理成單一空格，並去除全清單首尾空白
    let start = 0;                                                	// 紀錄當前切分的起始字元索引 (Index)
    
    while (start < cleanText.length) {                                    // 迴圈讀取文本，直到處理完最後一個字元
        let end = Math.min(start + charsPerLevel, cleanText.length);      // 先計算預設的結束位置（起始位置 + 每關目標字數），但不能超過文本總長度
        if (end < cleanText.length) {                                     // 如果算出的結束位置尚未到達文本末端，則尋找最佳的「斷句/斷詞」點
            const sentenceEnd = cleanText.lastIndexOf(".", end);           // 從預設 end 位置往回搜尋最近的句號 (.)、問號 (?) 或驚嘆號 (!)
            const questionEnd = cleanText.lastIndexOf("?", end);            
            const exclamationEnd = cleanText.lastIndexOf("!", end);
            const bestSentenceEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd);
            const spaceEnd = cleanText.lastIndexOf(" ", end);
            
            if (bestSentenceEnd > start + 300) {
                end = bestSentenceEnd + 1;
            } else if (spaceEnd > start + 300) {
                end = spaceEnd;
            }
        }  
        const levelText = cleanText.slice(start, end).trim();
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
    
    const currentAnnotations = GameState.currentAnnotations || [];      // Pass current level text and Chinese annotations to renderText
    renderText(text, currentAnnotations);
    
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

function renderText(text, annotations = []) {
    const textDisplay = DOM.textDisplay();
    if (!textDisplay) return;
    
    textDisplay.innerHTML = "";

    // Split text keeping words, spaces, and punctuations
    const tokens = text.split(/(\s+|[^\w\s]+)/);

    let globalCharIndex = 0;

    tokens.forEach(token => {
        // Find matching Chinese annotation for the current word token
        const matchedAnnotation = annotations.find(
            a => a.word.toLowerCase() === token.toLowerCase()
        );

        // Wrap with <ruby> if annotation exists, otherwise use Fragment
        const tokenContainer = matchedAnnotation ? document.createElement("ruby") : document.createDocumentFragment();

        for (let j = 0; j < token.length; j++) {
            const char = token[j];
            const span = document.createElement("span");
            span.className = "char";
            span.textContent = char;
            
            span.dataset.index = globalCharIndex;

            if (globalCharIndex === 0) span.classList.add("current");
            if (/^[A-Za-z]$/.test(char)) span.classList.add("clickable-word");

            tokenContainer.appendChild(span);
            globalCharIndex++;
        }

        // Add <rt> for displaying Chinese annotation above word
        if (matchedAnnotation) {
            const rt = document.createElement("rt");
            rt.className = "word-note";
            rt.textContent = matchedAnnotation.note;
            tokenContainer.appendChild(rt);
        }

        textDisplay.appendChild(tokenContainer);
    });
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
    
    let correct = 0;
    for (let i = 0; i < typed.length && i < target.length; i++) {
        if (typed[i] === target[i]) correct++;
    }
    
    const accuracy = typed.length > 0 ? (correct / typed.length) * 100 : 100;
    const accuracyDisplay = DOM.accuracyDisplay();
    if (accuracyDisplay) accuracyDisplay.textContent = `${accuracy.toFixed(1)}%`;
    
    const progress = target.length > 0 ? Math.min((typed.length / target.length) * 100, 100) : 0;
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
        const maxX = container.offsetWidth - image.offsetWidth;
        const correctRatio = target.length > 0 ? Math.min(correct / target.length, 1) : 0;
        const currentX = maxX * correctRatio;
        image.style.left = `${currentX}px`;
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
    const categorySelect = DOM.categorySelect();
    const articleSelect = DOM.articleSelect();
    const articleContainer = DOM.articleContainer();
    const customTextInput = DOM.customTextInput();
    
    if (!categorySelect || !articleSelect) return;
    
    try {
        const response = await fetch("./articles.json");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const categories = await response.json();
        
        // 1. Initialize category options　
        categorySelect.innerHTML = '<option value="">-- 選擇分類 --</option>';
        articleSelect.innerHTML = '<option value="">-- 請先選擇分類 --</option>';
        articleSelect.disabled = true;
        
        categories.forEach((cat, index) => {
            const option = document.createElement("option");
            option.value = index;
            option.textContent = cat.category;
            categorySelect.appendChild(option);
        });
        
        // 2. On Category Change: populate article options
        categorySelect.addEventListener("change", (e) => {
            const catIndex = e.target.value;
            
            articleSelect.innerHTML = '<option value="">-- 選擇一篇文章 --</option>';
            if (customTextInput) customTextInput.value = "";
            if (articleContainer) articleContainer.innerHTML = "";
            currentSelectedArticle = null;
            
            if (catIndex === "") {
                articleSelect.disabled = true;
                return;
            }
            
            const selectedCategory = categories[catIndex];
            if (selectedCategory && selectedCategory.articles) {
                selectedCategory.articles.forEach(article => {
                    const option = document.createElement("option");
                    option.value = article.id;
                    option.textContent = article.title;
                    articleSelect.appendChild(option);
                });
                articleSelect.disabled = false;
            }
        });

        // 3. On Article Change: load article content and store metadata
        articleSelect.addEventListener("change", (e) => {
            const selectedCatIndex = categorySelect.value;
            const selectedId = e.target.value;
            
            if (selectedCatIndex === "" || !selectedId) {
                if (articleContainer) articleContainer.innerHTML = "";
                if (customTextInput) customTextInput.value = "";
                currentSelectedArticle = null;
                return;
            }

            const currentArticles = categories[selectedCatIndex].articles || [];
            const selectedArticle = currentArticles.find(a => a.id === selectedId);
            
            if (selectedArticle) {
                currentSelectedArticle = selectedArticle;
                
                if (articleContainer) {
                    articleContainer.innerHTML = `
                        <h3>${selectedArticle.title}</h3>
                        <p>${selectedArticle.content}</p>
                    `;
                }
                if (customTextInput) {
                    customTextInput.value = selectedArticle.content;
                }
            }
        });
        
    } catch (error) {
        console.error("Failed to load articles.json:", error);
        if (articleContainer) {
            articleContainer.innerHTML = "<p>⚠️ 無法載入 articles.json 檔案路徑。</p>";
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


    if (currentSelectedArticle && currentSelectedArticle.annotations) {              // 帶入中文註解
        GameState.currentAnnotations = currentSelectedArticle.annotations;
    } else {
        GameState.currentAnnotations = [];
    }

    const customChars = currentSelectedArticle?.charsPerLevel || CONFIG.CHARS_PER_LEVEL; // 讀取 JSON 設定：優先使用文章自訂字數或斷點，沒有則使用系統預設值
    const customDelimiter = currentSelectedArticle?.delimiter || null;

    GameState.levels = createLevels(input, customChars, customDelimiter);        // 產生關卡
    
    updateLevelSelect();
    const gameArea = DOM.gameArea();
    if (gameArea) gameArea.classList.remove("hidden");
    
    showLevel();
    setStatus(`✅已載入自訂文章！共 ${GameState.getTotalLevels()} 個關卡`);

    const articleModePanel = DOM.articleModePanel();
    if (articleModePanel) {
        articleModePanel.classList.add("hidden"); 
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
