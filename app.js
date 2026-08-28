// ===================Global Configuration===================

const CONFIG = {
    PDF_WORKER: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",   // 設定 PDF.js 所需的 Web Worker 檔案來源
    PDF_LINE_HEIGHT_THRESHOLD: 5,      // 設定 PDF 文字行的高度判斷閾值
    
    CHARS_PER_LEVEL: 500,               // 設定每層級/關卡包含字數上限，用於閱讀進度計算或內容分段
    MIN_TEXT_LENGTH: 20,                // 設定有效文字的最少字數限制
    MIN_CUSTOM_TEXT_LENGTH: 5,          // 設定自訂文字的最少字數限制
    
    SPEECH_RATE: 0.9,                   // 設定語音合成TTS朗讀語速
    SPEECH_LANG: "en-US",               // 設定語音發音與文字朗讀的預設語言
    
    TRANSLATION_CACHE_SIZE: 100,         // 設定翻譯結果快取的容量上限
};

// Global state to store current selected article object
let currentSelectedArticle = null;

//  ===================Game State Management===================

const GameState = {
    pdfText: "",              // 儲存從 PDF 檔案中提取出來的完整純文字內容
    levels: [],               // 儲存將文章分割後關卡或章節陣列（如依據字數分成各Level資料）
    currentLevel: 0,          // 紀錄 目前所在 或 正閱讀關卡index值
    startTime: null,          // 紀錄活動,閱讀開始時間戳記（null代表尚未開始），可用計算總耗時
    gameFinished: false,      // 標記遊戲,閱讀測驗 是否已完成 
    currentAnnotations: [],   // 儲存當前文章所對應 中文註解/翻譯標註清單
    
    currentAudio: null,         // 儲存當前正在播放的 Audio 物件實例
    currentLookupWord: "",      // 儲存使用者目前正在點擊或查詢的單字字串
    
    loadingState: "idle", // "idle" | "loading" | "loaded"      // 紀錄系統當前資料載入狀態（idle=閒置、loading=載入中、loaded=載入完成)
    loadedPdfDoc: null,

    autoSpeakEnabled: false, // 預設關閉自動發音
    lastSpokenWordIndex: -1, // 避免同一個單字重複觸發發音
    
    reset() {
        this.pdfText = "";					   // 清空儲存的 PDF 完整文章文字
        this.levels = [];					   // 清空分割後的關卡/章節資料陣列
        this.currentLevel = 0;				// 將當前關卡索引值歸零（回到第一關）
        this.startTime = null;				// 重置開始時間戳記（設為 null 表示尚未開始計時）
        this.gameFinished = false;			// 將遊戲/測驗完成狀態重新設定為未完成（false）
        this.currentLookupWord = "";		// 清空目前正在查詢或標示的單字字串
        this.loadingState = "idle";		   // 將系統載入狀態恢復為閒置狀態（"idle"）
        this.currentAnnotations = [];		// 清空當前文章對應的中文註解與標註清單
        this.autoSpeakEnabled = false;
        this.lastSpokenWordIndex = -1;
    },
    
    setLoading(state) {
        this.loadingState = state;		    // 設定並更新系統目前的載入狀態（例如傳入 "idle"、"loading" 或 "loaded"）
    },
    
    createLevels(text, charsPerLevel, delimiter = null) {	// 呼叫切分關卡演算法，將文字分成多個關卡並存入state，最後回傳關卡陣列
        this.levels = createLevels(text, charsPerLevel, delimiter); // 呼叫全域/外部createLevels函式進行文字切分，並更新內部levels 屬性
        return this.levels;								          // 回傳處理好的關卡陣列
    },
    
    getCurrentText() {										          // 取得「當前關卡」對應的文字內容
        return this.levels[this.currentLevel] || "";			// 依據 currentLevel索引值取出陣列內容；若超出範圍(如無資料)回傳空字串 "" 防止報錯
    },
    
    getTotalLevels() {										       // 取得關卡的總數量
        return this.levels.length;								//回傳levels陣列的總長度
    },
};

// ===================DOM Element Selectors===================

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
    
    newCategory: () => document.getElementById("newCategory"),
    newTitle: () => document.getElementById("newTitle"),
    newContent: () => document.getElementById("newContent"),
    newCharsPerLevel: () => document.getElementById("newCharsPerLevel"),
    newDelimiter: () => document.getElementById("newDelimiter"),
    newAnnotations: () => document.getElementById("newAnnotations"),
    addAndDownloadBtn: () => document.getElementById("addAndDownloadBtn"),
    autoSpeakCheckbox: () => document.getElementById("auto-speak-checkbox"),
};

// ===================Translation Cache System===================

const TranslationCache = (() => {
    const cache = new Map();                  			    //建立個私有Map物件，用來儲存「原文(Key)」與「翻譯結果(Value)
    const MAX_SIZE = CONFIG.TRANSLATION_CACHE_SIZE;       // 讀取全域設定檔中的快取數量上限（例如：100 筆）
    
    return {                            // 回傳一個包含多個操作方法的介面物件
        get(text) {                     // 根據傳入的原文text取出已快取的翻譯結果
            return cache.get(text);      
        },
        set(text, translation) {                                 // 寫入新的翻譯結果
            if (cache.size >= MAX_SIZE) {                        // 檢查快取是否已達到上限值
                const firstKey = cache.keys().next().value;      // 取出 Map 中最早被寫入的第一筆 key
                cache.delete(firstKey);                          // 刪除最早寫入的那筆資料，以騰出空間給新資料
            }
            cache.set(text, translation);               // 將新的原文與翻譯結果存入快取中
        },
        has(text) {                       
            return cache.has(text);                   // 檢查指定的原文 text 是否已經存在於快取中 回傳布林值 (true/false)
        },
        clear() {
            cache.clear();                            // 清空整個快取，刪除所有儲存的翻譯資料
        },
        size() {
            return cache.size;                        // 取得當前快取中已儲存資料總筆數
        },
    };
})();

// ===================Audio Management System  音訊管理系統===================

const AudioManager = {
    currentAudio: null,

    async speakWord(word) {
        if (!word) return;
        
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(word);
            utterance.lang = "en-US";
            window.speechSynthesis.speak(utterance);
        }
    },

    stopCurrent() {
        if (this.currentAudio?.element) {
            this.currentAudio.element.pause();
            this.currentAudio.element.currentTime = 0;
        }
        this.currentAudio = null;
    },

    play() {
        if (this.currentAudio?.element) {
            this.currentAudio.element.play().catch(() => {
                if (GameState.currentLookupWord) {
                    this.speak(GameState.currentLookupWord);
                }
            });
        } else if (GameState.currentLookupWord) {
            this.speak(GameState.currentLookupWord);
        }
    },

    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = CONFIG.SPEECH_LANG || "en-US";
            utterance.rate = CONFIG.SPEECH_RATE || 0.9;
            window.speechSynthesis.speak(utterance);
        }
    },

    destroy() {
        this.stopCurrent();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
};

//  ======================Event Manager=====================

const EventManager = {			   // 定義一個名為 EventManager 的物件，用於統一管理與清理 DOM 事件監聽器
    listeners: [],			      // 建立私有陣列，用來儲存所有已註冊的事件資訊（包含 DOM 元素、事件類型與處理函式）
    
    attach(element, event, handler) {		     // 單一事件綁定方法：接收DOM元素(element)、事件類型(event)與事件處理函式(handler)
        if (!element) return;				        // 安全檢查：若傳入的 DOM 元素不存在（null 或 undefined），則直接結束不執行
        
        element.addEventListener(event, handler);		           // 替 DOM 元素掛載指定的事件監聽器
        
        this.listeners.push({ element, event, handler });	     // 將本次綁定的資訊封裝成物件，存入 listeners 陣列中以便後續追蹤與移除
    },
    
    attachAll(config) {			                                // 批次事件綁定方法：接收一個包含多個事件設定陣列的設定檔 (config)
        config.forEach(([element, event, handler]) => {		  // 使用解構賦值(Destructuring)取出每設定項 [element,event,handler]
            this.attach(element, event, handler);             // 逐一呼叫 attach 方法進行綁定
        });
    },
    removeAll() {				    										                   // 一鍵移除所有已註冊事件的方法
        this.listeners.forEach(({ element, event, handler }) => {			       // 巡覽 listeners 陣列中的每一個事件紀錄
            if (element) element.removeEventListener(event, handler);			// 若元素仍然存在於 DOM 中，則將當初綁定的事件監聽器移除
        });
        this.listeners = [];        		// 清空紀錄陣列，釋放記憶體
    }
};

// ===================Initialization  初始化===================

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
        [DOM.autoSpeakCheckbox(), "change", (e) => {
            GameState.autoSpeakEnabled = e.target.checked;
        }],
    ]);
}

function initializeWordClickDelegation() {   		// 初始化單字點擊事件的委派（Event Delegation）監聽器
    const textDisplay = DOM.textDisplay();   		// 取得用於顯示文章內容的 DOM 元素
    if (!textDisplay) return;               		   // 若找不到該顯示元素，則直接結束函式以防止報錯
    
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
            lookupWord(word.toLowerCase().trim());                        // 將單字轉為小寫並去除首尾空白，然後傳給查單字函式 lookupWord
        }
    });
}

function initializeFormToggle() {
    const toggleBtn = DOM.toggleFormBtn();                                        // 取得切換表單顯示/隱藏的按鈕 DOM 元素
    const container = DOM.addArticleContainer();                                  // 取得新增文章表單容器 DOM 元素
    
    if (!toggleBtn || !container) return;                                         // 安全檢查：若按鈕或容器任一不存在則直接結束
    
    toggleBtn.addEventListener("click", () => {                                   // 為按鈕綁定點擊 (click) 事件監聽器
        const isHidden = container.style.display === "none";                      // 檢查表單容器目前是否為隱藏狀態 (display === "none")
        container.style.display = isHidden ? "block" : "none";                    // 切換顯示狀態：若隱藏則顯示 (block)，若顯示則隱藏 (none)
        toggleBtn.textContent = isHidden ? "✖ 關閉新增表單" : "➕ 新增文章";       // 依切換後的狀態更新按鈕文字與圖示
    });
}

// ===================PDF Processing===================
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
        .replace(/\r\n/g, "\n")                                          // 將 Windows 換行符號 (\r\n) 統一替換為標準換行符號 (\n)
        .replace(/\r/g, "\n")                                            // 將 Mac 舊式換行符號 (\r) 統一替換為標準換行符號 (\n)
        .replace(/^\s*\d+\s*$/gm, "")                                    // 移除獨立成行的純數字頁碼（例如 "12"）
        .replace(/^\s*Page\s+\d+\s*$/gim, "")                            // 移除包含 Page 關鍵字的頁碼（例如 "Page 5"，忽略大小寫）
        .replace(/^\s*[-–—]\s*\d+\s*[-–—]\s*$/gm, "")                    // 移除帶有破折號格式的頁碼（例如 "- 3 -" 或 "— 4 —"）
        .replace(/([A-Za-z])-\s*\n\s*([A-Za-z])/g, "$1$2")               // 修復跨行連字號：將被換行截斷的英文單字合併（例如 "com-\nputer" 轉為 "computer"）
        .replace(/([a-zA-Z0-9,.;:!?])\n(?=[a-zA-Z0-9])/g, "$1 ")         // 將段落內不必要的硬換行替換為單一空格，使英文句子恢復連貫
        .replace(/[ \t]+/g, " ")                                         // 將多個連續的空格或 Tab 縮排整合為單一空格
        .replace(/\n{2,}/g, "\n")                                        // 將多個連續的換行符號整合為單一換行符號
        .replace(/\s+([,.!?;:])/g, "$1")                                 // 移除標點符號（逗號、句號等）前多餘的空白
        .replace(/\(\s+/g, "(")                                          // 移除左括號內側開頭的多餘空白
        .replace(/\s+\)/g, ")")                                          // 移除右括號內側結尾的多餘空白
        .split("\n")                                                     // 以換行符號將文字切割為字串陣列
        .map(line => line.trim())                                        // 切除每一行前後的多餘空白
        .filter(line => line.length > 0)                                 // 過濾並移除空行
        .join("\n")                                                      // 將整理後的每一行重新以換行符號連接起來
        .trim();                                                         // 切除整篇文本首尾的空白字元
}

async function processPDF(pdf, startPage = 1, endPage = null) {
    if (GameState.loadingState === "loading") {                           // 安全檢查：若目前已有 PDF 正在讀取處理中
        setStatus("⚠️ PDF 正在加載中，請稍候...");                         // 顯示警告提示訊息
        return;                                                           // 直接結束不重複執行
    }
    
    GameState.setLoading("loading");                                      // 將全域載入狀態設定為 "loading"
    setStatus("🔎 正在提取 PDF 文字...");                                  // 於狀態列顯示開始讀取提示

    try {
        const maxPages = pdf.numPages;                                    // 取得該 PDF 檔案的總頁數
        if (!endPage || endPage > maxPages) endPage = maxPages;           // 若未指定結束頁數或設定超出範圍，則預設讀取到最後一頁
        if (startPage < 1) startPage = 1;                                 // 確保起始頁數不小於第 1 頁
        
        let allText = "";                                                 // 初始化用來拼接所有頁面文字的字串變數
        
        for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {    // 逐頁讀取 PDF 內容
            setStatus(`🔎 正在讀取第 ${pageNumber} / ${endPage} 頁...`);           // 更新狀態列顯示當前處理頁數
            const page = await pdf.getPage(pageNumber);                           // 非同步獲取指定頁碼的頁面物件
            const textContent = await page.getTextContent();                      // 從頁面物件中解析提取原始文字內容
            const pageText = extractPageText(textContent);                        // 呼叫自訂函式提取並重組該頁的純文字
            allText += pageText + "\n\n";                                         // 將該頁文字拼接至總文字字串中（頁與頁之間以換行分隔）
        }
        
        setStatus("🧹 正在清理 PDF 文字...");                              // 更新狀態列顯示文字清理中
        GameState.pdfText = cleanPDFText(allText);                        // 呼叫 cleanPDFText 進行格式修復與淨化，並寫入全域狀態
        
        if (!GameState.pdfText || GameState.pdfText.length < CONFIG.MIN_TEXT_LENGTH) {    // 檢查清理後的文字是否符合最小字數門檻
            setStatus("❌ 所選頁數內搵唔到足夠文字。");                        // 字數不足時顯示失敗提示
            GameState.setLoading("loaded");                                  // 重置載入狀態為 "loaded"
            return;                                                          // 中斷執行
        }
        
        setStatus("🎮 正在建立遊戲關卡...");                                    // 更新狀態列顯示建立關卡中
        GameState.createLevels(GameState.pdfText, CONFIG.CHARS_PER_LEVEL);     // 呼叫全域方法依據字數切分並產生關卡列表
        
        if (GameState.getTotalLevels() === 0) {                             // 若計算後產生的總關卡數為 0
            setStatus("❌ 無法建立遊戲關卡");                                // 顯示建立失敗提示
            GameState.setLoading("loaded");                                 // 重置載入狀態為 "loaded"
            return;                                                         // 中斷執行
        }
        
        updateLevelSelect();                                             // 更新關卡切換下拉選單 (select)
        GameState.currentLevel = 0;                                      // 將當前關卡重置為第一關（索引 0）
        const gameArea = DOM.gameArea();                                 // 取得遊戲區域 DOM 元素
        if (gameArea) gameArea.classList.remove("hidden");               // 移除 "hidden" 類別，顯示打字遊戲主要區域
        showLevel();                                                     // 載入並渲染第一關的文字與 UI
        
        setStatus(`✅ 已載入第 ${startPage}-${endPage} 頁！共 ${GameState.getTotalLevels()} 個關卡`);    // 於狀態列顯示成功載入頁數與總關卡數
        GameState.setLoading("loaded");                                                                 // 將全域載入狀態更新為完成 "loaded"
        
    } catch (error) {                                                    // 捕捉 PDF 解析或處理過程中的非同步錯誤
        console.error("PDF Error:", error);                              // 於控制台印出錯誤詳細資訊
        setStatus("❌ PDF 處理失敗：" + error.message);                  // 於 UI 顯示錯誤訊息
        GameState.setLoading("loaded");                                  // 重置載入狀態為 "loaded"
    }
}

// ===================Game Core Logic===================

function createLevels(text, charsPerLevel, delimiter = null) {      // 定義切分關卡的函式，接收文本 (text)、每關目標字數 (charsPerLevel)，以及可選切分分隔符號

    if (delimiter && text.includes(delimiter)) {        		// 若有傳入 delimiter 且文本中包含該分隔符號 (例如 "[NEXT]" 或 "\n\n")
        return text
            .split(delimiter)                              // 依照分隔符號將文本切分成陣列
            .map(chunk => chunk.trim())               	  // 切除每一段落前後的空白字元
            .filter(chunk => chunk.length > 0);       	  // 過濾掉空字串，確保只保留有內容的段落 
    }
    const result = [];                                                // 儲存最終切分出來的所有關卡文本
    const cleanText = text.replace(/[ \t]+/g, " ").trim();            // 將多個連續的空格或 Tab 縮排整理成單一空格，並去除全清單首尾空白
    let start = 0;                                                	 // 紀錄當前切分的起始字元索引 (Index)
    
    while (start < cleanText.length) {                                        // 迴圈讀取文本，直到處理完最後一個字元
        let end = Math.min(start + charsPerLevel, cleanText.length);          // 先計算預設的結束位置（起始位置 + 每關目標字數），但不能超過文本總長度
        if (end < cleanText.length) {                                         // 如果算出的結束位置尚未到達文本末端，則尋找最佳的「斷句/斷詞」點
            const sentenceEnd = cleanText.lastIndexOf(".", end);              // 從預設 end 位置往回搜尋最近的句號 (.)、問號 (?) 或驚嘆號 (!)
            const questionEnd = cleanText.lastIndexOf("?", end);              // 從預設 end 位置往回搜尋最近的問號 (?)
            const exclamationEnd = cleanText.lastIndexOf("!", end);
            const bestSentenceEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd);    // 比較並取得最靠後（最接近 end）的句尾標點符號索引值            
            const spaceEnd = cleanText.lastIndexOf(" ", end);                              // 從預設 end 位置往回搜尋最近的空白鍵（空格）
            
            if (bestSentenceEnd > start + 300) {         // 【優先權1】：如果在當前關卡區段內（超過 start + 300 字）有找到完美的句尾標點
                end = bestSentenceEnd + 1;
            } else if (spaceEnd > start + 300) {         // 【優先權2】：若沒有好的標點，但有找到單字間的空格（避免把英文單字從中間切斷
                end = spaceEnd;
            }
        }  
        const levelText = cleanText.slice(start, end).trim();      // 依據計算出的 start 與 end 位置切割出當前關卡的文章段落，並切除首尾多餘空白
        if (levelText.length > 0) result.push(levelText);          // 只要切割出來的段落含有實際內容，就存入關卡陣列 result 中
        start = end;                                               // 將下一次切分的起始點 (start) 設定為本次的結束點 (end)
    }  
    return result;
}

function processTextToLevels(text) {
    const charsPerLevel = currentSelectedArticle?.charsPerLevel || CONFIG.CHARS_PER_LEVEL;
    const delimiter = currentSelectedArticle?.delimiter || null;

    GameState.createLevels(text, charsPerLevel, delimiter);

    if (GameState.getTotalLevels() === 0) {
        setStatus("❌ 無法建立關卡內容！");
        return;
    }

    updateLevelSelect();
    GameState.currentLevel = 0;
    
    const gameArea = DOM.gameArea();
    if (gameArea) gameArea.classList.remove("hidden");
    
    showLevel();
    setStatus(`✅ 已載入文章！共 ${GameState.getTotalLevels()} 個關卡`);
}

function showLevel() {
    if (!GameState.getTotalLevels()) return;         // 安全檢查：若目前沒有任何關卡資料，則直接結束不執行
    
    const text = GameState.getCurrentText();         // 從全域狀態中取得當前關卡的文字內容
   
    const levelDisplay = DOM.levelDisplay();         // 取得顯示關卡資訊的 DOM 元素（例如："Level 1 / 5"）
    if (levelDisplay) {
        levelDisplay.textContent = `Level ${GameState.currentLevel + 1} / ${GameState.getTotalLevels()}`;    // 更新UI顯示目前的關卡進度 (索引值 +1 轉換為使用者習慣的數字)
    }
    
    const levelSelect = DOM.levelSelect();                                        // 取得關卡下拉選單 DOM 元素
    if (levelSelect) levelSelect.value = GameState.currentLevel.toString();       // 將下拉選單的值同步為當前的關卡索引值
    
    const currentAnnotations = GameState.currentAnnotations || [];                // 取得當前關卡的中文註解資料，若無則預設為空陣列
    renderText(text, currentAnnotations);       // 呼叫 renderText 渲染文章內容與中文標註到畫面上
    
    const typingInput = DOM.typingInput();      // 取得打字輸入框 DOM 元素
    if (typingInput) {
        typingInput.value = "";                 // 清空輸入框內容
        typingInput.disabled = false;           // 啟用輸入框
    }
    GameState.gameFinished = false;             // 重置遊戲完成狀態與計時器的開始時間
    GameState.startTime = null;
    
    updateStats();                                 // 更新畫面統計數據 (如 WPM 速率、正確率) 與導覽按鈕狀態 (如 上一關/下一關 按鈕)
    updateNavigationButtons();
    setTimeout(() => {                             // 延遲 100毫秒後自動游標聚焦到輸入框，方便直接開始打字
        if (typingInput) typingInput.focus(); 
    }, 100);
}

function renderText(text, annotations = []) {                  // 將文字渲染到DOM畫面上，包含字元分割與中文標註Ruby text處理
    const textDisplay = DOM.textDisplay();                     // 取得顯示文章內容 DOM 容器
    if (!textDisplay) return; 
   
    textDisplay.innerHTML = "";                                 // 清空先前的內容
    const tokens = text.split(/(\s+|[^\w\s]+)/);                // 使用正則表達式拆分文本，同時保留單字、空白及標點符號
    let globalCharIndex = 0;                                    // 紀錄全域字元索引（用於打字比對與游標位置）

    tokens.forEach(token => {                                  // 巡覽每一個拆分出來的 token（單字、空白或標點
        const matchedAnnotation = annotations.find(            // 尋找當前 token 是否有對應的中文註解（比對時忽略大小寫）
            a => a.word.toLowerCase() === token.toLowerCase()
        );

        const tokenContainer = matchedAnnotation ? document.createElement("ruby") : document.createDocumentFragment();   // 若有註解，用<ruby>標籤作容器；無則用不產生多餘HTML的DocumentFragment

        for (let j = 0; j < token.length; j++) {               // 巡覽當前 token 中的每一個字元
            const char = token[j];
            const span = document.createElement("span");
            span.className = "char";                           // 設定基本 class 為 "char"
            span.textContent = char;                           // 設定字元內容
            
            span.dataset.index = globalCharIndex;             // 寫入 HTML5 dataset 屬性記錄字元全域索引  

            if (globalCharIndex === 0) span.classList.add("current");               // 若第1個字元，加上 "current"類別標記為當前游標位置
            if (/^[A-Za-z]$/.test(char)) span.classList.add("clickable-word");      // 若為英文字母，加上 "clickable-word" 類別使其可被點擊查單字

            tokenContainer.appendChild(span);                                       // 將字元span標籤加入token容器中
            globalCharIndex++;                                                      // 字元索引累加
        }

        if (matchedAnnotation) {                               // 若存在對應註解，建立 <rt> 標籤將中文註解顯示在單字上方
            const rt = document.createElement("rt");
            rt.className = "word-note";                        // 設定標註類別
            rt.textContent = matchedAnnotation.note;           // 設定註解內容（如中文翻譯）
            tokenContainer.appendChild(rt);                    // 加入 <ruby> 容器中
        }
        textDisplay.appendChild(tokenContainer);               // 將組合完成token容器放入文章顯示區域中
    });
}

function updateCharacterDisplay(typed, target) {
    const textDisplay = DOM.textDisplay();                                  // 取得顯示文章內容的 DOM 容器
    if (!textDisplay) return;                                               // 安全檢查：若找不到顯示容器則直接結束

    const chars = textDisplay.querySelectorAll(".char");                    // 取得容器內所有字元 DOM 元素 (帶有 .char 類別)

    chars.forEach((char, index) => {                                        // 巡覽每一個字元元素，比對打字狀態
        char.classList.remove("correct", "incorrect", "current");           // 清除先前的狀態類別，重置字元樣式

        if (index < typed.length) {                                                             // 【已輸入的位置】：若索引小於輸入長度
            char.classList.add(typed[index] === target[index] ? "correct" : "incorrect");       // 比對正確加上 "correct"，錯誤加上 "incorrect"
        }
        if (index === typed.length) {                                       // 【當前游標位置】：若索引等於輸入長度
            char.classList.add("current");                                  // 加入 "current" 類別標示為當前輸入焦點
        }
    });
    const current = textDisplay.querySelector(".current");                  // 取得被標記為當前游標的 DOM 元素
    if (current) {                                                          // 若找到游標元素
        current.scrollIntoView({ behavior: "smooth", block: "center" });    // 自動平滑滾動畫面，讓游標維持在垂直中央
    }
}

function updateStats() {
    const typingInput = DOM.typingInput();                                     // 取得打字輸入框 DOM 元素
    if (!typingInput) return;                                                  // 安全檢查：若輸入框不存在則直接結束

    const typed = typingInput.value;                                           // 取得使用者目前已輸入的文字內容
    const target = GameState.getCurrentText();                                 // 取得當前關卡目標要打的文字內容

    let correct = 0;                                                                // 初始化正確字數計數器
    for (let i = 0; i < typed.length && i < target.length; i++) {                  // 巡覽輸入內容，逐字與目標內容比對
        if (typed[i] === target[i]) correct++;                                     // 若字元完全吻合，正確字數加 1
    }
    const accuracy = typed.length > 0 ? (correct / typed.length) * 100 : 100;                             // 計算正確率（百分比），若尚未打字則預設為 100%
    const accuracyDisplay = DOM.accuracyDisplay();                                                        // 取得顯示正確率的 DOM 元素
    if (accuracyDisplay) accuracyDisplay.textContent = `${accuracy.toFixed(1)}%`;                         // 將正確率保留小數點後 1 位並更新 UI

    const progress = target.length > 0 ? Math.min((typed.length / target.length) * 100, 100) : 0;         // 計算打字進度百分比，最高限制為 100%
    const progressDisplay = DOM.progressDisplay();                                                        // 取得顯示進度的 DOM 元素
    if (progressDisplay) progressDisplay.textContent = `${progress.toFixed(0)}%`;                         // 將進度取整數並更新 UI

    let wpm = 0;                                                                         // 初始化 WPM (Words Per Minute, 每分鐘字數) 速率
    if (GameState.startTime !== null && typed.length > 0) {                              // 確保已開始計時且使用者已開始打字
        const elapsedMinutes = (Date.now() - GameState.startTime) / 1000 / 60;           // 計算從開始打字到現在所經過的分鐘數
        if (elapsedMinutes > 0) wpm = (correct / 5) / elapsedMinutes;                    // 以標準「5 個正確字元 = 1 個單字」公式計算 WPM
    }
    const wpmDisplay = DOM.wpmDisplay();                                 // 取得顯示 WPM 的 DOM 元素
    if (wpmDisplay) wpmDisplay.textContent = Math.round(wpm);            // 將 WPM 四捨五入為整數並更新 UI

    const container = document.getElementById('turtle-track');           // 取得烏龜跑道 (軌道容器) DOM 元素
    const image = document.getElementById('turtle-display');             // 取得烏龜 (角色圖片) DOM 元素
    if (image) {
        image.src = "img.svg";                                           // 設定烏龜圖片的檔案來源為 "img.svg"
    }    
    if (container && image) {
        const maxX = container.offsetWidth - image.offsetWidth;                                     // 計算烏龜能在軌道上移動的最大 X 軸像素距離
        const correctRatio = target.length > 0 ? Math.min(correct / target.length, 1) : 0;          // 計算正確打字量的比例 (0 到 1 之間)
        const currentX = maxX * correctRatio;                                                       // 依據正確比例計算烏龜當前應在的 X 軸位置 (px)
        image.style.left = `${currentX}px`;                                                         // 動態更新烏龜圖片的左側距離 (left) 以實作跑道移動效果
    }
}

function finishLevel() {
    GameState.gameFinished = true;                                                   // 將全域狀態標記為已完成當前關卡 (gameFinished = true)
    const typingInput = DOM.typingInput();                                           // 取得打字輸入框 DOM 元素
    if (typingInput) typingInput.disabled = true;                                    // 停用打字輸入框，防止關卡完成後繼續輸入

    updateStats();                                                                   // 呼叫更新統計資料函式（最後確認 WPM、正確率與烏龜位置）

    const image = document.getElementById('turtle-display');                         // 取得烏龜圖片/動圖 DOM 元素
    if (image) {
        image.src = "1f422.gif";                                                     // 將烏龜圖片替換為慶祝/完成動畫檔 "1f422.gif"
    }
    const accuracy = DOM.accuracyDisplay()?.textContent || "0%";                     // 取得當前顯示的正確率字串（若無則預設為 "0%"）
    const wpm = DOM.wpmDisplay()?.textContent || "0";                                // 取得當前顯示的 WPM 字串（若無則預設為 "0"）

    if (GameState.currentLevel < GameState.getTotalLevels() - 1) {                                            // 判斷是否還有下一關（當前關卡索引未達最後一關）
        setStatus(`🎉 Level ${GameState.currentLevel + 1} 完成！ Accuracy: ${accuracy} | WPM: ${wpm}`);       // 顯示單關完成訊息與數據
    } else {
        setStatus(`🏆 全部完成！ Accuracy: ${accuracy} | WPM: ${wpm}`);                                       // 顯示通關完成訊息與總數據
    }
}

function navigateLevel(direction) {
    const newLevel = GameState.currentLevel + direction;                    // 計算目標關卡索引（傳入 1 代表下一關，-1 代表上一關）
    if (newLevel >= 0 && newLevel < GameState.getTotalLevels()) {           // 檢查目標關卡索引是否在合法範圍內（大於等於 0 且小於總關卡數）
        GameState.currentLevel = newLevel;                                  // 更新全域狀態中的當前關卡索引值
        showLevel();                                                        // 呼叫 showLevel 載入並渲染新關卡的內容
    }
}

function updateNavigationButtons() {
    const prevBtn = DOM.prevBtn();                                                                     // 取得「上一關」按鈕 DOM 元素
    const nextBtn = DOM.nextBtn();                                                                     // 取得「下一關」按鈕 DOM 元素

    if (prevBtn) prevBtn.disabled = GameState.currentLevel === 0;                                      // 若位於第一關 (索引 0)，則停用「上一關」按鈕
    if (nextBtn) nextBtn.disabled = GameState.currentLevel === GameState.getTotalLevels() - 1;         // 若位於最後一關，則停用「下一關」按鈕
}

function updateLevelSelect() {
    const levelSelect = DOM.levelSelect();                                                  // 取得關卡切換下拉選單 (select) DOM 元素
    if (!levelSelect || GameState.getTotalLevels() === 0) return;                           // 若找不到選單或目前總關卡數為 0，則直接結束不執行

    levelSelect.innerHTML = "";                                                             // 清空下拉選單中既有的所有選項 (option)
    GameState.levels.forEach((_, index) => {                                                // 巡覽關卡陣列，依據關卡總數重建選項列表
        const option = document.createElement("option");                                    // 建立全新的 <option> DOM 元素
        option.value = index.toString();                                                    // 設定選項的值為該關卡的索引字串 (例如 "0", "1")
        option.textContent = `Level ${index + 1} / ${GameState.getTotalLevels()}`;          // 設定選單顯示文字 (例如 "Level 1 / 5")
        levelSelect.appendChild(option);                                                    // 將選項加入下拉選單中
    });
    levelSelect.disabled = false;                                                           // 啟用關卡切換下拉選單，允許使用者自行選關
}

// ===================Dictionary Logic 字典邏輯===================

function lookupWord(word) {
    word = word.trim().toLowerCase();                                   // 整理輸入的單字
    if (!word) return;                                                  // 若單字為空則直接結束

    GameState.currentLookupWord = word;                                 // 紀錄目前查詢單字

    const dictionaryPopup = DOM.dictionaryPopup();                       // 取得 DOM 元素
    const dictionaryWord = DOM.dictionaryWord(); 
    const dictionaryPhonetic = DOM.dictionaryPhonetic();
    const dictionaryContent = DOM.dictionaryContent(); 

    if (!dictionaryPopup || !dictionaryWord) return;                    // 安全檢查

    dictionaryPopup.classList.remove("hidden");                         // 顯示字典視窗
    dictionaryWord.textContent = word; 

    // 只保留 dictionaryPhonetic 框填入單字名稱
    if (dictionaryPhonetic) {
        dictionaryPhonetic.textContent = word; 
    }

    // 清空詳細內容區域
    if (dictionaryContent) {
        dictionaryContent.innerHTML = "";
    }
}

function closeDictionary() {
    const dictionaryPopup = DOM.dictionaryPopup();                       // 取得字典彈出視窗 DOM 元素
    if (dictionaryPopup) dictionaryPopup.classList.add("hidden");        // 加上 "hidden" 類別以關閉/隱藏字典彈出視窗
}

function playCurrentAudio() {
    AudioManager.play();                                                // 呼叫音訊管理者播放當前單字的語音（TTS）
}

// Article Loader & Custom Text Management 文章載入器和自訂文字管理

async function loadArticlesFromGit() {
    const categorySelect = DOM.categorySelect();                         // 取得文章分類下拉選單 DOM 元素
    const articleSelect = DOM.articleSelect();                           // 取得文章標題下拉選單 DOM 元素
    const articleContainer = DOM.articleContainer();                     // 取得文章內容顯示區域 DOM 元素
    const customTextInput = DOM.customTextInput();                       // 取得自訂文字輸入框 DOM 元素
    
    if (!categorySelect || !articleSelect) return;                      // 安全檢查：若缺少選單 DOM 元素則直接結束不執行
    
    try {
        const response = await fetch("./articles.json");                                  // 透過 AJAX (fetch) 讀取相對路徑下的 articles.json 檔案
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);      // 若 HTTP 狀態碼非 200 OK 則拋出例外錯誤
        
        const categories = await response.json();                                        // 將取得的 JSON 格式回應解析為 JavaScript 物件/陣列
        
        // 1. Initialize category options 
        categorySelect.innerHTML = '<option value="">-- 選擇分類 --</option>';          // 初始化分類選單的預設提示選項
        articleSelect.innerHTML = '<option value="">-- 請先選擇分類 --</option>';       // 初始化文章選單的預設提示選項
        articleSelect.disabled = true;                                                 // 停用文章選單（需先選擇分類後才啟用）
        
        categories.forEach((cat, index) => {                             // 巡覽所有文章分類資料
            const option = document.createElement("option");             // 建立選單選項 <option> 元素
            option.value = index;                                        // 設定選項值為該分類在陣列中的索引值
            option.textContent = cat.category;                           // 設定選項顯示文字為分類名稱
            categorySelect.appendChild(option);                          // 將分類選項加入分類下拉選單中
        });
        
        // 2. On Category Change: populate article options
        categorySelect.addEventListener("change", (e) => {               // 綁定分類選單的變更 (change) 事件
            const catIndex = e.target.value;                             // 取得使用者選取的分類索引值
            
            articleSelect.innerHTML = '<option value="">-- 選擇一篇文章 --</option>';    // 清空並重置文章選單的預設選項
            if (customTextInput) customTextInput.value = "";                            // 重置並清空自訂文字輸入框
            if (articleContainer) articleContainer.innerHTML = "";                      // 清空文章顯示區域內容
            currentSelectedArticle = null;                                              // 將當前選取的文章暫存變數歸零 (null)
            
            if (catIndex === "") {                                       // 若使用者切換回未選擇狀態 (即選擇預設提示項)
                articleSelect.disabled = true;                           // 保持停用文章選單
                return;                                                  // 結束處理
            }
            
            const selectedCategory = categories[catIndex];               // 依據索引取得對應的分類資料物件
            if (selectedCategory && selectedCategory.articles) {         // 確保該分類存在且包含文章列表 (articles 陣列)
                selectedCategory.articles.forEach(article => {           // 巡覽該分類下的每篇文章
                    const option = document.createElement("option");     // 建立選單選項 <option> 元素
                    option.value = article.id;                           // 設定選項值為文章的唯一識別碼 (id)
                    option.textContent = article.title;                  // 設定選項顯示文字為文章標題
                    articleSelect.appendChild(option);                   // 將文章選項加入文章下拉選單中
                });
                articleSelect.disabled = false;                          // 成功填入文章後，啟用文章下拉選單
            }
        });

        articleSelect.addEventListener("change", (e) => {                // 綁定文章選單的變更 (change) 事件
            const selectedCatIndex = categorySelect.value;               // 取得目前選擇的分類索引值
            const selectedId = e.target.value;                           // 取得目前選擇的文章 ID
            
            if (selectedCatIndex === "" || !selectedId) {                // 若分類或文章 ID 未選擇（例如切回預設項）
                if (articleContainer) articleContainer.innerHTML = "";   // 清空文章顯示區域
                if (customTextInput) customTextInput.value = "";         // 清空自訂文字輸入框
                currentSelectedArticle = null;                           // 清空當前選取的文章暫存變數
                return;                                                  // 結束處理
            }

            const currentArticles = categories[selectedCatIndex].articles || [];       // 取得當前分類下的文章列表陣列
            const selectedArticle = currentArticles.find(a => a.id === selectedId);    // 依據 ID 搜尋並比對出目標文章物件
            
            if (selectedArticle) {                                          // 若有找到對應的文章資料
                currentSelectedArticle = selectedArticle;                   // 將找到的文章物件存入全域/區域暫存變數
                
                if (articleContainer) {                                     // 若文章顯示區域存在，渲染文章標題與內文 HTML
                    articleContainer.innerHTML = `
                        <h3>${selectedArticle.title}</h3>
                        <p>${selectedArticle.content}</p>
                    `;
                }
                if (customTextInput) {                                      // 若自訂文字輸入框存在，將文章內文填入其中
                    customTextInput.value = selectedArticle.content;
                }
            }
        });
    } catch (error) {                                                                // 捕捉非同步讀取或處理過程中的所有例外錯誤
        console.error("Failed to load articles.json:", error);                       // 於控制台印出錯誤詳細訊息
        if (articleContainer) {                                                      // 於文章顯示區域呈現載入失敗的提示訊息
            articleContainer.innerHTML = "<p>⚠️ 無法載入 articles.json 檔案路徑。</p>";
        }
    }
}

function handleStartCustomText() {
    const input = DOM.customTextInput()?.value.trim();                         // 取得自訂文字輸入框的內容並去除前後空白
    if (!input || input.length < CONFIG.MIN_CUSTOM_TEXT_LENGTH) {              // 檢查是否有輸入文字，或文字長度是否小於設定的最小字數門檻
        setStatus("⚠️ 請輸入至少 5 個字元的文章內容！");                         // 若不符合條件，顯示警告提示訊息
        return;                                                                // 中斷執行
    }
    
    GameState.reset();                                                   // 重置全域遊戲狀態資料（清空舊關卡、分數與時間等）
    GameState.pdfText = input;                                           // 將驗證通過的輸入文字存入全域狀態的 pdfText 中

    if (currentSelectedArticle && currentSelectedArticle.annotations) {      // 檢查目前選取的文章是否存在且帶有中文註解資料 (annotations)
        GameState.currentAnnotations = currentSelectedArticle.annotations;    // 將該文章對應的中文註解存入全域狀態中
    } else {
        GameState.currentAnnotations = [];                                     // 若無註解資料，則清空全域狀態中的註解陣列
    } 
    processTextToLevels(input);                                              // 處理文章分割與開始遊戲的邏輯
}

async function handleAddAndDownload() {
    // 取得 DOM 欄位元素
    const categoryInput = DOM.newCategory ? DOM.newCategory() : document.getElementById("newCategory");
    const titleInput = DOM.newTitle();
    const contentInput = DOM.newContent();
    const charsInput = DOM.newCharsPerLevel ? DOM.newCharsPerLevel() : document.getElementById("newCharsPerLevel");
    const delimiterInput = DOM.newDelimiter ? DOM.newDelimiter() : document.getElementById("newDelimiter");
    const annotationsInput = DOM.newAnnotations ? DOM.newAnnotations() : document.getElementById("newAnnotations");

    // 讀取並整理輸入數值
    const categoryName = categoryInput?.value.trim() || "未分類";
    const title = titleInput?.value.trim();
    const content = contentInput?.value.trim();

    if (!title || !content) {
        alert("請填寫標題與內容！");
        return;
    }

    // 解析選填欄位
    const charsPerLevel = charsInput?.value ? parseInt(charsInput.value, 10) : CONFIG.CHARS_PER_LEVEL;
    const delimiter = delimiterInput?.value.trim() || undefined;
    
    // 解析註解字串 (格式預設支援每行一個：單字:註解 或單字=註解)
    let annotations = [];
    if (annotationsInput?.value.trim()) {
        annotations = annotationsInput.value.trim().split("\n").map(line => {
            const parts = line.split(/[:=：=]/);
            if (parts.length >= 2) {
                return { word: parts[0].trim(), note: parts[1].trim() };
            }
            return null;
        }).filter(Boolean);
    }

    let categories = [];         // 讀取現有的 JSON 分類結構
    try {
        const res = await fetch("./articles.json");
        if (res.ok) {
            categories = await res.json();
            if (!Array.isArray(categories)) categories = [];
        }
    } catch (e) {
        console.warn("Could not load existing articles.json, creating new categories file.");
    }

    const newArticle = {            // 建立新文章物件 (符合目的 JSON 格式)
        id: "art_" + Date.now(),
        title: title,
        charsPerLevel: charsPerLevel,
        ...(delimiter && { delimiter }),
        content: content,
        ...(annotations.length > 0 && { annotations })
    };

    let targetCategory = categories.find(c => c.category === categoryName);    // 尋找或建立對應分類，並將文章推入該分類
    if (!targetCategory) {
        targetCategory = {
            category: categoryName,
            articles: []
        };
        categories.push(targetCategory);
    }
    targetCategory.articles.push(newArticle);

    // 產生 JSON Data URL 並觸發下載
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(categories, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "articles.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    // 清空表單輸入框
    if (titleInput) titleInput.value = "";
    if (contentInput) contentInput.value = "";
    if (charsInput) charsInput.value = "";
    if (delimiterInput) delimiterInput.value = "";
    if (annotationsInput) annotationsInput.value = "";
    
    // 重新更新 UI 的分類選單 (若有載入 loadArticlesFromGit 函式)
    if (typeof loadArticlesFromGit === "function") {
        loadArticlesFromGit();
    }
}

// =====================================================
// Event Handlers & Utility Functions 事件處理程序和實用函數
// =====================================================

async function handlePDFUpload(event) {

    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
        setStatus("請選擇 PDF 檔案");
        return;
    }
    try {
        setStatus("正在讀取 PDF...");
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
        setStatus("PDF 讀取失敗：" + error.message);
    }
}

async function handleLoadURL() {
    const pdfUrl = DOM.pdfUrl();
    const url = pdfUrl?.value?.trim();
    
    if (!url) {
        setStatus(" 請輸入 PDF URL");
        return;
    }
    try {
        new URL(url);
    } catch {
        setStatus("URL 格式不正確");
        return;
    }
    try {
        setStatus(" 正在載入 PDF...");
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

    if (GameState.autoSpeakEnabled && typed.length > 0) {    // 自動單字發音檢查邏輯
        const targetText = GameState.getCurrentText();
        
        const lastTypedIdx = typed.length - 1;       // 檢查剛才打完的位置
        
        const isDelimiter = /[\s,.!?;:]/.test(typed[lastTypedIdx]);    // 判斷剛才輸入是否為分隔符(如空格、句號、逗號)，或已到達文本結尾
        const isEnd = typed.length === targetText.length;
        
        if (isDelimiter || isEnd) {
            let searchIdx = isDelimiter ? lastTypedIdx - 1 : lastTypedIdx;   // 往前提取剛才打完的英文字母單字
            let word = "";
            
            while (searchIdx >= 0 && /^[A-Za-z]$/.test(targetText[searchIdx])) {
                word = targetText[searchIdx] + word;
                searchIdx--;
            }
            
            const wordStartIndex = searchIdx + 1;   // 確保提取到了有效的單字，且該單字位置尚未發音過，並且輸入字元完全正確

            if (word.length > 0 && GameState.lastSpokenWordIndex !== wordStartIndex) {

                const typedWordPart = typed.slice(wordStartIndex, wordStartIndex + word.length); // 比對該單字區段使用者是否全部打對
                if (typedWordPart.toLowerCase() === word.toLowerCase()) {
                    AudioManager.speak(word);                               // 觸發語音朗讀
                    GameState.lastSpokenWordIndex = wordStartIndex;         // 紀錄已發音的單字位置
                }
            }
        }
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
// App Initialization Trigger  應用初始化觸發器
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
