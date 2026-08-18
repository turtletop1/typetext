/* =====================================================
   PDF.JS
===================================================== */

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


/* =====================================================
   CHECK JAVASCRIPT
===================================================== */

console.log(
    "✅ app.js loaded successfully!"
);


/* =====================================================
   DOM ELEMENTS
===================================================== */

const pdfUpload =
    document.getElementById(
        "pdf-upload"
    );


const pdfUrl =
    document.getElementById(
        "pdf-url"
    );


const loadUrlBtn =
    document.getElementById(
        "load-url-btn"
    );


const statusText =
    document.getElementById(
        "pdf-status"
    );


const gameArea =
    document.getElementById(
        "game-area"
    );


const textDisplay =
    document.getElementById(
        "text-display"
    );


const typingInput =
    document.getElementById(
        "typing-input"
    );


const levelDisplay =
    document.getElementById(
        "level-display"
    );


const prevBtn =
    document.getElementById(
        "prev-btn"
    );


const nextBtn =
    document.getElementById(
        "next-btn"
    );


const restartBtn =
    document.getElementById(
        "restart-btn"
    );


const pdfName =
    document.getElementById(
        "pdf-name"
    );


const pdfPages =
    document.getElementById(
        "pdf-pages"
    );


const accuracyDisplay =
    document.getElementById(
        "accuracy"
    );


const wpmDisplay =
    document.getElementById(
        "wpm"
    );


const progressDisplay =
    document.getElementById(
        "progress"
    );


/* =====================================================
   CHECK DOM
===================================================== */

console.log(
    "PDF Upload:",
    pdfUpload
);

console.log(
    "URL Button:",
    loadUrlBtn
);

console.log(
    "Typing Input:",
    typingInput
);


/* =====================================================
   GAME VARIABLES
===================================================== */

let pdfText = "";

let levels = [];

let currentLevel = 0;

let startTime = null;

let gameFinished = false;


/*
    每關大約 500 characters
*/

const CHARS_PER_LEVEL = 500;


/* =====================================================
   LOCAL PDF UPLOAD
===================================================== */

pdfUpload.addEventListener(
    "change",
    async function (event) {

        const file =
            event.target.files[0];


        if (!file) {

            return;
        }


        console.log(
            "Selected PDF:",
            file.name
        );


        if (
            file.type !==
            "application/pdf"
        ) {

            setStatus(
                "❌ 請選擇 PDF 檔案"
            );

            return;
        }


        try {

            setStatus(
                "📖 正在讀取 PDF..."
            );


            const arrayBuffer =
                await file.arrayBuffer();


            const pdf =
                await pdfjsLib
                    .getDocument({
                        data: arrayBuffer
                    })
                    .promise;


            console.log(
                "PDF loaded:",
                pdf.numPages,
                "pages"
            );


            pdfName.textContent =
                file.name;


            pdfPages.textContent =
                `${pdf.numPages} pages`;


            await processPDF(pdf);


        } catch (error) {

            console.error(
                "PDF Error:",
                error
            );


            setStatus(
                "❌ PDF 讀取失敗：" +
                error.message
            );
        }

    }
);


/* =====================================================
   PDF URL
===================================================== */

loadUrlBtn.addEventListener(
    "click",
    async function () {

        const url =
            pdfUrl.value.trim();


        if (!url) {

            setStatus(
                "⚠️ 請輸入 PDF URL"
            );

            return;
        }


        try {

            new URL(url);

        } catch {

            setStatus(
                "❌ URL 格式不正確"
            );

            return;
        }


        try {

            setStatus(
                "🌐 正在載入 PDF..."
            );


            console.log(
                "Loading PDF URL:",
                url
            );


            const loadingTask =
                pdfjsLib.getDocument({
                    url: url
                });


            const pdf =
                await loadingTask.promise;


            console.log(
                "URL PDF loaded:",
                pdf.numPages,
                "pages"
            );


            pdfName.textContent =
                getFileNameFromURL(url);


            pdfPages.textContent =
                `${pdf.numPages} pages`;


            await processPDF(pdf);


        } catch (error) {

            console.error(
                "URL PDF Error:",
                error
            );


            setStatus(
                "❌ 無法載入 PDF。可能是 PDF 網站的 CORS 限制。"
            );
        }

    }
);


/* =====================================================
   PROCESS PDF
===================================================== */

async function processPDF(pdf) {

    setStatus(
        "🔎 正在提取 PDF 文字..."
    );


    let allText = "";


    for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
    ) {

        setStatus(
            `🔎 正在讀取第 ${pageNumber} / ${pdf.numPages} 頁...`
        );


        const page =
            await pdf.getPage(
                pageNumber
            );


        const textContent =
            await page.getTextContent();


        const pageText =
            extractPageText(
                textContent
            );


        allText +=
            pageText + "\n\n";
    }


    console.log(
        "Raw PDF text:",
        allText
    );


    /* =========================
       CLEAN TEXT
    ========================== */

    setStatus(
        "🧹 正在清理 PDF 文字..."
    );


    pdfText =
        cleanPDFText(
            allText
        );


    console.log(
        "Clean text:",
        pdfText
    );


    if (
        !pdfText ||
        pdfText.length < 20
    ) {

        setStatus(
            "❌ PDF 裡面搵唔到足夠文字。這可能是掃描圖片 PDF。"
        );

        return;
    }


    /* =========================
       CREATE LEVELS
    ========================== */

    setStatus(
        "🎮 正在建立遊戲關卡..."
    );


    levels =
        createLevels(
            pdfText,
            CHARS_PER_LEVEL
        );


    console.log(
        "Levels:",
        levels
    );


    if (
        levels.length === 0
    ) {

        setStatus(
            "❌ 無法建立遊戲關卡"
        );

        return;
    }


    currentLevel = 0;


    gameArea.classList.remove(
        "hidden"
    );


    showLevel();


    setStatus(
        `✅ PDF 載入成功！共 ${levels.length} 個關卡`
    );
}


/* =====================================================
   EXTRACT PAGE TEXT
===================================================== */

function extractPageText(
    textContent
) {

    let result = "";

    let previousY = null;


    for (
        const item of textContent.items
    ) {

        const text =
            item.str.trim();


        if (!text) {

            continue;
        }


        const currentY =
            item.transform
                ? item.transform[5]
                : null;


        /*
            Detect new line
        */

        if (
            previousY !== null &&
            currentY !== null &&
            Math.abs(
                currentY -
                previousY
            ) > 5
        ) {

            result += "\n";

        } else {

            result += " ";
        }


        result += text;


        previousY =
            currentY;
    }


    return result;
}


/* =====================================================
   CLEAN PDF TEXT
===================================================== */

function cleanPDFText(text) {

    let cleaned = text;


    /*
        Normalize line breaks
    */

    cleaned =
        cleaned.replace(
            /\r\n/g,
            "\n"
        );


    cleaned =
        cleaned.replace(
            /\r/g,
            "\n"
        );


    /*
        Remove standalone page numbers
    */

    cleaned =
        cleaned.replace(
            /^\s*\d+\s*$/gm,
            ""
        );


    /*
        Remove "Page 1"
    */

    cleaned =
        cleaned.replace(
            /^\s*Page\s+\d+\s*$/gim,
            ""
        );


    /*
        Remove "- 1 -"
    */

    cleaned =
        cleaned.replace(
            /^\s*[-–—]\s*\d+\s*[-–—]\s*$/gm,
            ""
        );


    /*
        Fix hyphenated line breaks

        comput-
        er

        →

        computer
    */

    cleaned =
        cleaned.replace(
            /([A-Za-z])-\s*\n\s*([A-Za-z])/g,
            "$1$2"
        );


    /*
        Replace line breaks
        inside sentences
    */

    cleaned =
        cleaned.replace(
            /([a-zA-Z0-9,.;:!?])\n(?=[a-zA-Z0-9])/g,
            "$1 "
        );


    /*
        Remove excessive spaces
    */

    cleaned =
        cleaned.replace(
            /[ \t]+/g,
            " "
        );


    /*
        Remove excessive newlines
    */

    cleaned =
        cleaned.replace(
            /\n{2,}/g,
            "\n"
        );


    /*
        Remove spaces before punctuation
    */

    cleaned =
        cleaned.replace(
            /\s+([,.!?;:])/g,
            "$1"
        );


    /*
        Brackets
    */

    cleaned =
        cleaned.replace(
            /\(\s+/g,
            "("
        );


    cleaned =
        cleaned.replace(
            /\s+\)/g,
            ")"
        );


    /*
        Trim each line
    */

    cleaned =
        cleaned
            .split("\n")
            .map(
                line =>
                    line.trim()
            )
            .filter(
                line =>
                    line.length > 0
            )
            .join("\n");


    return cleaned.trim();
}


/* =====================================================
   CREATE LEVELS
===================================================== */

function createLevels(
    text,
    charsPerLevel
) {

    const result = [];


    /*
        Convert all whitespace
        into normal spaces
    */

    text =
        text
            .replace(
                /\s+/g,
                " "
            )
            .trim();


    let start = 0;


    while (
        start < text.length
    ) {

        let end =
            Math.min(
                start +
                charsPerLevel,
                text.length
            );


        /*
            Try to finish at
            sentence end
        */

        if (
            end <
            text.length
        ) {

            const sentenceEnd =
                text.lastIndexOf(
                    ".",
                    end
                );


            const questionEnd =
                text.lastIndexOf(
                    "?",
                    end
                );


            const exclamationEnd =
                text.lastIndexOf(
                    "!",
                    end
                );


            const bestSentenceEnd =
                Math.max(
                    sentenceEnd,
                    questionEnd,
                    exclamationEnd
                );


            const spaceEnd =
                text.lastIndexOf(
                    " ",
                    end
                );


            if (
                bestSentenceEnd >
                start + 300
            ) {

                end =
                    bestSentenceEnd + 1;

            } else if (
                spaceEnd >
                start + 300
            ) {

                end =
                    spaceEnd;
            }
        }


        const levelText =
            text
                .slice(
                    start,
                    end
                )
                .trim();


        if (
            levelText.length > 0
        ) {

            result.push(
                levelText
            );
        }


        start = end;
    }


    return result;
}


/* =====================================================
   SHOW LEVEL
===================================================== */

function showLevel() {

    if (
        !levels.length
    ) {

        return;
    }


    const text =
        levels[currentLevel];


    levelDisplay.textContent =
        `Level ${
            currentLevel + 1
        } / ${
            levels.length
        }`;


    renderText(text);


    typingInput.value = "";


    typingInput.disabled =
        false;


    gameFinished =
        false;


    startTime =
        null;


    updateStats();


    prevBtn.disabled =
        currentLevel === 0;


    nextBtn.disabled =
        currentLevel ===
        levels.length - 1;


    /*
        Focus typing box
    */

    setTimeout(
        function () {

            typingInput.focus();

        },
        100
    );
}


/* =====================================================
   RENDER TEXT
===================================================== */

function renderText(text) {

    textDisplay.innerHTML = "";


    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const span =
            document.createElement(
                "span"
            );


        span.className =
            "char";


        span.textContent =
            text[i];


        if (
            i === 0
        ) {

            span.classList.add(
                "current"
            );
        }


        textDisplay.appendChild(
            span
        );
    }
}


/* =====================================================
   TYPING INPUT
===================================================== */

typingInput.addEventListener(
    "input",
    function () {

        if (
            gameFinished
        ) {

            return;
        }


        const typed =
            typingInput.value;


        const target =
            levels[currentLevel];


        /*
            Start timer
        */

        if (
            typed.length > 0 &&
            startTime === null
        ) {

            startTime =
                Date.now();
        }


        /*
            Update character colours
        */

        updateCharacterDisplay(
            typed,
            target
        );


        /*
            Update statistics
        */

        updateStats();


        /*
            Check completed
        */

        if (
            typed.length >=
            target.length &&
            typed === target
        ) {

            finishLevel();
        }

    }
);


/* =====================================================
   UPDATE CHARACTER DISPLAY
===================================================== */

function updateCharacterDisplay(
    typed,
    target
) {

    const chars =
        textDisplay.querySelectorAll(
            ".char"
        );


    chars.forEach(
        function (
            char,
            index
        ) {

            char.classList.remove(
                "correct",
                "incorrect",
                "current"
            );


            /*
                Already typed
            */

            if (
                index <
                typed.length
            ) {

                if (
                    typed[index] ===
                    target[index]
                ) {

                    char.classList.add(
                        "correct"
                    );

                } else {

                    char.classList.add(
                        "incorrect"
                    );
                }
            }


            /*
                Current character
            */

            if (
                index ===
                typed.length
            ) {

                char.classList.add(
                    "current"
                );
            }

        }
    );


    /*
        Scroll current character
        into view
    */

    const current =
        textDisplay.querySelector(
            ".current"
        );


    if (current) {

        current.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}


/* =====================================================
   UPDATE STATS
===================================================== */

function updateStats() {

    const typed =
        typingInput.value;


    const target =
        levels[currentLevel] ||
        "";


    /*
        Count correct
    */

    let correct = 0;


    for (
        let i = 0;
        i < typed.length &&
        i < target.length;
        i++
    ) {

        if (
            typed[i] ===
            target[i]
        ) {

            correct++;
        }
    }


    /*
        Accuracy
    */

    let accuracy = 100;


    if (
        typed.length > 0
    ) {

        accuracy =
            (
                correct /
                typed.length
            ) *
            100;
    }


    accuracyDisplay.textContent =
        `${accuracy.toFixed(1)}%`;


    /*
        Progress
    */

    let progress = 0;


    if (
        target.length > 0
    ) {

        progress =
            Math.min(
                (
                    typed.length /
                    target.length
                ) *
                100,
                100
            );
    }


    progressDisplay.textContent =
        `${progress.toFixed(0)}%`;


    /*
        WPM

        5 characters = 1 word
    */

    let wpm = 0;


    if (
        startTime !== null &&
        typed.length > 0
    ) {

        const elapsedMinutes =
            (
                Date.now() -
                startTime
            ) /
            1000 /
            60;


        if (
            elapsedMinutes > 0
        ) {

            wpm =
                (
                    correct / 5
                ) /
                elapsedMinutes;
        }
    }


    wpmDisplay.textContent =
        Math.round(wpm);
}


/* =====================================================
   FINISH LEVEL
===================================================== */

function finishLevel() {

    gameFinished =
        true;


    typingInput.disabled =
        true;


    updateStats();


    const accuracy =
        accuracyDisplay.textContent;


    const wpm =
        wpmDisplay.textContent;


    if (
        currentLevel <
        levels.length - 1
    ) {

        setStatus(
            `🎉 Level ${
                currentLevel + 1
            } 完成！ Accuracy: ${
                accuracy
            } | WPM: ${
                wpm
            }`
        );

    } else {

        setStatus(
            `🏆 全部完成！ Accuracy: ${
                accuracy
            } | WPM: ${
                wpm
            }`
        );
    }
}


/* =====================================================
   NEXT LEVEL
===================================================== */

nextBtn.addEventListener(
    "click",
    function () {

        if (
            currentLevel <
            levels.length - 1
        ) {

            currentLevel++;

            showLevel();
        }

    }
);


/* =====================================================
   PREVIOUS LEVEL
===================================================== */

prevBtn.addEventListener(
    "click",
    function () {

        if (
            currentLevel > 0
        ) {

            currentLevel--;

            showLevel();
        }

    }
);


/* =====================================================
   RESTART
===================================================== */

restartBtn.addEventListener(
    "click",
    function () {

        showLevel();

    }
);


/* =====================================================
   STATUS
===================================================== */

function setStatus(
    message
) {

    statusText.textContent =
        message;
}


/* =====================================================
   GET FILE NAME FROM URL
===================================================== */

function getFileNameFromURL(
    url
) {

    try {

        const parsed =
            new URL(url);


        const pathname =
            parsed.pathname;


        const filename =
            pathname
                .split("/")
                .pop();


        if (
            filename
        ) {

            return filename;
        }


        return "PDF Document";

    } catch {

        return "PDF Document";
    }
}


/* =====================================================
   INITIAL STATE
===================================================== */

gameArea.classList.add(
    "hidden"
);


console.log(
    "✅ PDF Typing Game ready!"
);
