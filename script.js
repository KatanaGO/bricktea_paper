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
    collab: false,
    background: false,
    mobileMenu: false
};

// Определение устройства
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isTelegram = !!window.Telegram.WebApp;

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
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = Math.floor(rect.width * dpr);
        this.canvas.height = Math.floor(rect.height * dpr);
        
        this.ctx.scale(dpr, dpr);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw() {
        if (!this.visible) return;
        
        ctx.globalAlpha = this.opacity;
        ctx.globalCompositeOperation = this.blendMode;
        ctx.drawImage(this.canvas, 0, 0, canvas.width, canvas.height);
        
        // Сброс настроек
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    }
}

// Безопасные вызовы Telegram API
function safeTelegramCall(method, ...args) {
    try {
        if (tg && tg[method]) {
            if (typeof tg[method] === 'function') {
                return tg[method](...args);
            }
        }
    } catch (error) {
        console.warn(`Telegram ${method} error:`, error);
    }
    return null;
}

// Утилитарные функции
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, duration = 3000) {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notificationText.textContent = message;
    notification.classList.remove('hide');
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
    }, duration);
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    console.log('🚀 Инициализация Paint Messenger...');
    
    // Инициализация Telegram
    safeTelegramCall('ready');
    safeTelegramCall('expand');
    safeTelegramCall('enableClosingConfirmation');
    
    // Настройка viewport для Telegram
    if (isTelegram) {
        document.body.classList.add('telegram-fullscreen');
        setupTelegramViewport();
    }
    
    // Инициализация элементов
    initializeCanvas();
    initializeLayers();
    initializeTools();
    initializePanels();
    initializeSaveFunctions();
    initializeCollaboration();
    initializeMobileInterface();
    
    // Установка обработчиков событий
    setupEventListeners();
    
    // Применение темы Telegram
    applyTelegramTheme();
    
    console.log('✅ Приложение инициализировано для', isMobile ? 'мобильного' : 'десктопного', 'устройства');
    
    // Показать уведомление о готовности
    setTimeout(() => {
        showNotification('Paint Messenger готов к работе! 🎨');
    }, 500);
}

function setupTelegramViewport() {
    // Корректировка viewport для Telegram
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    }
    
    // Обработка изменения размера в Telegram
    window.addEventListener('resize', debounce(() => {
        resizeCanvas();
        safeTelegramCall('expand');
    }, 250));
}

function initializeCanvas() {
    canvas = document.getElementById('paintCanvas');
    ctx = canvas.getContext('2d');
    
    // Улучшенная инициализация canvas
    setupCanvas();
    
    // Обработчик изменения размера окна
    window.addEventListener('resize', debounce(resizeCanvas, 100));
    
    // Инициализация размеров
    setTimeout(resizeCanvas, 100);
}

function setupCanvas() {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Установка размеров canvas
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    
    // Масштабирование контекста
    ctx.scale(dpr, dpr);
    
    // Установка CSS размеров
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // Настройка сглаживания
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    console.log('🎨 Canvas инициализирован:', canvas.width, canvas.height, 'DPR:', dpr);
}

function resizeCanvas() {
    console.log('📐 Изменение размера canvas...');
    
    // Сохраняем текущее содержимое
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.drawImage(canvas, 0, 0);
    
    // Переинициализация canvas
    setupCanvas();
    
    // Восстанавливаем содержимое
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    
    // Обновление слоев
    layers.forEach(layer => {
        const layerTempCanvas = document.createElement('canvas');
        const layerTempCtx = layerTempCanvas.getContext('2d');
        layerTempCanvas.width = layer.canvas.width;
        layerTempCanvas.height = layer.canvas.height;
        layerTempCtx.drawImage(layer.canvas, 0, 0);
        
        layer.resize();
        layer.ctx.drawImage(layerTempCanvas, 0, 0, layer.canvas.width, layer.canvas.height);
    });
    
    redrawCanvas();
}

function initializeMobileInterface() {
    if (!isMobile) return;
    
    console.log('📱 Инициализация мобильного интерфейса...');
    
    // Скрываем десктопные элементы
    document.querySelectorAll('.desktop-only').forEach(el => {
        el.style.display = 'none';
    });
    
    // Показываем мобильные элементы
    document.querySelectorAll('.mobile-toolbar, .mobile-actions').forEach(el => {
        el.style.display = 'flex';
    });
    
    // Обновляем отображение размера кисти
    updateBrushSizeDisplay();
}

function initializeLayers() {
    // Создание базового слоя
    const baseLayer = new Layer('Фон');
    layers.push(baseLayer);
    activeLayerIndex = 0;
    
    updateLayersUI();
}

function initializeTools() {
    updateBrushSettings();
}

function initializePanels() {
    hideAllPanels();
}

function initializeSaveFunctions() {
    // Инициализация уже выполнена через обработчики событий
}

function initializeCollaboration() {
    if (!isMobile) { // Совместная работа только на десктопе для стабильности
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
    } else {
        document.getElementById('collabStatus').innerHTML = '<span class="status-icon">📱</span><span class="status-text">Только на компьютере</span>';
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
    
    // Вибрация на мобильных
    if (isMobile) {
        safeTelegramCall('HapticFeedback.impactOccurred', 'light');
    }
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileOverlay');
    
    if (panelsState.mobileMenu) {
        menu.classList.remove('active');
        overlay.classList.remove('active');
        panelsState.mobileMenu = false;
    } else {
        hideAllPanels();
        menu.classList.add('active');
        overlay.classList.add('active');
        panelsState.mobileMenu = true;
    }
    
    safeTelegramCall('HapticFeedback.impactOccurred', 'light');
}

function hideAllPanels() {
    document.querySelectorAll('.panel').forEach(panel => {
        panel.style.display = 'none';
    });
    
    document.getElementById('mobileMenu').classList.remove('active');
    document.getElementById('mobileOverlay').classList.remove('active');
    
    Object.keys(panelsState).forEach(key => {
        panelsState[key] = false;
    });
}

// Улучшенная система координат для мобильных устройств
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
    
    // Корректировка координат с учетом масштаба и смещения
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    return { x, y };
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
    
    showNotification('Новый слой создан');
    safeTelegramCall('HapticFeedback.impactOccurred', 'light');
}

function mergeLayers() {
    if (layers.length <= 1) {
        showNotification('Нечего объединять');
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
    
    showNotification('Слои объединены');
    safeTelegramCall('HapticFeedback.impactOccurred', 'medium');
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
    
    updateBrushSizeDisplay();
}

function updateBrushSizeDisplay() {
    const brushSize = document.getElementById('brushSize').value;
    const brushSizeValue = document.getElementById('brushSizeValue');
    if (brushSizeValue) {
        brushSizeValue.textContent = brushSize;
    }
}

function selectTool(tool) {
    currentTool = tool;
    
    // Обновляем активные кнопки
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Активируем соответствующую кнопку
    const activeBtn = document.getElementById(tool + 'Btn') || 
                     document.getElementById('mobile' + tool.charAt(0).toUpperCase() + tool.slice(1));
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    updateBrushSettings();
    
    safeTelegramCall('HapticFeedback.selectionChangedOccurred');
    showNotification(`Инструмент: ${getToolName(tool)}`);
}

function getToolName(tool) {
    const toolNames = {
        'brush': 'Кисть',
        'line': 'Линия',
        'rect': 'Прямоугольник',
        'circle': 'Круг',
        'text': 'Текст',
        'eraser': 'Ластик'
    };
    return toolNames[tool] || tool;
}

// Обработчики событий рисования
function startDrawing(e) {
    if (panelsState.layers || panelsState.templates || panelsState.collab || panelsState.mobileMenu) return;
    
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
        showNotification('Действие отменено');
        safeTelegramCall('HapticFeedback.impactOccurred', 'light');
    } else {
        showNotification('Нечего отменять');
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreState(history[historyIndex]);
        showNotification('Действие повторено');
        safeTelegramCall('HapticFeedback.impactOccurred', 'light');
    } else {
        showNotification('Нечего повторять');
    }
}

// Текст
function addText(x, y) {
    const text = prompt('Введите текст:');
    if (text) {
        const activeLayer = layers[activeLayerIndex];
        const layerCtx = activeLayer.ctx;
        
        layerCtx.font = `bold ${document.getElementById('brushSize').value * 4}px Arial`;
        layerCtx.fillStyle = document.getElementById('colorPicker').value;
        layerCtx.textBaseline = 'middle';
        layerCtx.fillText(text, x, y);
        
        redrawCanvas();
        saveState();
        showNotification('Текст добавлен');
    }
}

// Фоны и шаблоны
function setBackground(type) {
    currentBackground = type;
    
    // Сохраняем текущее содержимое
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    // Копируем текущее изображение
    layers.forEach(layer => {
        if (layer.visible && layer !== layers[0]) {
            tempCtx.drawImage(layer.canvas, 0, 0);
        }
    });
    
    // Очищаем базовый слой и устанавливаем фон
    const baseLayer = layers[0];
    baseLayer.clear();
    
    switch(type) {
        case 'white':
            baseLayer.ctx.fillStyle = '#FFFFFF';
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
    
    showNotification(`Фон установлен: ${getBackgroundName(type)}`);
}

function getBackgroundName(type) {
    const names = {
        'transparent': 'Прозрачный',
        'white': 'Белый',
        'grid': 'Сетка',
        'lined': 'Линовка',
        'graph': 'Миллиметровка',
        'custom': 'Свой фон'
    };
    return names[type] || type;
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
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = canvas.width;
                tempCanvas.height = canvas.height;
                
                layers.forEach(layer => {
                    if (layer.visible && layer !== layers[0]) {
                        tempCtx.drawImage(layer.canvas, 0, 0);
                    }
                });
                
                // Очищаем и устанавливаем фон
                layers[0].clear();
                layers[0].ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                layers[0].ctx.drawImage(tempCanvas, 0, 0);
                
                redrawCanvas();
                saveState();
                currentBackground = 'custom';
                
                showNotification('Свой фон установлен');
                hideAllPanels();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };
    input.click();
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
        showNotification('Шаблон "Комикс" применен');
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
        showNotification('Шаблон "Раскадровка" применен');
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
        activeLayer.ctx.textBaseline = 'middle';
        activeLayer.ctx.fillText('Тема', canvas.width / 2, canvas.height / 2);
        
        redrawCanvas();
        saveState();
        showNotification('Шаблон "Ментальная карта" применен');
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
        showNotification('Шаблон "UI макет" применен');
    },
    
    flowchart: function() {
        setBackground('white');
        const activeLayer = layers[activeLayerIndex];
        
        activeLayer.ctx.strokeStyle = '#333333';
        activeLayer.ctx.lineWidth = 2;
        
        // Пример элементов блок-схемы
        const startY = 50;
        activeLayer.ctx.strokeRect(canvas.width/2 - 40, startY, 80, 40);
        activeLayer.ctx.font = '14px Arial';
        activeLayer.ctx.textAlign = 'center';
        activeLayer.ctx.textBaseline = 'middle';
        activeLayer.ctx.fillText('Начало', canvas.width/2, startY + 20);
        
        redrawCanvas();
        saveState();
        showNotification('Шаблон "Блок-схема" применен');
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
        showNotification('Шаблон "Эскиз" применен');
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
        updateUsersList();
        showNotification('Новый участник присоединился');
    });
    
    conn.on('close', function() {
        connections = connections.filter(c => c !== conn);
        updateUsersList();
        updateCollabStatus(`Участников: ${connections.length + 1}`);
        showNotification('Участник покинул сессию');
    });
    
    conn.on('error', function(err) {
        console.error('Ошибка соединения:', err);
        showNotification('Ошибка соединения с участником');
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
        showNotification('Совместная работа недоступна');
        return;
    }
    
    currentSession = peer.id;
    collabActive = true;
    
    showNotification('Сессия создана! Поделитесь ID с друзьями');
    updateCollabStatus('Ожидание участников...');
}

function joinCollaboration() {
    const sessionId = document.getElementById('joinSessionId').value.trim();
    if (!sessionId) {
        showNotification('Введите ID сессии');
        return;
    }
    
    if (!peer) {
        showNotification('Совместная работа недоступна');
        return;
    }
    
    try {
        const conn = peer.connect(sessionId);
        setupConnection(conn);
        
        conn.on('open', function() {
            currentSession = sessionId;
            collabActive = true;
            updateCollabStatus('Подключено к сессии');
            showNotification('Вы присоединились к сессии');
            hideAllPanels();
        });
        
        conn.on('error', function(err) {
            showNotification('Не удалось подключиться к сессии');
        });
        
    } catch (error) {
        console.error('Ошибка подключения:', error);
        showNotification('Неверный ID сессии');
    }
}

function updateUsersList() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    usersList.innerHTML = `
        <div class="user-item host">
            <span class="user-icon">👤</span>
            <span class="user-name">Вы (владелец)</span>
        </div>
        ${connections.map((conn, index) => `
            <div class="user-item">
                <span class="user-icon">👤</span>
                <span class="user-name">Участник ${index + 1}</span>
            </div>
        `).join('')}
    `;
}

function updateCollabStatus(status) {
    const statusElement = document.getElementById('collabStatus');
    if (!statusElement) return;
    
    const statusText = statusElement.querySelector('.status-text');
    const statusIcon = statusElement.querySelector('.status-icon');
    
    if (statusText) statusText.textContent = status;
    
    statusElement.className = 'collab-status';
    
    if (status.includes('Ошибка') || status.includes('Недоступно')) {
        statusElement.classList.add('disconnected');
        if (statusIcon) statusIcon.textContent = '🔴';
    } else if (status.includes('Подключено') || status.includes('Участников')) {
        statusElement.classList.add('connected');
        if (statusIcon) statusIcon.textContent = '🟢';
    } else {
        if (statusIcon) statusIcon.textContent = '🟡';
    }
}

function copySessionId() {
    const sessionId = document.getElementById('sessionId').value;
    if (sessionId) {
        navigator.clipboard.writeText(sessionId).then(() => {
            showNotification('ID сессии скопирован');
        }).catch(() => {
            showNotification('Не удалось скопировать ID');
        });
    }
}

// Сохранение и экспорт
function saveAsPNG() {
    const link = document.createElement('a');
    link.download = `paint-messenger-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    showNotification('Рисунок сохранен как PNG');
    safeTelegramCall('HapticFeedback.notificationOccurred', 'success');
}

function saveAsJPG() {
    const link = document.createElement('a');
    link.download = `paint-messenger-${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
    
    showNotification('Рисунок сохранен как JPG');
    safeTelegramCall('HapticFeedback.notificationOccurred', 'success');
}

async function copyToClipboard() {
    try {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        
        showNotification('Рисунок скопирован в буфер обмена');
        safeTelegramCall('HapticFeedback.notificationOccurred', 'success');
    } catch (err) {
        console.error('Ошибка копирования:', err);
        showNotification('Не удалось скопировать в буфер обмена');
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
        
        showNotification('Холст очищен');
        safeTelegramCall('HapticFeedback.impactOccurred', 'heavy');
    }
}

// Вспомогательные функции
function applyTelegramTheme() {
    try {
        if (tg && tg.themeParams) {
            document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
            document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
            document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
            document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f0f0f0');
        }
    } catch (error) {
        console.warn('Ошибка применения темы Telegram:', error);
    }
}

function handleMobileMenuAction(action) {
    switch(action) {
        case 'brush':
        case 'line':
        case 'rect':
        case 'circle':
        case 'text':
        case 'eraser':
            selectTool(action);
            break;
        case 'layers':
            togglePanel('layers');
            break;
        case 'templates':
            togglePanel('templates');
            break;
        case 'background':
            togglePanel('background');
            break;
        case 'collab':
            if (!isMobile) {
                togglePanel('collab');
            } else {
                showNotification('Совместная работа доступна только на компьютере');
            }
            break;
        case 'savePNG':
            saveAsPNG();
            break;
        case 'saveJPG':
            saveAsJPG();
            break;
        case 'copyClipboard':
            copyToClipboard();
            break;
        case 'share':
            shareDrawing();
            break;
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    setupToolEventListeners();
    setupBrushEventListeners();
    setupHistoryEventListeners();
    setupPanelEventListeners();
    setupBackgroundEventListeners();
    setupTemplateEventListeners();
    setupCollaborationEventListeners();
    setupSaveEventListeners();
    setupCanvasEventListeners();
    setupMobileEventListeners();
    setupGlobalEventListeners();
}

function setupToolEventListeners() {
    // Десктопные инструменты
    document.getElementById('brushBtn')?.addEventListener('click', () => selectTool('brush'));
    document.getElementById('lineBtn')?.addEventListener('click', () => selectTool('line'));
    document.getElementById('rectBtn')?.addEventListener('click', () => selectTool('rect'));
    document.getElementById('circleBtn')?.addEventListener('click', () => selectTool('circle'));
    document.getElementById('textBtn')?.addEventListener('click', () => selectTool('text'));
    document.getElementById('eraserBtn')?.addEventListener('click', () => selectTool('eraser'));
}

function setupBrushEventListeners() {
    document.getElementById('colorPicker')?.addEventListener('input', updateBrushSettings);
    document.getElementById('brushSize')?.addEventListener('input', updateBrushSettings);
    document.getElementById('brushType')?.addEventListener('change', updateBrushSettings);
}

function setupHistoryEventListeners() {
    document.getElementById('undoBtn')?.addEventListener('click', undo);
    document.getElementById('redoBtn')?.addEventListener('click', redo);
    document.getElementById('clearBtn')?.addEventListener('click', clearCanvas);
}

function setupPanelEventListeners() {
    // Десктопные панели
    document.getElementById('toggleLayers')?.addEventListener('click', () => togglePanel('layers'));
    document.getElementById('toggleTemplates')?.addEventListener('click', () => togglePanel('templates'));
    document.getElementById('settingsBtn')?.addEventListener('click', () => togglePanel('background'));
    
    // Закрытие панелей
    document.getElementById('closeLayers')?.addEventListener('click', () => togglePanel('layers'));
    document.getElementById('closeTemplates')?.addEventListener('click', () => togglePanel('templates'));
    document.getElementById('closeBackground')?.addEventListener('click', () => togglePanel('background'));
    document.getElementById('closeCollab')?.addEventListener('click', () => togglePanel('collab'));
}

function setupBackgroundEventListeners() {
    document.getElementById('backgroundSelect')?.addEventListener('change', function() {
        setBackground(this.value);
    });
    
    // Обработчики для панели фонов
    document.querySelectorAll('.background-item').forEach(item => {
        item.addEventListener('click', function() {
            const background = this.getAttribute('data-background');
            const action = this.getAttribute('data-action');
            
            if (action === 'custom') {
                loadCustomBackground();
            } else if (background) {
                setBackground(background);
                hideAllPanels();
            }
        });
    });
}

function setupTemplateEventListeners() {
    document.querySelectorAll('.template-item').forEach(item => {
        item.addEventListener('click', function() {
            const template = this.getAttribute('data-template');
            if (templates[template]) {
                templates[template]();
                hideAllPanels();
            }
        });
    });
}

function setupCollaborationEventListeners() {
    document.getElementById('startCollab')?.addEventListener('click', startCollaboration);
    document.getElementById('joinCollab')?.addEventListener('click', joinCollaboration);
    document.getElementById('copySessionId')?.addEventListener('click', copySessionId);
}

function setupSaveEventListeners() {
    document.getElementById('savePNG')?.addEventListener('click', saveAsPNG);
    document.getElementById('saveJPG')?.addEventListener('click', saveAsJPG);
    document.getElementById('copyClipboard')?.addEventListener('click', copyToClipboard);
    document.getElementById('shareBtn')?.addEventListener('click', shareDrawing);
}

function setupCanvasEventListeners() {
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
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) { // Только для одного касания
            e.preventDefault();
        }
    });
    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            e.preventDefault();
        }
    });
}

function setupMobileEventListeners() {
    if (!isMobile) return;
    
    // Мобильное меню
    document.getElementById('mobileMenuBtn')?.addEventListener('click', toggleMobileMenu);
    document.getElementById('closeMobileMenu')?.addEventListener('click', toggleMobileMenu);
    document.getElementById('mobileOverlay')?.addEventListener('click', toggleMobileMenu);
    
    // Мобильные инструменты
    document.getElementById('mobileBrush')?.addEventListener('click', () => selectTool('brush'));
    document.getElementById('mobileEraser')?.addEventListener('click', () => selectTool('eraser'));
    document.getElementById('mobileText')?.addEventListener('click', () => selectTool('text'));
    document.getElementById('mobileShapes')?.addEventListener('click', () => togglePanel('templates'));
    
    // Мобильные действия
    document.getElementById('mobileUndo')?.addEventListener('click', undo);
    document.getElementById('mobileRedo')?.addEventListener('click', redo);
    document.getElementById('mobileClear')?.addEventListener('click', clearCanvas);
    document.getElementById('mobileBackground')?.addEventListener('click', () => togglePanel('background'));
    document.getElementById('mobileSave')?.addEventListener('click', () => togglePanel('collab'));
    
    // Мобильное меню items
    document.querySelectorAll('.mobile-menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleMobileMenuAction(action);
        });
    });
}

function setupGlobalEventListeners() {
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
            !e.target.closest('#settingsBtn') &&
            !e.target.closest('#mobileMenuBtn')) {
            hideAllPanels();
        }
    });
    
    // Обработка изменения темы Telegram
    if (tg) {
        tg.onEvent('themeChanged', applyTelegramTheme);
        tg.onEvent('viewportChanged', () => {
            setTimeout(resizeCanvas, 100);
        });
    }
}

// Обработка ошибок
window.addEventListener('error', function(e) {
    console.error('Глобальная ошибка:', e.error);
    showNotification('Произошла ошибка. Попробуйте перезагрузить приложение.');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Необработанное обещание:', e.reason);
    showNotification('Произошла ошибка. Попробуйте перезагрузить приложение.');
});

// Инициализация слоев при загрузке
initializeLayers();

// Обработчики слоев
document.getElementById('addLayer')?.addEventListener('click', addNewLayer);
document.getElementById('mergeLayers')?.addEventListener('click', mergeLayers);