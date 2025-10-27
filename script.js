// Инициализация Telegram Web App
let tg = window.Telegram.WebApp;

// Основные переменные приложения
let canvas, ctx;
let isDrawing = false;
let lastX = 0, lastY = 0;
let startX = 0, startY = 0;
let currentTool = 'brush';
let savedImageData = null;
let currentBackground = 'transparent';

// История действий
let history = [];
let historyIndex = -1;
const MAX_HISTORY = 20;

// Система слоев
let layers = [];
let activeLayerIndex = 0;

// Совместная работа
let peer = null;
let currentSession = null;
let connections = [];
let collabActive = false;

// Состояние панелей
let panelsState = {
    layers: false,
    templates: false,
    collab: false
};

// Класс слоя
class Layer {
    constructor(name = 'Новый слой') {
        this.id = Date.now() + Math.random();
        this.name = name;
        this.visible = true;
        this.opacity = 1;
        this.blendMode = 'source-over';
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
    }

    resize() {
        this.canvas.width = canvas.width;
        this.canvas.height = canvas.height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw() {
        if (!this.visible) return;
        
        ctx.globalAlpha = this.opacity;
        ctx.globalCompositeOperation = this.blendMode;
        ctx.drawImage(this.canvas, 0, 0);
        
        // Сброс настроек
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('🚀 Инициализация Paint Messenger...');
    
    // Инициализация Telegram
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
    
    // Инициализация элементов
    initializeCanvas();
    initializeLayers();
    initializeTools();
    initializePanels();
    initializeSaveFunctions();
    initializeCollaboration();
    
    // Установка обработчиков событий
    setupEventListeners();
    
    // Применение темы Telegram
    applyTelegramTheme();
    
    console.log('✅ Приложение инициализировано');
}

function initializeCanvas() {
    canvas = document.getElementById('paintCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    
    // Обработчик изменения размера окна
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Масштабирование контекста
    ctx.scale(dpr, dpr);
    
    // Обновление стилей
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // Перерисовка слоев
    layers.forEach(layer => layer.resize());
    redrawCanvas();
    
    console.log('📐 Холст переразмерен:', canvas.width, canvas.height);
}

function initializeLayers() {
    // Создание базового слоя
    const baseLayer = new Layer('Фон');
    layers.push(baseLayer);
    activeLayerIndex = 0;
    
    updateLayersUI();
    console.log('📚 Система слоев инициализирована');
}

function initializeTools() {
    // Настройка начальных параметров кисти
    updateBrushSettings();
    
    console.log('🛠️ Инструменты инициализированы');
}

function initializePanels() {
    // Скрытие всех панелей при старте
    hideAllPanels();
    
    console.log('📦 Панели инициализированы');
}

function initializeSaveFunctions() {
    // Инициализация уже выполнена через обработчики событий
    console.log('💾 Функции сохранения инициализированы');
}

function initializeCollaboration() {
    try {
        peer = new Peer({
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });
        
        peer.on('open', function(id) {
            console.log('🔗 Peer соединение установлено, ID:', id);
            document.getElementById('sessionId').value = id;
            updateCollabStatus('Готов к подключению');
        });
        
        peer.on('connection', function(conn) {
            setupConnection(conn);
        });
        
        peer.on('error', function(err) {
            console.error('❌ Ошибка Peer:', err);
            updateCollabStatus('Ошибка соединения');
        });
        
    } catch (error) {
        console.error('❌ Не удалось инициализировать совместную работу:', error);
        updateCollabStatus('Недоступно');
    }
}

// Управление панелями
function togglePanel(panelName) {
    const panel = document.getElementById(panelName + 'Panel');
    
    if (panelsState[panelName]) {
        panel.style.display = 'none';
        panelsState[panelName] = false;
    } else {
        hideAllPanels();
        panel.style.display = 'block';
        panelsState[panelName] = true;
    }
}

function hideAllPanels() {
    document.querySelectorAll('.panel').forEach(panel => {
        panel.style.display = 'none';
    });
    
    Object.keys(panelsState).forEach(key => {
        panelsState[key] = false;
    });
}

// Система слоев
function updateLayersUI() {
    const layersList = document.getElementById('layersList');
    layersList.innerHTML = '';
    
    layers.forEach((layer, index) => {
        const layerElement = document.createElement('div');
        layerElement.className = `layer-item ${index === activeLayerIndex ? 'active' : ''}`;
        layerElement.innerHTML = `
            <span class="layer-visibility">${layer.visible ? '👁️' : '👁️‍🗨️'}</span>
            <span class="layer-name">${layer.name}</span>
            <span class="layer-opacity">${Math.round(layer.opacity * 100)}%</span>
        `;
        
        layerElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('layer-visibility')) {
                layer.visible = !layer.visible;
                redrawCanvas();
            } else {
                setActiveLayer(index);
            }
            updateLayersUI();
        });
        
        layersList.appendChild(layerElement);
    });
}

function setActiveLayer(index) {
    if (index >= 0 && index < layers.length) {
        activeLayerIndex = index;
        updateLayersUI();
        redrawCanvas();
    }
}

function addNewLayer() {
    const newLayer = new Layer(`Слой ${layers.length + 1}`);
    layers.push(newLayer);
    setActiveLayer(layers.length - 1);
    
    tg.HapticFeedback.impactOccurred('light');
}

function mergeLayers() {
    if (layers.length <= 1) {
        tg.showPopup({
            title: 'Информация',
            message: 'Нечего объединять',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    // Создаем временный canvas для объединения
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Объединяем все видимые слои
    layers.forEach(layer => {
        if (layer.visible) {
            tempCtx.globalAlpha = layer.opacity;
            tempCtx.globalCompositeOperation = layer.blendMode;
            tempCtx.drawImage(layer.canvas, 0, 0);
        }
    });
    
    // Очищаем слои и создаем один объединенный
    const mergedLayer = new Layer('Объединенный слой');
    mergedLayer.ctx.drawImage(tempCanvas, 0, 0);
    
    layers = [mergedLayer];
    setActiveLayer(0);
    
    tg.HapticFeedback.impactOccurred('medium');
    tg.showPopup({
        title: 'Успех',
        message: 'Слои объединены',
        buttons: [{ type: 'ok' }]
    });
}

function redrawCanvas() {
    // Очищаем основной canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем все слои
    layers.forEach(layer => layer.draw());
}

// Инструменты рисования
function updateBrushSettings() {
    const activeLayer = layers[activeLayerIndex];
    const layerCtx = activeLayer.ctx;
    
    layerCtx.lineJoin = 'round';
    layerCtx.lineCap = 'round';
    layerCtx.lineWidth = document.getElementById('brushSize').value;
    
    if (currentTool === 'eraser') {
        layerCtx.strokeStyle = '#FFFFFF';
        layerCtx.globalCompositeOperation = 'destination-out';
    } else {
        layerCtx.strokeStyle = document.getElementById('colorPicker').value;
        layerCtx.globalCompositeOperation = 'source-over';
    }
    
    // Настройка типа кисти
    const brushType = document.getElementById('brushType').value;
    switch(brushType) {
        case 'dashed':
            layerCtx.setLineDash([5, 5]);
            break;
        default:
            layerCtx.setLineDash([]);
    }
}

function selectTool(tool) {
    currentTool = tool;
    
    // Обновляем активные кнопки
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(tool + 'Btn').classList.add('active');
    
    updateBrushSettings();
    
    tg.HapticFeedback.selectionChangedOccurred();
}

// Обработчики событий рисования
function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.type.includes('touch')) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
    };
}

function startDrawing(e) {
    if (panelsState.layers || panelsState.templates || panelsState.collab) return;
    
    const activeLayer = layers[activeLayerIndex];
    const layerCtx = activeLayer.ctx;
    
    isDrawing = true;
    const coords = getCoordinates(e);
    [startX, startY] = [coords.x, coords.y];
    [lastX, lastY] = [coords.x, coords.y];
    
    // Сохраняем состояние для инструментов формы
    if (['line', 'rect', 'circle'].includes(currentTool)) {
        savedImageData = layerCtx.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    if (currentTool === 'brush' || currentTool === 'eraser') {
        layerCtx.beginPath();
        layerCtx.moveTo(lastX, lastY);
    }
    
    if (currentTool === 'text') {
        addText(startX, startY);
        isDrawing = false;
    }
    
    e.preventDefault();
}

function draw(e) {
    if (!isDrawing) return;
    
    const activeLayer = layers[activeLayerIndex];
    const layerCtx = activeLayer.ctx;
    const coords = getCoordinates(e);
    const currentX = coords.x;
    const currentY = coords.y;
    
    updateBrushSettings();
    
    switch(currentTool) {
        case 'brush':
        case 'eraser':
            layerCtx.lineTo(currentX, currentY);
            layerCtx.stroke();
            [lastX, lastY] = [currentX, currentY];
            break;
            
        case 'line':
            layerCtx.putImageData(savedImageData, 0, 0);
            layerCtx.beginPath();
            layerCtx.moveTo(startX, startY);
            layerCtx.lineTo(currentX, currentY);
            layerCtx.stroke();
            break;
            
        case 'rect':
            layerCtx.putImageData(savedImageData, 0, 0);
            layerCtx.strokeRect(startX, startY, currentX - startX, currentY - startY);
            break;
            
        case 'circle':
            layerCtx.putImageData(savedImageData, 0, 0);
            const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
            layerCtx.beginPath();
            layerCtx.arc(startX, startY, radius, 0, 2 * Math.PI);
            layerCtx.stroke();
            break;
    }
    
    redrawCanvas();
    e.preventDefault();
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        
        // Отправка данных для совместной работы
        if (collabActive && connections.length > 0) {
            broadcastDrawingData();
        }
        
        // Сохранение в историю для инструментов
        if (['line', 'rect', 'circle', 'brush', 'eraser'].includes(currentTool)) {
            saveState();
        }
        
        savedImageData = null;
    }
}

// История действий
function saveState() {
    // Сохраняем состояние всех слоев
    const state = layers.map(layer => ({
        ...layer,
        canvasData: layer.canvas.toDataURL()
    }));
    
    history = history.slice(0, historyIndex + 1);
    history.push(state);
    historyIndex++;
    
    // Ограничиваем историю
    if (history.length > MAX_HISTORY) {
        history.shift();
        historyIndex--;
    }
}

function restoreState(state) {
    state.forEach((layerState, index) => {
        if (layers[index]) {
            const img = new Image();
            img.onload = function() {
                layers[index].ctx.clearRect(0, 0, canvas.width, canvas.height);
                layers[index].ctx.drawImage(img, 0, 0);
                redrawCanvas();
            };
            img.src = layerState.canvasData;
        }
    });
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreState(history[historyIndex]);
        tg.HapticFeedback.impactOccurred('light');
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreState(history[historyIndex]);
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Текст
function addText(x, y) {
    const text = prompt('Введите текст:');
    if (text) {
        const activeLayer = layers[activeLayerIndex];
        const layerCtx = activeLayer.ctx;
        
        layerCtx.font = `${document.getElementById('brushSize').value * 5}px Arial`;
        layerCtx.fillStyle = document.getElementById('colorPicker').value;
        layerCtx.fillText(text, x, y);
        
        redrawCanvas();
        saveState();
    }
}

// Фоны и шаблоны
function setBackground(type) {
    currentBackground = type;
    
    // Сохраняем текущее содержимое
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Копируем текущее изображение
    layers.forEach(layer => {
        if (layer.visible) {
            tempCtx.drawImage(layer.canvas, 0, 0);
        }
    });
    
    // Очищаем все слои
    layers.forEach(layer => layer.clear());
    
    // Устанавливаем фон на базовый слой
    const baseLayer = layers[0];
    baseLayer.ctx.fillStyle = '#FFFFFF';
    
    switch(type) {
        case 'white':
            baseLayer.ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
        case 'grid':
            drawGridBackground(baseLayer.ctx);
            break;
        case 'lined':
            drawLinedBackground(baseLayer.ctx);
            break;
        case 'graph':
            drawGraphBackground(baseLayer.ctx);
            break;
        case 'transparent':
            // Прозрачный - ничего не рисуем
            break;
    }
    
    // Восстанавливаем содержимое поверх фона
    baseLayer.ctx.drawImage(tempCanvas, 0, 0);
    redrawCanvas();
    saveState();
}

function drawGridBackground(context) {
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.strokeStyle = '#e0e0e0';
    context.lineWidth = 1;
    
    const gridSize = 20;
    for (let x = 0; x < canvas.width; x += gridSize) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
        context.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
        context.stroke();
    }
}

function drawLinedBackground(context) {
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.strokeStyle = '#87CEEB';
    context.lineWidth = 1;
    
    const lineSpacing = 24;
    for (let y = lineSpacing; y < canvas.height; y += lineSpacing) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
        context.stroke();
    }
    
    // Красная линия для полей
    context.strokeStyle = '#FF0000';
    context.beginPath();
    context.moveTo(40, 0);
    context.lineTo(40, canvas.height);
    context.stroke();
}

function drawGraphBackground(context) {
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.strokeStyle = '#d0d0d0';
    context.lineWidth = 1;
    
    const gridSize = 10;
    for (let x = 0; x < canvas.width; x += gridSize) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
        context.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
        context.stroke();
    }
}

// Шаблоны
const templates = {
    comic: function() {
        setBackground('white');
        const activeLayer = layers[activeLayerIndex];
        
        // Добавляем рамки для комикса
        activeLayer.ctx.strokeStyle = '#000000';
        activeLayer.ctx.lineWidth = 3;
        const panelHeight = canvas.height / 3;
        for (let i = 1; i < 3; i++) {
            activeLayer.ctx.beginPath();
            activeLayer.ctx.moveTo(0, panelHeight * i);
            activeLayer.ctx.lineTo(canvas.width, panelHeight * i);
            activeLayer.ctx.stroke();
        }
        
        redrawCanvas();
        saveState();
    },
    
    storyboard: function() {
        setBackground('white');
        const activeLayer = layers[activeLayerIndex];
        
        activeLayer.ctx.strokeStyle = '#cccccc';
        activeLayer.ctx.lineWidth = 2;
        const frameWidth = canvas.width / 3;
        const frameHeight = canvas.height / 4;
        
        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 4; y++) {
                activeLayer.ctx.strokeRect(
                    x * frameWidth + 5, 
                    y * frameHeight + 5, 
                    frameWidth - 10, 
                    frameHeight - 10
                );
            }
        }
        
        redrawCanvas();
        saveState();
    },
    
    mindmap: function() {
        setBackground('white');
        const activeLayer = layers[activeLayerIndex];
        
        // Центральный круг для ментальной карты
        activeLayer.ctx.fillStyle = '#4CAF50';
        activeLayer.ctx.beginPath();
        activeLayer.ctx.arc(canvas.width / 2, canvas.height / 2, 40, 0, Math.PI * 2);
        activeLayer.ctx.fill();
        
        activeLayer.ctx.fillStyle = '#FFFFFF';
        activeLayer.ctx.font = 'bold 16px Arial';
        activeLayer.ctx.textAlign = 'center';
        activeLayer.ctx.fillText('Тема', canvas.width / 2, canvas.height / 2 + 5);
        
        redrawCanvas();
        saveState();
    },
    
    ui: function() {
        setBackground('grid');
        const activeLayer = layers[activeLayerIndex];
        
        // Базовая разметка для UI
        activeLayer.ctx.fillStyle = '#f0f0f0';
        activeLayer.ctx.fillRect(0, 0, canvas.width, 60); // Header
        activeLayer.ctx.fillRect(0, canvas.height - 80, canvas.width, 80); // Footer
        
        activeLayer.ctx.fillStyle = '#2481cc';
        activeLayer.ctx.fillRect(10, 10, 40, 40); // Logo
        
        redrawCanvas();
        saveState();
    },
    
    flowchart: function() {
        setBackground('white');
        const activeLayer = layers[activeLayerIndex];
        
        activeLayer.ctx.strokeStyle = '#333333';
        activeLayer.ctx.lineWidth = 2;
        
        // Пример элементов блок-схемы
        const startY = 50;
        activeLayer.ctx.strokeRect(canvas.width/2 - 40, startY, 80, 40);
        activeLayer.ctx.fillText('Начало', canvas.width/2, startY + 25);
        
        redrawCanvas();
        saveState();
    },
    
    sketch: function() {
        setBackground('lined');
        const activeLayer = layers[activeLayerIndex];
        
        // Легкая сетка для эскизов
        activeLayer.ctx.strokeStyle = '#f0f0f0';
        activeLayer.ctx.lineWidth = 1;
        
        for (let x = 0; x < canvas.width; x += 50) {
            activeLayer.ctx.beginPath();
            activeLayer.ctx.moveTo(x, 0);
            activeLayer.ctx.lineTo(x, canvas.height);
            activeLayer.ctx.stroke();
        }
        
        for (let y = 0; y < canvas.height; y += 50) {
            activeLayer.ctx.beginPath();
            activeLayer.ctx.moveTo(0, y);
            activeLayer.ctx.lineTo(canvas.width, y);
            activeLayer.ctx.stroke();
        }
        
        redrawCanvas();
        saveState();
    }
};

// Совместная работа
function setupConnection(conn) {
    connections.push(conn);
    
    conn.on('data', function(data) {
        handleIncomingData(data);
    });
    
    conn.on('open', function() {
        updateCollabStatus(`Участников: ${connections.length + 1}`);
        tg.showPopup({
            title: 'Новый участник',
            message: 'Кто-то присоединился к сессии',
            buttons: [{ type: 'ok' }]
        });
    });
    
    conn.on('close', function() {
        connections = connections.filter(c => c !== conn);
        updateUsersList();
        updateCollabStatus(`Участников: ${connections.length + 1}`);
    });
    
    conn.on('error', function(err) {
        console.error('Ошибка соединения:', err);
    });
    
    updateUsersList();
    collabActive = true;
}

function handleIncomingData(data) {
    switch(data.type) {
        case 'drawing':
            replayDrawing(data);
            break;
        case 'clear':
            clearCanvas();
            break;
        case 'layer_data':
            restoreLayerData(data);
            break;
    }
}

function replayDrawing(data) {
    const layer = layers.find(l => l.id === data.layerId) || layers[activeLayerIndex];
    const layerCtx = layer.ctx;
    
    layerCtx.strokeStyle = data.color;
    layerCtx.lineWidth = data.lineWidth;
    layerCtx.globalCompositeOperation = data.tool === 'eraser' ? 'destination-out' : 'source-over';
    
    layerCtx.beginPath();
    layerCtx.moveTo(data.startX, data.startY);
    layerCtx.lineTo(data.endX, data.endY);
    layerCtx.stroke();
    
    redrawCanvas();
}

function broadcastDrawingData() {
    const activeLayer = layers[activeLayerIndex];
    const drawingData = {
        type: 'drawing',
        layerId: activeLayer.id,
        startX: startX,
        startY: startY,
        endX: lastX,
        endY: lastY,
        color: currentTool === 'eraser' ? '#FFFFFF' : document.getElementById('colorPicker').value,
        lineWidth: document.getElementById('brushSize').value,
        tool: currentTool
    };
    
    connections.forEach(conn => {
        if (conn.open) {
            conn.send(drawingData);
        }
    });
}

function startCollaboration() {
    if (!peer) {
        tg.showPopup({
            title: 'Ошибка',
            message: 'Совместная работа недоступна',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    currentSession = peer.id;
    collabActive = true;
    
    tg.showPopup({
        title: 'Сессия создана',
        message: `ID: ${peer.id}\nПоделитесь этим ID с друзьями`,
        buttons: [{ type: 'ok' }]
    });
    
    updateCollabStatus('Ожидание участников...');
}

function joinCollaboration() {
    const sessionId = document.getElementById('sessionId').value.trim();
    if (!sessionId) {
        tg.showPopup({
            title: 'Ошибка',
            message: 'Введите ID сессии',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    if (!peer) {
        tg.showPopup({
            title: 'Ошибка',
            message: 'Совместная работа недоступна',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    try {
        const conn = peer.connect(sessionId);
        setupConnection(conn);
        
        conn.on('open', function() {
            currentSession = sessionId;
            collabActive = true;
            updateCollabStatus('Подключено к сессии');
            
            tg.showPopup({
                title: 'Успех',
                message: 'Вы присоединились к сессии',
                buttons: [{ type: 'ok' }]
            });
        });
        
        conn.on('error', function(err) {
            tg.showPopup({
                title: 'Ошибка',
                message: 'Не удалось подключиться',
                buttons: [{ type: 'ok' }]
            });
        });
        
    } catch (error) {
        console.error('Ошибка подключения:', error);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Неверный ID сессии',
            buttons: [{ type: 'ok' }]
        });
    }
}

function updateUsersList() {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = `
        <div>👤 Вы (владелец)</div>
        ${connections.map((conn, index) => `<div>👤 Участник ${index + 1}</div>`).join('')}
    `;
}

function updateCollabStatus(status) {
    const statusElement = document.getElementById('collabStatus');
    statusElement.textContent = status;
    
    if (status.includes('Ошибка') || status.includes('Недоступно')) {
        statusElement.className = 'collab-status disconnected';
    } else if (status.includes('Подключено') || status.includes('Участников')) {
        statusElement.className = 'collab-status connected';
    } else {
        statusElement.className = 'collab-status';
    }
}

// Сохранение и экспорт
function saveAsPNG() {
    const link = document.createElement('a');
    link.download = `paint-messenger-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    tg.HapticFeedback.notificationOccurred('success');
}

function saveAsJPG() {
    const link = document.createElement('a');
    link.download = `paint-messenger-${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
    
    tg.HapticFeedback.notificationOccurred('success');
}

async function copyToClipboard() {
    try {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        
        tg.showPopup({
            title: 'Успех',
            message: 'Рисунок скопирован в буфер обмена',
            buttons: [{ type: 'ok' }]
        });
        
        tg.HapticFeedback.notificationOccurred('success');
    } catch (err) {
        console.error('Ошибка копирования:', err);
        tg.showPopup({
            title: 'Ошибка',
            message: 'Не удалось скопировать в буфер обмена',
            buttons: [{ type: 'ok' }]
        });
    }
}

function shareDrawing() {
    canvas.toBlob(function(blob) {
        if (navigator.share) {
            navigator.share({
                files: [new File([blob], 'мой-рисунок.png', { type: 'image/png' })],
                title: 'Мой рисунок из Paint Messenger',
                text: 'Посмотрите что я нарисовал!'
            }).catch(() => {
                // Fallback если шаринг отменен
                saveAsPNG();
            });
        } else {
            saveAsPNG();
        }
    });
}

function clearCanvas() {
    if (confirm('Очистить весь холст? Это действие нельзя отменить.')) {
        layers.forEach(layer => layer.clear());
        redrawCanvas();
        saveState();
        
        if (collabActive) {
            connections.forEach(conn => {
                if (conn.open) {
                    conn.send({ type: 'clear' });
                }
            });
        }
        
        tg.HapticFeedback.impactOccurred('heavy');
    }
}

// Вспомогательные функции
function applyTelegramTheme() {
    document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f0f0f0');
}

function loadCustomBackground() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // Сохраняем текущее содержимое
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                const tempCtx = tempCanvas.getContext('2d');
                
                layers.forEach(layer => {
                    if (layer.visible) {
                        tempCtx.drawImage(layer.canvas, 0, 0);
                    }
                });
                
                // Очищаем и устанавливаем фон
                layers.forEach(layer => layer.clear());
                layers[0].ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                layers[0].ctx.drawImage(tempCanvas, 0, 0);
                
                redrawCanvas();
                saveState();
                currentBackground = 'custom';
                
                tg.showPopup({
                    title: 'Успех',
                    message: 'Фон установлен',
                    buttons: [{ type: 'ok' }]
                });
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчики инструментов
    document.getElementById('brushBtn').addEventListener('click', () => selectTool('brush'));
    document.getElementById('lineBtn').addEventListener('click', () => selectTool('line'));
    document.getElementById('rectBtn').addEventListener('click', () => selectTool('rect'));
    document.getElementById('circleBtn').addEventListener('click', () => selectTool('circle'));
    document.getElementById('textBtn').addEventListener('click', () => selectTool('text'));
    document.getElementById('eraserBtn').addEventListener('click', () => selectTool('eraser'));
    
    // Обработчики настроек кисти
    document.getElementById('colorPicker').addEventListener('input', updateBrushSettings);
    document.getElementById('brushSize').addEventListener('input', updateBrushSettings);
    document.getElementById('brushType').addEventListener('change', updateBrushSettings);
    
    // Обработчики истории
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('clearBtn').addEventListener('click', clearCanvas);
    
    // Обработчики панелей
    document.getElementById('toggleLayers').addEventListener('click', () => togglePanel('layers'));
    document.getElementById('toggleTemplates').addEventListener('click', () => togglePanel('templates'));
    document.getElementById('toggleCollab').addEventListener('click', () => togglePanel('collab'));
    
    document.getElementById('closeLayers').addEventListener('click', () => togglePanel('layers'));
    document.getElementById('closeTemplates').addEventListener('click', () => togglePanel('templates'));
    document.getElementById('closeCollab').addEventListener('click', () => togglePanel('collab'));
    
    // Обработчики слоев
    document.getElementById('addLayer').addEventListener('click', addNewLayer);
    document.getElementById('mergeLayers').addEventListener('click', mergeLayers);
    
    // Обработчики фонов и шаблонов
    document.getElementById('backgroundSelect').addEventListener('change', function() {
        setBackground(this.value);
    });
    document.getElementById('customBgBtn').addEventListener('click', loadCustomBackground);
    
    // Обработчики шаблонов
    document.querySelectorAll('.template-item').forEach(item => {
        item.addEventListener('click', function() {
            const template = this.getAttribute('data-template');
            if (templates[template]) {
                templates[template]();
                togglePanel('templates');
                
                tg.showPopup({
                    title: 'Шаблон применен',
                    message: `Шаблон "${this.querySelector('span').textContent}" загружен`,
                    buttons: [{ type: 'ok' }]
                });
            }
        });
    });
    
    // Обработчики совместной работы
    document.getElementById('startCollab').addEventListener('click', startCollaboration);
    document.getElementById('joinCollab').addEventListener('click', joinCollaboration);
    
    // Обработчики сохранения
    document.getElementById('savePNG').addEventListener('click', saveAsPNG);
    document.getElementById('saveJPG').addEventListener('click', saveAsJPG);
    document.getElementById('copyClipboard').addEventListener('click', copyToClipboard);
    document.getElementById('shareBtn').addEventListener('click', shareDrawing);
    
    // Обработчики событий холста
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);
    
    // Предотвращение стандартного поведения для touch событий
    canvas.addEventListener('touchstart', (e) => e.preventDefault());
    canvas.addEventListener('touchmove', (e) => e.preventDefault());
    
    // Горячие клавиши
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'z':
                    e.preventDefault();
                    undo();
                    break;
                case 'y':
                    e.preventDefault();
                    redo();
                    break;
                case 's':
                    e.preventDefault();
                    saveAsPNG();
                    break;
            }
        }
        
        // Escape для закрытия панелей
        if (e.key === 'Escape') {
            hideAllPanels();
        }
    });
    
    // Закрытие панелей при клике вне их
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.panel') && 
            !e.target.closest('#toggleLayers') && 
            !e.target.closest('#toggleTemplates') && 
            !e.target.closest('#toggleCollab')) {
            hideAllPanels();
        }
    });
}

// Обработка ошибок
window.addEventListener('error', function(e) {
    console.error('Глобальная ошибка:', e.error);
    
    tg.showPopup({
        title: 'Произошла ошибка',
        message: 'Приложение может работать некорректно. Попробуйте перезагрузить.',
        buttons: [{ type: 'ok' }]
    });
});

// Уведомление о готовности
tg.showAlert('Paint Messenger готов к работе! 🎨');