/* =====================================================
   PDF.JS CONFIGURATION
===================================================== */

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


/* =====================================================
   DOM
===================================================== */

const pdfUpload =
    document.getElementById("pdf-upload");

const pdfUrl =
    document.getElementById("pdf-url");

const loadUrlBtn =
    document.getElementById("load-url-btn");

const statusText =
    document.getElementById("status");

const gameArea =
    document.getElementById("game-area");

const textDisplay =
    document.getElementById("text-display");

const typingInput =
    document.getElementById("typing-input");

const levelDisplay =
    document.getElementById("level-display");

const prevBtn =
    document.getElementById("prev-btn");

const nextBtn =
    document.getElementById("next-btn");

const restartBtn =
    document.getElementById("restart-btn");

const pdfName =
    document.getElementById("pdf-name");

const pdfPages =
    document.getElementById("pdf-pages");

const accuracyDisplay =
    document.getElementById("accuracy");

const wpmDisplay =
    document.getElementById("wpm");

const progressDisplay =
    document.getElementById("progress");


/* =====================================================
   GAME STATE
===================================================== */

let pdfText = "";

let levels = [];

let currentLevel = 0;

let startTime = null;

let gameFinished = false;


/*
    每關大約幾多 characters
*/
const CHARS_PER_LEVEL = 500;


/* =====================================================
   LOCAL PDF
===================================================== */

pdfUpload.addEventListener(
    "change",
    async function (event) {

        const file =
            event.target.files[0];

        if (!file) {
            return;
        }

        if (file.type !== "application/pdf") {

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
                await pdfjsLib.getDocument({
                    data: arrayBuffer
                }).promise;


            pdfName.textContent =
                file.name;

            pdfPages.textContent =
                `${pdf.numPages} pages`;


            await processPDF(pdf);

        } catch (error) {

            console.error(error);

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
                "🌐 正在載入 PDF URL..."
            );

            const loadingTask =
                pdfjsLib.getDocument({
                    url: url
                });

            const pdf =
                await loadingTask.promise;


            pdfName.textContent =
                getFileNameFromURL(url);

            pdfPages.textContent =
                `${pdf.numPages} pages`;


            await processPDF(pdf);

        } catch (error) {

            console.error(error);

            setStatus(
                "❌ 無法載入 PDF URL。可能是 CORS 限制。"
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
            await pdf.getPage(pageNumber);


        const textContent =
            await page.getTextContent();


        /*
            PDF.js 將文字分成很多 items
        */

        const pageText =
            extractPageText(textContent);


        allText +=
            pageText + "\n\n";
    }


    /* Clean */

    setStatus(
        "🧹 正在清理 PDF 文字..."
    );


    pdfText =
        cleanPDFText(allText);


    if (!pdfText || pdfText.length < 20) {

        setStatus(
            "❌ PDF 裡面搵唔到足夠文字。可能係掃描圖片 PDF。"
        );

        return;
    }


    /* Create levels */

    levels =
        createLevels(
            pdfText,
            CHARS_PER_LEVEL
        );


    if (levels.length === 0) {

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

function extractPageText(textContent) {

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


        /*
            PDF.js 每個 item 有 transform

            transform[5] = Y position
        */

        const currentY =
            item.transform
                ? item.transform[5]
                : null;


        /*
            如果 Y 座標改變，
            通常代表換行
        */

        if (
            previousY !== null &&
            currentY !== null &&
            Math.abs(currentY - previousY) > 5
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
        Normalize line endings
    */

    cleaned =
        cleaned.replace(/\r\n/g, "\n");

    cleaned =
        cleaned.replace(/\r/g, "\n");


    /*
        Remove common page numbers

        1
        2
        123
    */

    cleaned =
        cleaned.replace(
            /^\s*\d+\s*$/gm,
            ""
        );


    /*
        Remove "Page 1", "Page 2"
    */

    cleaned =
        cleaned.replace(
            /^\s*Page\s+\d+\s*$/gim,
            ""
        );


    /*
        Remove "- 1 -" style
    */

    cleaned =
        cleaned.replace(
            /^\s*[-–—]\s*\d+\s*[-–—]\s*$/gm,
            ""
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
        Fix words broken by newline

        example:

        comput
        er

        becomes:

        computer
    */

    cleaned =
        cleaned.replace(
            /([A-Za-z])-\s*\n\s*([A-Za-z])/g,
            "$1$2"
        );


    /*
        Replace newline inside sentence
    */

    cleaned =
        cleaned.replace(
            /([a-zA-Z0-9,.;:!?])\n(?=[a-zA-Z0-9])/g,
            "$1 "
        );


    /*
        Multiple newlines
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
        Remove spaces around brackets
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
        Trim every line
    */

    cleaned =
        cleaned
            .split("\n")
            .map(
                line => line.trim()
            )
            .filter(
                line => line.length > 0
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
        Convert newlines to spaces
        for typing game
    */

    text =
        text.replace(
            /\s+/g,
            " "
        ).trim();


    let start = 0;


    while (
        start < text.length
    ) {

        let end =
            Math.min(
                start + charsPerLevel,
                text.length
            );


        /*
            Try to end level
            at a sentence or space
        */

        if (
            end < text.length
        ) {

            const sentenceEnd =
                text.lastIndexOf(
                    ".",
                    end
                );


            const spaceEnd =
                text.lastIndexOf(
                    " ",
                    end
                );


            if (
                sentenceEnd > start + 300
            ) {

                end =
                    sentenceEnd + 1;

            } else if (
                spaceEnd > start + 300
            ) {

                end =
                    spaceEnd;
            }
        }


        const levelText =
            text
                .slice(start, end)
                .trim();


        if (levelText.length > 0) {

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

    if (!levels.length) {
        return;
    }


    const text =
        levels[currentLevel];


    levelDisplay.textContent =
        `Level ${currentLevel + 1} / ${levels.length}`;


    renderText(text);


    typingInput.value = "";

    typingInput.disabled = false;

    gameFinished = false;

    startTime = null;


    updateStats();


    prevBtn.disabled =
        currentLevel === 0;


    nextBtn.disabled =
        currentLevel === levels.length - 1;


    /*
        Focus input
    */

    setTimeout(
        () => typingInput.focus(),
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
            document.createElement("span");


        span.className =
            "char";


        span.textContent =
            text[i];


        if (i === 0) {

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
   TYPING
===================================================== */

typingInput.addEventListener(
    "input",
    function () {

        if (gameFinished) {
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


        updateCharacterDisplay(
            typed,
            target
        );


        updateStats();


        /*
            Completed
        */

        if (
            typed.length >= target.length &&
            typed === target
        ) {

            finishLevel();
        }

    }
);


/* =====================================================
   CHARACTER DISPLAY
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
        (char, index) => {

            char.classList.remove(
                "correct",
                "incorrect",
                "current"
            );


            if (
                index < typed.length
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
                index === typed.length
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
   STATISTICS
===================================================== */

function updateStats() {

    const typed =
        typingInput.value;


    const target =
        levels[currentLevel] || "";


    /*
        Correct characters
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


    if (typed.length > 0) {

        accuracy =
            (correct / typed.length) *
            100;
    }


    accuracyDisplay.textContent =
        `${accuracy.toFixed(1)}%`;


    /*
        Progress
    */

    let progress = 0;


    if (target.length > 0) {

        progress =
            Math.min(
                (typed.length / target.length) *
                100,
                100
            );
    }


    progressDisplay.textContent =
        `${progress.toFixed(0)}%`;


    /*
        WPM

        Standard:
        5 characters = 1 word
    */

    let wpm = 0;


    if (
        startTime !== null &&
        typed.length > 0
    ) {

        const elapsed =
            (Date.now() - startTime) /
            1000 /
            60;


        if (elapsed > 0) {

            wpm =
                (correct / 5) /
                elapsed;
        }
    }


    wpmDisplay.textContent =
        Math.round(wpm);
}


/* =====================================================
   FINISH LEVEL
===================================================== */

function finishLevel() {

    gameFinished = true;

    typingInput.disabled = true;


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
            `🎉 Level ${currentLevel + 1} 完成！ ` +
            `Accuracy: ${accuracy} | ` +
            `WPM: ${wpm}`
        );

    } else {

        setStatus(
            `🏆 全部完成！ ` +
            `Accuracy: ${accuracy} | ` +
            `WPM: ${wpm}`
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
   HELPERS
===================================================== */

function setStatus(message) {

    statusText.textContent =
        message;
}


function getFileNameFromURL(url) {

    try {

        const parsed =
            new URL(url);


        const pathname =
            parsed.pathname;


        const filename =
            pathname
                .split("/")
                .pop();


        return filename ||
            "PDF Document";

    } catch {

        return "PDF Document";
    }
}
