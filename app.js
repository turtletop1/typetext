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
let defaultGlobalAnnotations = [];

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
        this.levels = createLevels(text, charsPerLevel, delimiter);     // 呼叫全域/外部createLevels函式進行文字切分，並更新內部levels 屬性
        return this.levels;								                // 回傳處理好的關卡陣列
    },
    getCurrentText() {										    // 取得「當前關卡」對應的文字內容
        return this.levels[this.currentLevel] || "";			// 依據 currentLevel索引值取出陣列內容；若超出範圍(如無資料)回傳空字串 "" 防止報錯
    },
    getTotalLevels() {										    // 取得關卡的總數量
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
    boldSetting: () => document.getElementById("bold-setting"),
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

    async speak(text) {             // 核心朗讀邏輯（優先使用 Puter.js，失敗時降級使用原生 SpeechSynthesis）
        if (!text) return;

        this.stopCurrent();         // 停止之前的播放
        try {
            if (typeof puter !== 'undefined' && puter.ai && puter.ai.txt2speech) {      // 檢查 Puter.js 是否載入成功
                const audio = await puter.ai.txt2speech(text);                          // 調用 Puter.js 文字轉語音 API
                
                this.currentAudio = {   // 儲存目前音訊物件，方便追蹤與停止
                    element: audio,
                    type: 'puter'
                };
                
                await audio.play();
                return;
            }
        } catch (error) {
            console.warn("TTS 播放失敗，降級使用原生 Web Speech API:", error);
        }
        this.fallbackSpeak(text);               // Fallback: 當 Puter API 失敗或未引入時，使用瀏覽器原生發音
    },
    fallbackSpeak(text) {                       // 專門處理瀏覽器原生的 TTS 降級備案
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = (typeof CONFIG !== 'undefined' && CONFIG.SPEECH_LANG) || "en-US";
            utterance.rate = (typeof CONFIG !== 'undefined' && CONFIG.SPEECH_RATE) || 0.9;
            window.speechSynthesis.speak(utterance);
        }
    },
    async speakWord(word) {                         // 單字朗讀介面
        await this.speak(word);
    },
    stopCurrent() {                                 // 停止目前播放（不論是 Puter Audio 還是原生 SpeechSynthesis）
        if (this.currentAudio?.element) {           // 停止 Puter audio 播放
            this.currentAudio.element.pause();
            this.currentAudio.element.currentTime = 0;
        }
        this.currentAudio = null;

        if ('speechSynthesis' in window) {          // 停止原生 Web Speech
            window.speechSynthesis.cancel();
        }
    },
    play() {
        if (typeof GameState !== 'undefined' && GameState.currentLookupWord) {      // 播放 GameState 紀錄的單字
            this.speak(GameState.currentLookupWord);
        }
    },
    destroy() {     // 銷毀與清理資源
        this.stopCurrent();
    }
};

// ======================Event Manager=====================

const EventManager = {			   // 定義一個名為 EventManager 的物件，用於統一管理與清理 DOM 事件監聽器
    listeners: [],			       // 建立私有陣列，用來儲存所有已註冊的事件資訊（包含 DOM 元素、事件類型與處理函式）
    
    attach(element, event, handler) {		     // 單一事件綁定方法：接收DOM元素(element)、事件類型(event)與事件處理函式(handler)
        if (!element) return;				     // 安全檢查：若傳入的 DOM 元素不存在（null 或 undefined），則直接結束不執行
        
        element.addEventListener(event, handler);		         // 替 DOM 元素掛載指定的事件監聽器
        
        this.listeners.push({ element, event, handler });	     // 將本次綁定的資訊封裝成物件，存入 listeners 陣列中以便後續追記與移除
    },
    
    attachAll(config) {			                                // 批次事件綁定方法：接收一個包含多個事件設定陣列的設定檔 (config)
        config.forEach(([element, event, handler]) => {		    // 使用解構賦值(Destructuring)取出每設定項 [element,event,handler]
            this.attach(element, event, handler);               // 逐一呼叫 attach 方法進行綁定
        });
    },
    removeAll() {				    										    // 一鍵移除所有已註冊事件的方法
        this.listeners.forEach(({ element, event, handler }) => {			    // 巡覽 listeners 陣列中的每一個事件紀錄
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
        [DOM.boldSetting(), "change", (e) => {
            renderText.boldSettingEnabled = e.target.checked;
            const currentText = GameState?.currentText || DOM.customTextInput()?.value || "";
            const currentAnnotations = GameState?.currentAnnotations || [];
            if (currentText) {
                renderText(currentText, currentAnnotations);
            }
        }]
    ]);
}

function initializeWordClickDelegation() {   		
    const textDisplay = DOM.textDisplay();   		
    if (!textDisplay) return;               		   
    
    textDisplay.addEventListener("click", (e) => {             
        if (!e.target.classList.contains("char")) return;      
        
        const clickedIndex = parseInt(e.target.dataset.index, 10);
        if (isNaN(clickedIndex)) return;

        const fullText = GameState.getCurrentText();    // 取得當前關卡完整的純文字
        
        const currentAnn = GameState.currentAnnotations || [];      // 合併當前註解與全域預設註解
        const combinedAnnotations = [...currentAnn, ...(typeof defaultGlobalAnnotations !== 'undefined' ? defaultGlobalAnnotations : [])];

        let matchedPhrase = null;       // 優先尋找涵蓋點擊位置嘅多字片語註解

            // 將註記按長度排序（長片語優先）
        const sortedAnn = [...combinedAnnotations].sort((a, b) => (b.word?.length || 0) - (a.word?.length || 0));

        for (const ann of sortedAnn) {
            if (!ann.word) continue;
            const wordToSearch = ann.word.trim().toLowerCase();
            const lowerFullText = fullText.toLowerCase();
            
            let pos = lowerFullText.indexOf(wordToSearch);
            while (pos !== -1) {
                const endPos = pos + wordToSearch.length;
                if (clickedIndex >= pos && clickedIndex < endPos) {
                    matchedPhrase = ann.word.trim();
                    break;
                }
                pos = lowerFullText.indexOf(wordToSearch, pos + 1);
            }
            if (matchedPhrase) break;
        }

        if (matchedPhrase) {
            lookupWord(matchedPhrase);
        } else {
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

// ===================Game Core Logic===================

function createLevels(text, charsPerLevel, delimiter = null) {      
    if (delimiter && text.includes(delimiter)) {        		
        return text
            .split(delimiter)                              
            .map(chunk => chunk.trim())               	  
            .filter(chunk => chunk.length > 0);       	  
    }
    const result = [];                                                
    const cleanText = text.replace(/[ \t]+/g, " ").trim();            
    let start = 0;                                                	 
    
    while (start < cleanText.length) {                                        
        let end = Math.min(start + charsPerLevel, cleanText.length);          
        if (end < cleanText.length) {                                         
            const sentenceEnd = cleanText.lastIndexOf(".", end);              
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

function processTextToLevels(text) {
    // 【修復】若 text 為 Array，將其轉為字串
    if (Array.isArray(text)) {
        text = text.join("\n");
    }

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
    if (!GameState.getTotalLevels()) return;         
    
    const text = GameState.getCurrentText();         
   
    const levelDisplay = DOM.levelDisplay();         
    if (levelDisplay) {
        levelDisplay.textContent = `Level ${GameState.currentLevel + 1} / ${GameState.getTotalLevels()}`;    
    }
    
    const levelSelect = DOM.levelSelect();                                        
    if (levelSelect) levelSelect.value = GameState.currentLevel.toString();       
    
    const currentAnnotations = GameState.currentAnnotations || [];                
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


function formatBionicText(text) {       // 將傳入的文字轉換成「字頭加粗」的 HTML 格式
    if (!text) return '';

    return text.replace(/\b([a-zA-Z0-9]+)\b/g, (match) => {      // 使用正規表達式匹配所有英文單字 (\b\w+\b)
        const length = match.length;
        
        let boldLength = 1;                      // 根據單字長度決定加粗字數,-3個字母加粗1個字，4-6個字母加粗2個字，其餘加粗約一半長度
        if (length > 3 && length <= 6) {
            boldLength = 2;
        } else if (length > 6) {
            boldLength = Math.ceil(length * 0.4);
        }

        const boldPart = match.slice(0, boldLength);
        const restPart = match.slice(boldLength);

        return `<b>${boldPart}</b>${restPart}`;
    });
}



function renderText(text, annotations = []) {                  
    const textDisplay = DOM.textDisplay();                     
    if (!textDisplay) return; 
   
    textDisplay.innerHTML = "";                                 
    let globalCharIndex = 0;

    const sortedAnnotations = [...annotations].sort((a, b) => (b.word?.trim().length || 0) - (a.word?.trim().length || 0));

    const patternParts = sortedAnnotations    
        .filter(a => a.word && a.word.trim().length > 0)
        .map(a => a.word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); 

    let regex;
    if (patternParts.length > 0) {
        regex = new RegExp(`(${patternParts.join('|')}|\\s+|[^\\w\\s]+)`, 'gi');  
    } else {
        regex = /(\s+|[^\w\s]+)/g;
    }

    const tokens = text.split(regex).filter(Boolean);
    const boldSettingEnabled = renderText.boldSettingEnabled ?? false;

    tokens.forEach(token => {                                  
        const matchedAnnotation = annotations.find(          
            a => a.word && a.word.trim().toLowerCase() === token.trim().toLowerCase()
        );
        const tokenContainer = matchedAnnotation ? document.createElement("ruby") : document.createDocumentFragment();   

        const isWord = /^[a-zA-Z0-9]+$/.test(token.trim());
        let boldLength = 0;

        if (isWord && boldSettingEnabled) {          // 當為單字且設定開啟時計算加粗長度
            const len = token.length;
            if (len <= 3) boldLength = 1;
            else if (len <= 6) boldLength = 2;
            else boldLength = Math.ceil(len * 0.4);
        }

        for (let j = 0; j < token.length; j++) {               
            const char = token[j];
            const span = document.createElement("span");
            span.className = "char";                           
            span.textContent = char;                           
            
            span.dataset.index = globalCharIndex;             

            if (globalCharIndex === 0) span.classList.add("current");               
            if (/^[A-Za-z ]$/.test(char)) span.classList.add("clickable-word");      

            if (isWord && j < boldLength) {            
                span.classList.add("bionic-bold");
            }

            tokenContainer.appendChild(span);                                       
            globalCharIndex++;                                                      
        }
        if (matchedAnnotation) {                               
            const rt = document.createElement("rt");
            rt.className = "word-note";                        
            rt.textContent = matchedAnnotation.note || matchedAnnotation["dict-content"] || "";           
            tokenContainer.appendChild(rt);                    
        }
        textDisplay.appendChild(tokenContainer);               
    });
}

//renderText.boldSettingEnabled = false;


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

// ===================Dictionary Logic 字典邏輯===================
function lookupWord(word) {
    word = word.trim().toLowerCase();                                   
    if (!word) return;                                                  

    GameState.currentLookupWord = word;                                 

    const dictionaryPopup = DOM.dictionaryPopup();                       
    const dictionaryWord = DOM.dictionaryWord(); 
    const dictionaryContent = DOM.dictionaryContent(); 

    if (!dictionaryPopup || !dictionaryWord) return;                    

    dictionaryPopup.classList.remove("hidden");                         
    dictionaryWord.textContent = word; 


    if (dictionaryContent) {                    
        dictionaryContent.innerHTML = "";       

        const currentAnn = GameState.currentAnnotations || [];
        const combinedAnnotations = [...currentAnn, ...defaultGlobalAnnotations];
        
        const matched = combinedAnnotations.find(item => {
            if (!item || !item.word || item.word.trim() === "") return false;
            const target = item.word.trim().toLowerCase();
            return target === word || target.includes(word);
        });

        if (matched) {
            const phoneticText = matched["dict-phonetic"] 
            const contentText =  matched["dict-content"] || matched.note || "暫無詳細解釋";
            const imageUrl = matched["image"] || matched["dict-image"] || null;

            const container = document.createElement("div");
            container.className = "dict-annotation-result";
            
            let htmlContent = ''

            if (phoneticText) {
                htmlContent += `
                    <div style="color: #7f8c8d; margin-bottom: 12px;">${phoneticText}</div>
                `;
            }
            if (contentText) {
                htmlContent += `
                    <div style="font-size: 1.1em; color: #2c3e50; font-weight: bold; margin-bottom: 8px;">
                        📌句子：
                    </div>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; border-left: 4px solid #3498db; font-size: 1em; line-height: 1.4; margin-bottom: 10px;">
                        ${contentText}
                    </div>
                `;
            }
            if (imageUrl) {
                htmlContent += `
                    <div class="dict-image-container" style="text-align: center; margin-top: 10px;">
                        <img src="${imageUrl}" alt="${matched.word}" style="max-width: 100%; max-height: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); object-fit: contain;" onError="this.style.display='none';">
                    </div>
                `;
            }

            container.innerHTML = htmlContent;
            dictionaryContent.appendChild(container);
        } else {
            dictionaryContent.innerHTML = `<p style="color: #888;">未能在註解庫中搵到 「${word}」 的對應內容。</p>`;
        }
    }
}

function closeDictionary() {
    const dictionaryPopup = DOM.dictionaryPopup();                       
    if (dictionaryPopup) dictionaryPopup.classList.add("hidden");        
}

function playCurrentAudio() {
    AudioManager.play();                                                
}

// Article Loader & Custom Text Management 文章載入器和自訂文字管理
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
        
        // 1. 清空與設定預設全域註解
        defaultGlobalAnnotations = [];
        categories.forEach(cat => {
            if (cat.articles) {
                cat.articles.forEach(art => {
                    if ((cat.category === "" || cat.category === "Default" || art.id === "" || art.id === "Default") && art.annotations) {
                        defaultGlobalAnnotations.push(...art.annotations);
                    }
                });
            }
        });

        // 2. 建立 Category 下拉選單
        categorySelect.innerHTML = '<option value="">-- 選擇分類 --</option>';          
        articleSelect.innerHTML = '<option value="">-- 請先選擇分類 --</option>';       
        
        categories.forEach((cat, index) => {                             
            const option = document.createElement("option");             
            option.value = index;                                        
            option.textContent = cat.category || "Default";                           
            categorySelect.appendChild(option);                          
        });

        // 尋找是否有 "Default" 類別與文章
        const defaultCatIndex = categories.findIndex(c => c.category === "Default" || c.category === "");
        let defaultArticle = null;

        if (defaultCatIndex !== -1) {
            const defaultCat = categories[defaultCatIndex];
            defaultArticle = defaultCat.articles?.find(a => a.id === "Default" || a.id === "") || defaultCat.articles?.[0];
        }

        // 🎯 核心邏輯：載入 Default 註解，但清空 textarea
        const applyDefaultArticle = () => {
            if (defaultArticle) {
                currentSelectedArticle = defaultArticle;
                GameState.currentAnnotations = defaultArticle.annotations || [];
                
                // 註解與全域狀態已載入，但保持 textarea 為空字串
                if (customTextInput) customTextInput.value = "";
                if (articleContainer) articleContainer.innerHTML = "";
            } else {
                currentSelectedArticle = null;
                GameState.currentAnnotations = [];
                if (customTextInput) customTextInput.value = "";
                if (articleContainer) articleContainer.innerHTML = "";
            }
        };

        // 頁面初次載入時自動套用（載入 Default 註解，清空 textarea）
        applyDefaultArticle();
        
        // 3. Category 切換事件處理
        categorySelect.addEventListener("change", (e) => {               
            const catIndex = e.target.value;                             
            
            articleSelect.innerHTML = '<option value="">-- 選擇一篇文章 --</option>';    
            
            if (catIndex === "") {                                       
                // 取消選擇分類時，自動重置回到 Default 註解並清空 textarea
                articleSelect.disabled = true;                           
                applyDefaultArticle();
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

        // 4. Article 切換事件處理
        articleSelect.addEventListener("change", (e) => {                
            const selectedCatIndex = categorySelect.value;               
            const selectedId = e.target.value;                           
            
            if (selectedCatIndex === "" || !selectedId) {                
                applyDefaultArticle();
                return;                                                  
            }

            const currentArticles = categories[selectedCatIndex].articles || [];       
            const selectedArticle = currentArticles.find(a => a.id === selectedId);    
            
            if (selectedArticle) {                                          
                currentSelectedArticle = selectedArticle;                   
                GameState.currentAnnotations = selectedArticle.annotations || [];

                const displayContent = Array.isArray(selectedArticle.content) 
                    ? selectedArticle.content.join("\n") 
                    : selectedArticle.content;

                if (articleContainer) {                                     
                    articleContainer.innerHTML = `
                        <h3>${selectedArticle.title}</h3>
                        <p>${displayContent.replace(/\n/g, "<br>")}</p>
                    `;
                }
                if (customTextInput) {                                      
                    customTextInput.value = displayContent;
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
    
    // 【修復】保留剛剛切換文章時選擇的 annotations
    const preservedAnnotations = (currentSelectedArticle && currentSelectedArticle.annotations) 
        ? currentSelectedArticle.annotations 
        : GameState.currentAnnotations;

    GameState.reset();                                                   
    GameState.pdfText = input;                                           
    GameState.currentAnnotations = preservedAnnotations || [];

    processTextToLevels(input);                                              
}

async function handleAddAndDownload() {
    const categoryInput = DOM.newCategory ? DOM.newCategory() : document.getElementById("newCategory");
    const titleInput = DOM.newTitle();
    const contentInput = DOM.newContent();
    const charsInput = DOM.newCharsPerLevel ? DOM.newCharsPerLevel() : document.getElementById("newCharsPerLevel");
    const delimiterInput = DOM.newDelimiter ? DOM.newDelimiter() : document.getElementById("newDelimiter");
    const annotationsInput = DOM.newAnnotations ? DOM.newAnnotations() : document.getElementById("newAnnotations");

    const categoryName = categoryInput?.value.trim() || "未分類";
    const title = titleInput?.value.trim();
    const content = contentInput?.value.trim();

    if (!title || !content) {
        alert("請填寫標題與內容！");
        return;
    }

    const charsPerLevel = charsInput?.value ? parseInt(charsInput.value, 10) : CONFIG.CHARS_PER_LEVEL;
    const delimiter = delimiterInput?.value.trim() || undefined;
    
    let annotations = [];
    if (annotationsInput?.value.trim()) {
        annotations = annotationsInput.value.trim().split("\n").map(line => {
            const parts = line.split(/[:=：=]/);
            if (parts.length >= 2) {
                const item = {
                    word: parts[0].trim(),
                    note: parts[1].trim()
                };
                if (parts[2] && parts[2].trim()) {
                    item.image = parts[2].trim();
                }
                return item;
            }
            return null;
        }).filter(Boolean);
    }

    let categories = [];         
    try {
        const res = await fetch("./articles.json");
        if (res.ok) {
            categories = await res.json();
            if (!Array.isArray(categories)) categories = [];
        }
    } catch (e) {
        console.warn("Could not load existing articles.json, creating new categories file.");
    }

    const newArticle = {            
        id: "art_" + Date.now(),
        title: title,
        charsPerLevel: charsPerLevel,
        ...(delimiter && { delimiter }),
        content: content,
        ...(annotations.length > 0 && { annotations })
    };

    let targetCategory = categories.find(c => c.category === categoryName);    
    if (!targetCategory) {
        targetCategory = {
            category: categoryName,
            articles: []
        };
        categories.push(targetCategory);
    }
    targetCategory.articles.push(newArticle);

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(categories, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "articles.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    if (titleInput) titleInput.value = "";
    if (contentInput) contentInput.value = "";
    if (charsInput) charsInput.value = "";
    if (delimiterInput) delimiterInput.value = "";
    if (annotationsInput) annotationsInput.value = "";
    
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

    if (GameState.autoSpeakEnabled && typed.length > 0) {    
        const targetText = GameState.getCurrentText();
        const lastTypedIdx = typed.length - 1;       
        
        const isDelimiter = /[\s,.!?;:]/.test(typed[lastTypedIdx]);    
        const isEnd = typed.length === targetText.length;
        
        if (isDelimiter || isEnd) {
            let searchIdx = isDelimiter ? lastTypedIdx - 1 : lastTypedIdx;   
            let word = "";
            
            while (searchIdx >= 0 && /^[A-Za-z]$/.test(targetText[searchIdx])) {
                word = targetText[searchIdx] + word;
                searchIdx--;
            }
            
            const wordStartIndex = searchIdx + 1;   

            if (word.length > 0 && GameState.lastSpokenWordIndex !== wordStartIndex) {
                const typedWordPart = typed.slice(wordStartIndex, wordStartIndex + word.length); 
                if (typedWordPart.toLowerCase() === word.toLowerCase()) {
                    AudioManager.speak(word);                               
                    GameState.lastSpokenWordIndex = wordStartIndex;         
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
// App Initialization Trigger  應用初始化觸發器
document.addEventListener("DOMContentLoaded", () => {
    if (typeof pdfjsLib !== "undefined") {
        pdfjsLib.GlobalWorkerOptions.workerSrc = CONFIG.PDF_WORKER;
    }
    
    initializeEventListeners();
    initializeWordClickDelegation();
    initializeFormToggle();
    loadArticlesFromGit();
});
