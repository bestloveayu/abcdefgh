const steps = [
    { key: "base", options: [
        { name: "蘭姆酒", id: "base1", key: "base" },
        { name: "威士忌", id: "base2", key: "base" },
        { name: "伏特加", id: "base3", key: "base" }
    ]},
    { key: "lemon", options: [
        { name: "檸檬汁", id: "lemon-juice", key: "lemon" }
    ]},
    { key: "flavor", options: [
        { name: "咖啡", id: "coffee", key: "flavor" },
        { name: "咖啡利口酒", id: "coffee-liqueur", key: "flavor" },
        { name: "肉桂", id: "cinnamon", key: "flavor" },
        { name: "蜂蜜", id: "honey", key: "flavor" },
        { name: "橙酒", id: "orange-liqueur", key: "flavor" }
    ]},
    { key: "garnish", options: [
        { name: "檸檬片", id: "lemon-slice", key: "garnish" },
        { name: "鮮奶油", id: "cream", key: "garnish" },
        { name: "咖啡豆", id: "coffee-bean", key: "garnish" }
    ]},
    { key: "ice", options: [
        { name: "冰塊", id: "ice-drink", key: "ice" },
        { name: "熱飲", id: "hot-drink", key: "ice" }
    ]}
];

let currentStep = 0;
let selections = {};
let result = null;
let model = null;
let webcam = null;
let userId = null;
let recognitionResult = null;

let canvas = null;
let ctx = null;
let particles = [];

function initCanvas() {
    console.log("初始化畫布...");
    if (!canvas || !ctx) {
        console.error("Particle canvas not found or context not initialized!");
        return;
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.speedX = Math.random() * 3 - 1.5;
        this.speedY = Math.random() * 3 - 1.5;
        this.life = 1;
        this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
        this.size *= 0.98;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function createParticles(x, y) {
    if (!particles) particles = [];
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y));
    }
}

function animateParticles() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    requestAnimationFrame(animateParticles);
}

async function submitToGoogleForm() {
    if (!userId) return;

    const formData = {
        userId,
        base: selections.base || "無",
        lemon: selections.lemon || "無",
        flavor: selections.flavor || "無",
        garnish: selections.garnish || "無",
        ice: selections.ice || "無",
        stars: result ? result.stars : "無",
        name: result ? result.name : "無",
        cocktailName: recognitionResult ? recognitionResult.cocktailName : "無",
        probability: recognitionResult ? recognitionResult.probability.toFixed(2) : "無"
    };

    try {
        const response = await fetch('https://docs.google.com/forms/d/e/1FAIpQLSd_CrHBSjGD64DgThdFicrvaNsEiAA4LIhGsyF2XI6vTzgv4A/formResponse', {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'entry.2132530962': formData.userId,
                'entry.1990997538': formData.base,
                'entry.16139639': formData.lemon,
                'entry.1291148248': formData.flavor,
                'entry.1589469551': formData.garnish,
                'entry.1876026105': formData.ice,
                'entry.1381809100': formData.stars,
                'entry.5840647': formData.name,
                'entry.1131561254': formData.cocktailName,
                'entry.297429417': formData.probability
            }).toString()
        });
        console.log("資料已提交到 Google 表單");
    } catch (error) {
        console.error("提交資料失敗:", error);
    }
}

function renderUserIdInput() {
    console.log("渲染使用者編號輸入畫面...");
    const app = document.getElementById('app');
    if (!app) {
        console.error("App element not found in renderUserIdInput!");
        return;
    }
    app.innerHTML = `
        <div class="container">
            <div class="card">
                <h1>歡迎來到微醺研究所</h1>
                <div class="user-id-input-container">
                    <input type="text" id="user-id-input" placeholder="例如: 001" />
                    <button id="start-button" class="start-button">開始</button>
                </div>
            </div>
        </div>
    `;
}

function startGame() {
    console.log("開始遊戲被觸發...");
    const inputElement = document.getElementById('user-id-input');
    if (!inputElement) {
        console.error("User ID input element not found!");
        return;
    }
    const input = inputElement.value.trim();
    console.log("輸入的 userId:", input);
    if (!input) {
        alert("請輸入使用者編號！");
        return;
    }
    userId = input;
    console.log("設置 userId:", userId);
    currentStep = 0;
    selections = {};
    render();
}

async function waitForTmImage() {
    let attempts = 0;
    const maxAttempts = 20;
    while (typeof tmImage === 'undefined' && attempts < maxAttempts) {
        console.log(`等待 tmImage 載入... (嘗試 ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
    }
    if (typeof tmImage === 'undefined') {
        console.error("tmImage 未定義，確認 teachablemachine-image.min.js 是否正確載入");
        return false;
    }
    console.log("tmImage 已成功定義:", tmImage);
    return true;
}

async function loadTeachableModel() {
    const URL = "./teachable-machine-model/";
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";
    const teachableResult = document.getElementById("teachable-result");

    console.log("檢查 tmImage 是否已定義...");
    const tmImageLoaded = await waitForTmImage();
    if (!tmImageLoaded) {
        if (teachableResult) {
            teachableResult.innerText = "錯誤：tmImage 未定義，請確認 teachablemachine-image.min.js 是否正確載入";
        }
        return;
    }

    try {
        console.log("開始載入模型檔案:", modelURL);
        model = await tmImage.load(modelURL, metadataURL);
        console.log("Teachable Machine model loaded successfully");
        if (teachableResult) {
            teachableResult.innerText = "模型載入成功";
        }
    } catch (error) {
        console.error("模型載入失敗:", error);
        if (teachableResult) {
            teachableResult.innerText = `無法載入模型：${error.message}。請確認 teachable-machine-model 資料夾中是否存在 model.json、metadata.json 和 weights.bin 檔案。`;
        }
    }
}

async function predictCocktail() {
    const webcamContainer = document.getElementById("webcam-container");
    const teachableMachineContainer = document.getElementById("teachable-machine-container");
    const teachableResult = document.getElementById("teachable-result");

    if (!webcamContainer || !teachableMachineContainer || !teachableResult) {
        console.error("Teachable Machine container elements not found!");
        return;
    }

    webcamContainer.innerHTML = "";
    const successMessage = document.getElementById("success-message");
    if (successMessage) successMessage.remove();

    const tmImageLoaded = await waitForTmImage();
    if (!tmImageLoaded) {
        teachableResult.innerText = "錯誤：tmImage 未定義，請確認 teachablemachine-image.min.js 是否正確載入";
        return;
    }

    if (!model) {
        await loadTeachableModel();
        if (!model) return;
    }

    try {
        webcam = new tmImage.Webcam(400, 400, true);
        await webcam.setup();
        await webcam.play();
        webcamContainer.appendChild(webcam.canvas);
        teachableResult.innerText = "攝影機已啟動，正在辨識...";

        const confirmButton = document.createElement('button');
        confirmButton.className = 'teachable-button';
        confirmButton.innerText = '確認送上此調酒';
        confirmButton.onclick = () => {
            webcam.stop();
            const resultText = teachableResult.innerText;
            const match = resultText.match(/辨識結果: (.+) \((.+)%\)/);
            recognitionResult = {
                cocktailName: match ? match[1] : "未知調酒",
                probability: match ? parseFloat(match[2]) : 0
            };
            submitToGoogleForm();
            const successMessage = document.createElement('div');
            successMessage.id = 'success-message';
            successMessage.innerText = `你成功製作了顧客想要的調酒：${recognitionResult.cocktailName}`;
            teachableMachineContainer.appendChild(successMessage);
            confirmButton.remove();
        };
        teachableMachineContainer.appendChild(confirmButton);

        const loop = async () => {
            webcam.update();
            const prediction = await model.predict(webcam.canvas);
            const maxPrediction = prediction.reduce((prev, current) => (prev.probability > current.probability) ? prev : current);
            const probability = maxPrediction.probability * 100;
            teachableResult.innerText = `辨識結果: ${maxPrediction.className} (${probability.toFixed(2)}%)`;
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    } catch (error) {
        console.error("攝影機錯誤詳情:", error);
        teachableResult.innerText = `無法開啟攝影機：${error.message}。請確認攝影機權限。`;
    }
}

function evaluateCocktail(selections) {
    if (selections.base === "威士忌" &&
        selections.lemon === undefined &&
        selections.flavor === "咖啡" &&
        selections.garnish === "鮮奶油" &&
        selections.ice === "熱飲") {
        return { stars: 3, name: "愛爾蘭咖啡", image: "./irish-coffee-result.jpg", dialogue: "有威士忌加咖啡的味道，配上溫熱的口感，還有我愛的鮮奶油，我又重新振作了。" };
    }
    if (selections.base === "威士忌" &&
        selections.lemon === "檸檬汁" &&
        selections.flavor === "蜂蜜" &&
        selections.garnish === "檸檬片" &&
        selections.ice === "熱飲") {
        return { stars: 2, name: "熱托迪", image: "./hot-toddy-result.jpg", dialogue: "威士忌的風味很棒，如果有咖啡的味道就更完美了..." };
    }
    if (selections.base === "蘭姆酒" &&
        selections.lemon === undefined &&
        selections.flavor === "肉桂" &&
        selections.garnish === "鮮奶油" &&
        selections.ice === "熱飲") {
        return { stars: 1, name: "奶油熱蘭姆酒", image: "./hot-buttered-rum-result.jpg", dialogue: "雖然喝起來是熱的，蘭姆酒跟鮮奶油我也很喜歡，但裡面有肉桂的味道，讓我覺得不太舒服。" };
    }
    if (selections.base === "伏特加" &&
        selections.lemon === undefined &&
        selections.flavor === "咖啡" &&
        selections.garnish === "咖啡豆" &&
        selections.ice === "冰塊") {
        return { stars: 1, name: "咖啡馬丁尼", image: "./espresso-martini-result.jpg", dialogue: "喝起來有濃濃的咖啡味，但喝冷飲對我的身體不太好。" };
    }
    if (selections.base === "伏特加" &&
        selections.lemon === undefined &&
        selections.flavor === "咖啡利口酒" &&
        selections.garnish === "鮮奶油" &&
        selections.ice === "冰塊") {
        return { stars: 1, name: "白色俄羅斯", image: "./white-russian-result.jpg", dialogue: "喝起來有濃濃的咖啡味，但喝冷飲對我的身體不太好。" };
    }
    if (selections.base === "伏特加" &&
        selections.lemon === undefined &&
        selections.flavor === "咖啡利口酒" &&
        selections.garnish === undefined &&
        selections.ice === "冰塊") {
        return { stars: 1, name: "黑色俄羅斯", image: "./black-russian-result.jpg", dialogue: "喝起來有濃濃的咖啡味，但喝冷飲對我的身體不太好。" };
    }
    if (selections.base === "伏特加" &&
        selections.lemon === "檸檬汁" &&
        selections.flavor === "橙酒" &&
        selections.garnish === "檸檬片" &&
        selections.ice === undefined) {
        return { stars: 1, name: "神風特攻隊", image: "./kamikaze-result.jpg", dialogue: "喝起來太酸，而且太冰了，我身體受不了。" };
    }
    if (selections.base === "威士忌" &&
        selections.lemon === "檸檬汁" &&
        selections.flavor === undefined &&
        selections.garnish === "檸檬片" &&
        selections.ice === undefined) {
        return { stars: 1, name: "威士忌酸酒", image: "./whiskey-sour-result.jpg", dialogue: "喝起來太酸，而且太冰了，我身體受不了。" };
    }
    return { stars: 0, name: "未知調酒", image: "./angry-customer.jpg", dialogue: "你亂加各種材料，調出來的風味根本無法給顧客喝..." };
}

function render() {
    console.log("開始渲染頁面，當前 userId:", userId);
    const app = document.getElementById('app');
    if (!app) {
        console.error("App element not found in render!");
        return;
    }

    if (!userId) {
        console.log("No userId, rendering input page...");
        renderUserIdInput();
        return;
    }

    if (result) {
        console.log("Rendering result page...");
        const ingredients = `
            基酒: ${selections.base || "無"}<br>
            酸味: ${selections.lemon || "無"}<br>
            特別風味: ${selections.flavor || "無"}<br>
            裝飾: ${selections.garnish || "無"}<br>
            冰塊: ${selections.ice || "無"}
        `;
        const cocktailName = result.name === "未知調酒" ? "錯誤的調酒" : result.name;
        const satisfactionText = result.stars === 0 ? "顧客滿意度:😡😡😡" : `顧客滿意度: ${'⭐'.repeat(result.stars)}`;
        app.innerHTML = `
            <div class="container result-container">
                <div class="card">
                    <p class="result-text ${result.stars === 0 ? 'angry' : ''}">
                        ${satisfactionText}<br>
                        你為顧客送上的調酒: ${cocktailName}
                    </p>
                    <p class="ingredients-text">${ingredients}</p>
                    <img src="${result.image}" alt="${cocktailName}" class="result-image">
                    <p class="dialogue-text">"${result.dialogue}"</p>
                    <button class="restart-button" id="restart-button">再做一杯</button>
                    <div class="teachable-machine-container" id="teachable-machine-container">
                        <button class="teachable-button" id="predict-button">查看製作的調酒</button>
                        <div id="webcam-container"></div>
                        <div id="teachable-result" class="teachable-result"></div>
                    </div>
                </div>
            </div>
        `;
        loadTeachableModel();
        document.getElementById('restart-button').addEventListener('click', resetGame);
        document.getElementById('predict-button').addEventListener('click', predictCocktail);
        return;
    }

    console.log("Rendering game page...");
    app.innerHTML = `
        <div class="container">
            <div class="card">
                <h1>歡迎來到微醺研究所</h1>
                <p>你可以任意將材料加入酒杯製作調酒，請將材料拖曳至酒杯，但要注意材料加入的順序（基酒 -> 酸味 -> 特別風味 -> 裝飾 -> 冰塊/熱飲），一旦加錯了，就只能把酒杯的材料倒入水槽中重新製作。如果你完成調酒，請將酒杯拖曳至顧客區，為顧客送上調酒。</p>
            </div>
            <div class="bar-counter">
                <div class="cabinet">
                    <div class="cabinet-section" data-section="flavor">${steps[2].options.map(o => `<div class="ingredient ${o.id}" id="${o.id}" draggable="true" data-name="${o.name}" data-key="${o.key}"><span class="ingredient-label">${o.name}</span></div>`).join('')}</div>
                    <div class="cabinet-section" data-section="base">${steps[0].options.map(o => `<div class="ingredient ${o.id}" id="${o.id}" draggable="true" data-name="${o.name}" data-key="${o.key}"><span class="ingredient-label">${o.name}</span></div>`).join('')}</div>
                    <div class="cabinet-section" data-section="lemon">${steps[1].options.map(o => `<div class="ingredient ${o.id}" id="${o.id}" draggable="true" data-name="${o.name}" data-key="${o.key}"><span class="ingredient-label">${o.name}</span></div>`).join('')}</div>
                    <div class="cabinet-section" data-section="ice">${steps[4].options.map(o => `<div class="ingredient ${o.id}" id="${o.id}" draggable="true" data-name="${o.name}" data-key="${o.key}"><span class="ingredient-label">${o.name}</span></div>`).join('')}</div>
                    <div class="cabinet-section" data-section="garnish">${steps[3].options.map(o => `<div class="ingredient ${o.id}" id="${o.id}" draggable="true" data-name="${o.name}" data-key="${o.key}"><span class="ingredient-label">${o.name}</span></div>`).join('')}</div>
                </div>
                <div class="counter-area">
                    <div class="glass-area" id="glass-area">
                        <div id="glass" draggable="true">
                            <div class="liquid-layer layer-1 ${selections.base ? 'active' : ''}"></div>
                            <div class="liquid-layer layer-2 ${selections.lemon ? 'active' : ''}"></div>
                            <div class="liquid-layer layer-3 ${selections.flavor ? 'active' : ''}"></div>
                            <div class="liquid-layer layer-4 ${selections.garnish ? 'active' : ''}"></div>
                            <div class="liquid-layer layer-5 ${selections.ice ? 'active' : ''}"></div>
                        </div>
                    </div>
                    <div class="sink-area" id="sink-area">
                        <div id="sink"></div>
                    </div>
                </div>
                <div class="customer-area" id="customer-area">
                    <div id="customer-seat"></div>
                </div>
            </div>
            <div class="feedback-message" id="feedback-message"></div>
        </div>
    `;

    const ingredients = document.querySelectorAll('.ingredient');
    ingredients.forEach(ingredient => {
        ingredient.addEventListener('dragstart', handleDragStart);
        ingredient.addEventListener('dragend', handleDragEnd);
        ingredient.addEventListener('touchstart', handleTouchStart, { passive: false });
        ingredient.addEventListener('touchmove', handleTouchMove, { passive: false });
        ingredient.addEventListener('touchend', handleTouchEnd, { passive: false });
    });

    const glass = document.getElementById('glass');
    if (glass) {
        glass.addEventListener('dragstart', handleGlassDragStart);
        glass.addEventListener('dragend', handleGlassDragEnd);
        glass.addEventListener('touchstart', handleTouchStart, { passive: false });
        glass.addEventListener('touchmove', handleTouchMove, { passive: false });
        glass.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    const glassArea = document.getElementById('glass-area');
    if (glassArea) {
        glassArea.addEventListener('dragover', handleDragOver);
        glassArea.addEventListener('drop', handleDrop);
    }

    const sinkArea = document.getElementById('sink-area');
    if (sinkArea) {
        sinkArea.addEventListener('dragover', handleSinkDragOver);
        sinkArea.addEventListener('drop', handleSinkDrop);
    }

    const customerArea = document.getElementById('customer-area');
    if (customerArea) {
        customerArea.addEventListener('dragover', handleCustomerDragOver);
        customerArea.addEventListener('drop', handleCustomerDrop);
    }
}

function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.id);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleGlassDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', 'glass');
}

function handleGlassDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text');
    if (id === 'glass') return;

    const draggedElement = document.getElementById(id);
    const name = draggedElement.dataset.name;
    const key = draggedElement.dataset.key;
    const stepIndex = steps.findIndex(step => step.key === key);
    const feedbackMessage = document.getElementById('feedback-message');

    if (stepIndex === currentStep) {
        selections[key] = name;
        feedbackMessage.textContent = `成功加入${name}！`;
        feedbackMessage.classList.add('show');
        setTimeout(() => feedbackMessage.classList.remove('show'), 2000);

        const rect = draggedElement.getBoundingClientRect();
        createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);

        draggedElement.style.opacity = '0';
        draggedElement.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            draggedElement.style.display = 'none';
        }, 500);

        const layers = document.querySelectorAll('.liquid-layer');
        layers[stepIndex].classList.add('active');
        layers[stepIndex].style.bottom = `${50 * stepIndex}px`;

        currentStep++;
    } else {
        feedbackMessage.textContent = `無法加入${name}，順序不對！`;
        feedbackMessage.classList.add('show');
        setTimeout(() => feedbackMessage.classList.remove('show'), 2000);
    }
}

function handleSinkDragOver(e) {
    e.preventDefault();
}

function handleSinkDrop(e) {
    e.preventDefault();
    const glass = document.getElementById('glass');
    if (e.dataTransfer.getData('text') !== 'glass') return;

    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog';
    confirmDialog.innerHTML = `
        <p>確定要把酒倒入水槽並重新製作嗎？</p>
        <button id="confirm-reset-yes">確認</button>
        <button id="confirm-reset-no">取消</button>
    `;
    document.getElementById('app').appendChild(confirmDialog);

    document.getElementById('confirm-reset-yes').addEventListener('click', () => confirmReset(true));
    document.getElementById('confirm-reset-no').addEventListener('click', () => confirmReset(false));

    window.confirmReset = function(confirm) {
        if (confirm) {
            const sinkAnimation = document.createElement('div');
            sinkAnimation.className = 'sink-animation';
            glass.appendChild(sinkAnimation);
            setTimeout(() => {
                sinkAnimation.remove();
                selections = {};
                currentStep = 0;
                const layers = document.querySelectorAll('.liquid-layer');
                layers.forEach(layer => layer.classList.remove('active'));
                render();
            }, 1000);
        }
        confirmDialog.remove();
    };
}

function handleCustomerDragOver(e) {
    e.preventDefault();
}

function handleCustomerDrop(e) {
    e.preventDefault();
    const glass = document.getElementById('glass');
    if (e.dataTransfer.getData('text') !== 'glass') return;

    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'confirm-dialog';
    confirmDialog.innerHTML = `
        <p>是否確定為顧客送上這杯調酒？</p>
        <button id="confirm-serve-yes">確認</button>
        <button id="confirm-serve-no">取消</button>
    `;
    document.getElementById('app').appendChild(confirmDialog);

    document.getElementById('confirm-serve-yes').addEventListener('click', () => confirmServe(true));
    document.getElementById('confirm-serve-no').addEventListener('click', () => confirmServe(false));

    window.confirmServe = function(confirm) {
        if (confirm) {
            const overlay = document.createElement('div');
            overlay.className = 'transition-overlay';
            const glassAnimation = document.createElement('div');
            glassAnimation.className = 'glass-animation';
            overlay.appendChild(glassAnimation);
            const servingText = document.createElement('div');
            servingText.className = 'serving-text';
            servingText.innerText = "你正為顧客送上調酒";
            overlay.appendChild(servingText);
            document.body.appendChild(overlay);

            setTimeout(() => {
                overlay.remove();
                result = evaluateCocktail(selections);
                render();
                submitToGoogleForm();
            }, 3000);
        }
        confirmDialog.remove();
    };
}

let touchElement = null;
let touchStartX = 0;
let touchStartY = 0;
let initialX = 0;
let initialY = 0;

function handleTouchStart(e) {
    e.preventDefault();
    touchElement = e.target.closest('.ingredient, #glass');
    if (!touchElement) return;

    touchElement.classList.add('dragging');
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    const rect = touchElement.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;

    touchElement.style.position = 'fixed';
    touchElement.style.left = `${initialX}px`;
    touchElement.style.top = `${initialY}px`;
    touchElement.style.zIndex = '1000';
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!touchElement) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    touchElement.style.left = `${initialX + deltaX}px`;
    touchElement.style.top = `${initialY + deltaY}px`;
}

function handleTouchEnd(e) {
    e.preventDefault();
    if (!touchElement) return;

    touchElement.classList.remove('dragging');
    touchElement.style.position = '';
    touchElement.style.left = '';
    touchElement.style.top = '';
    touchElement.style.zIndex = '';

    const touch = e.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    const glassArea = document.getElementById('glass-area');
    const sinkArea = document.getElementById('sink-area');
    const customerArea = document.getElementById('customer-area');

    const isInArea = (area) => {
        if (!area) return false;
        const rect = area.getBoundingClientRect();
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    const simulatedEvent = {
        preventDefault: () => {},
        dataTransfer: {
            getData: () => touchElement.id === 'glass' ? 'glass' : touchElement.id,
            setData: () => {}
        }
    };

    if (isInArea(glassArea) && touchElement.id !== 'glass') {
        handleDrop(simulatedEvent);
    } else if (isInArea(sinkArea) && touchElement.id === 'glass') {
        handleSinkDrop(simulatedEvent);
    } else if (isInArea(customerArea) && touchElement.id === 'glass') {
        handleCustomerDrop(simulatedEvent);
    }

    touchElement = null;
}

function resetGame() {
    currentStep = 0;
    selections = {};
    result = null;
    recognitionResult = null;
    model = null;
    if (webcam) {
        webcam.stop();
        webcam = null;
    }
    userId = null;
    render();
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded event fired");
    canvas = document.getElementById('particle-canvas');
    ctx = canvas ? canvas.getContext('2d') : null;
    initCanvas();
    animateParticles();
    render();

    const startButton = document.getElementById('start-button');
    if (startButton) {
        startButton.addEventListener('click', startGame);
    } else {
        console.error("Start button not found!");
    }
});