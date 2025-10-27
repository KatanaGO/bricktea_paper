// Инициализация Telegram Web App
let tg = window.Telegram.WebApp;

// Основные переменные
let canvas, ctx;
let isDrawing = false;
let lastX = 0, lastY = 0;
let startX = 0, startY = 0;
let currentTool = 'brush';
let currentColor = '#000000';
let brushSize = 3;

// История действий
let history = [];
let historyIndex = -1;

// Инициализация приложения
function initApp() {
    console.log('🚀 Инициализация Paint Messenger для Telegram...');
    
    // Инициализация Telegram
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
    
    // Настройка темы
    applyTelegramTheme();
    
    // Инициализация элементов
    initCanvas();
    initEventListeners();
    initTools();
    
    // Сохранение начального состояния
    saveState();
    
    console.log('✅ Приложение инициализировано');
    showNotification('Paint Messenger готов! 🎨');
}

function applyTelegramTheme() {
    document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
    document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f0f0f0');
}

function initCanvas() {
    canvas = document.getElementById('paintCanvas');
    ctx = canvas.getContext('2d');
    
    setupCanvasSize();
    setupCanvasStyle();
    
    // Обработчик изменения размера
    window.addEventListener('resize', debounce(setupCanvasSize, 100));
}

function setupCanvasSize() {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Установка размеров с учетом DPR
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    
    // Масштабирование контекста
    ctx.scale(dpr, dpr);
    
    // CSS размеры
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // Настройка сглаживания
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    console.log('🎨 Canvas настроен:', canvas.width, canvas.height);
}

function setupCanvasStyle() {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = currentColor;
}

function initEventListeners() {
    // Инструменты
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tool = e.target.closest('.tool-btn').dataset.tool;
            selectTool(tool);
        });
    });
    
    // Действия
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.closest('.action-btn').dataset.action;
            handleAction(action);
        });
    });
    
    // Вспомогательные кнопки
    document.querySelectorAll('.sec-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.closest('.sec-btn').dataset.action;
            handleSecondaryAction(action);
        });
    });
    
    // Меню
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const tool = e.target.closest('.menu-item').dataset.tool;
            const action = e.target.closest('.menu-item').dataset.action;
            
            if (tool) selectTool(tool);
            if (action) handleMenuAction(action);
            
            closeAllPanels();
        });
    });
    
    // Настройки кисти
    document.querySelector('.color-picker').addEventListener('input', (e) => {
        currentColor = e.target.value;
        ctx.strokeStyle = currentColor;
    });
    
    document.querySelector('.brush-size').addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value);
        ctx.lineWidth = brushSize;
        document.querySelector('.size-value').textContent = brushSize;
    });
    
    // Фоны
    document.querySelectorAll('.bg-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const bg = e.target.closest('.bg-option').dataset.bg;
            setBackground(bg);
            closeAllPanels();
        });
    });
    
    // Шаблоны
    document.querySelectorAll('.template-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const template = e.target.closest('.template-option').dataset.template;
            applyTemplate(template);
            closeAllPanels();
        });
    });
    
    // Закрытие панелей
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.closest('.close-btn').dataset.action;
            if (action === 'close-menu') closeMenu();
            if (action === 'close-background') closeBackground();
            if (action === 'close-templates') closeTemplates();
        });
    });
    
    // События холста
    setupCanvasEvents();
    
    // Глобальные события
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('menu-overlay') || 
            e.target.classList.contains('panel-overlay')) {
            closeAllPanels();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllPanels();
    });
}

function setupCanvasEvents() {
    // Мышь
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Касания
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);
}

function handleTouchStart(e) {
    if (e.touches.length === 1) {
        e.preventDefault();
        startDrawing(e.touches[0]);
    }
}

function handleTouchMove(e) {
    if (e.touches.length === 1) {
        e.preventDefault();
        draw(e.touches[0]);
    }
}

function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function startDrawing(e) {
    isDrawing = true;
    const coords = getCoordinates(e);
    [lastX, lastY] = [coords.x, coords.y];
    [startX, startY] = [coords.x, coords.y];
    
    if (currentTool === 'brush' || currentTool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
    }
    
    if (currentTool === 'text') {
        addText(startX, startY);
        isDrawing = false;
    }
}

function draw(e) {
    if (!isDrawing) return;
    
    const coords = getCoordinates(e);
    const currentX = coords.x;
    const currentY = coords.y;
    
    // Настройка стиля для ластика
    if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;
    }
    
    ctx.lineWidth = brushSize;
    
    switch(currentTool) {
        case 'brush':
        case 'eraser':
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
            break;
            
        case 'line':
            // Временное рисование линии
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
            break;
    }
    
    [lastX, lastY] = [currentX, currentY];
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        
        if (['brush', 'eraser', 'line'].includes(currentTool)) {
            saveState();
        }
        
        // Сброс композиции
        ctx.globalCompositeOperation = 'source-over';
    }
}

function selectTool(tool) {
    currentTool = tool;
    
    // Обновление UI
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
    
    showNotification(`Инструмент: ${getToolName(tool)}`);
    tg.HapticFeedback.selectionChangedOccurred();
}

function getToolName(tool) {
    const names = {
        'brush': 'Кисть',
        'eraser': 'Ластик',
        'text': 'Текст',
        'line': 'Линия',
        'rect': 'Прямоугольник',
        'circle': 'Круг',
        'shapes': 'Фигуры'
    };
    return names[tool] || tool;
}

function handleAction(action) {
    switch(action) {
        case 'undo':
            undo();
            break;
        case 'redo':
            redo();
            break;
        case 'clear':
            clearCanvas();
            break;
        case 'menu':
            openMenu();
            break;
    }
}

function handleSecondaryAction(action) {
    switch(action) {
        case 'save':
            showSaveOptions();
            break;
        case 'background':
            openBackground();
            break;
        case 'templates':
            openTemplates();
            break;
    }
}

function handleMenuAction(action) {
    switch(action) {
        case 'save-png':
            saveAsPNG();
            break;
        case 'save-jpg':
            saveAsJPG();
            break;
        case 'copy':
            copyToClipboard();
            break;
        case 'share':
            shareDrawing();
            break;
        case 'background-menu':
            openBackground();
            break;
        case 'templates-menu':
            openTemplates();
            break;
    }
}

// История действий
function saveState() {
    const state = canvas.toDataURL();
    history = history.slice(0, historyIndex + 1);
    history.push(state);
    historyIndex++;
    
    // Ограничение истории
    if (history.length > 20) {
        history.shift();
        historyIndex--;
    }
}

function restoreState() {
    if (historyIndex >= 0) {
        const img = new Image();
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = history[historyIndex];
    }
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        restoreState();
        showNotification('Действие отменено');
        tg.HapticFeedback.impactOccurred('light');
    } else {
        showNotification('Нечего отменять');
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        restoreState();
        showNotification('Действие повторено');
        tg.HapticFeedback.impactOccurred('light');
    } else {
        showNotification('Нечего повторять');
    }
}

function clearCanvas() {
    tg.showConfirm('Очистить весь холст?', (confirmed) => {
        if (confirmed) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            saveState();
            showNotification('Холст очищен');
            tg.HapticFeedback.impactOccurred('medium');
        }
    });
}

// Текст
function addText(x, y) {
    tg.showPopup({
        title: 'Добавить текст',
        message: 'Введите текст:',
        buttons: [
            { type: 'default', text: 'Отмена' },
            { type: 'ok', text: 'Добавить' }
        ]
    }, (buttonId) => {
        if (buttonId === 1) {
            const text = prompt('Введите текст:'); // В реальном приложении нужно использовать Telegram UI
            if (text) {
                ctx.font = `bold ${brushSize * 5}px Arial`;
                ctx.fillStyle = currentColor;
                ctx.textBaseline = 'middle';
                ctx.fillText(text, x, y);
                saveState();
                showNotification('Текст добавлен');
            }
        }
    });
}

// Фоны
function setBackground(type) {
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    switch(type) {
        case 'white':
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;
        case 'grid':
            drawGridBackground();
            break;
        case 'lined':
            drawLinedBackground();
            break;
        case 'transparent':
            // Прозрачный - ничего не делаем
            break;
    }
    
    // Восстанавливаем рисунок поверх фона
    ctx.putImageData(currentState, 0, 0);
    saveState();
    showNotification(`Фон: ${getBackgroundName(type)}`);
}

function getBackgroundName(type) {
    const names = {
        'transparent': 'Прозрачный',
        'white': 'Белый',
        'grid': 'Сетка',
        'lined': 'Линовка'
    };
    return names[type] || type;
}

function drawGridBackground() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    const gridSize = 20;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawLinedBackground() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#87CEEB';
    ctx.lineWidth = 1;
    
    const lineSpacing = 24;
    for (let y = lineSpacing; y < canvas.height; y += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Шаблоны
function applyTemplate(template) {
    switch(template) {
        case 'comic':
            applyComicTemplate();
            break;
        case 'storyboard':
            applyStoryboardTemplate();
            break;
        case 'mindmap':
            applyMindmapTemplate();
            break;
    }
}

function applyComicTemplate() {
    setBackground('white');
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    const panelHeight = canvas.height / 3;
    for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, panelHeight * i);
        ctx.lineTo(canvas.width, panelHeight * i);
        ctx.stroke();
    }
    
    saveState();
    showNotification('Шаблон "Комикс" применен');
}

function applyStoryboardTemplate() {
    setBackground('white');
    
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    const frameWidth = canvas.width / 3;
    const frameHeight = canvas.height / 4;
    
    for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 4; y++) {
            ctx.strokeRect(
                x * frameWidth + 5, 
                y * frameHeight + 5, 
                frameWidth - 10, 
                frameHeight - 10
            );
        }
    }
    
    saveState();
    showNotification('Шаблон "Раскадровка" применен');
}

function applyMindmapTemplate() {
    setBackground('white');
    
    // Центральный круг
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 40, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Тема', canvas.width / 2, canvas.height / 2);
    
    saveState();
    showNotification('Шаблон "Ментальная карта" применен');
}

// Сохранение и экспорт
function showSaveOptions() {
    tg.showPopup({
        title: 'Сохранить рисунок',
        message: 'Выберите способ сохранения:',
        buttons: [
            { type: 'default', text: 'PNG' },
            { type: 'default', text: 'JPG' },
            { type: 'default', text: 'Копировать' },
            { type: 'cancel', text: 'Отмена' }
        ]
    }, (buttonId) => {
        switch(buttonId) {
            case 0: saveAsPNG(); break;
            case 1: saveAsJPG(); break;
            case 2: copyToClipboard(); break;
        }
    });
}

function saveAsPNG() {
    const link = document.createElement('a');
    link.download = `рисунок-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showNotification('Сохранено как PNG');
    tg.HapticFeedback.notificationOccurred('success');
}

function saveAsJPG() {
    const link = document.createElement('a');
    link.download = `рисунок-${Date.now()}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
    showNotification('Сохранено как JPG');
    tg.HapticFeedback.notificationOccurred('success');
}

async function copyToClipboard() {
    try {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showNotification('Скопировано в буфер обмена');
        tg.HapticFeedback.notificationOccurred('success');
    } catch (err) {
        showNotification('Ошибка копирования');
    }
}

function shareDrawing() {
    canvas.toBlob(function(blob) {
        if (navigator.share) {
            navigator.share({
                files: [new File([blob], 'мой-рисунок.png', { type: 'image/png' })],
                title: 'Мой рисунок',
                text: 'Посмотрите что я нарисовал!'
            });
        } else {
            saveAsPNG();
        }
    });
}

// Управление панелями
function openMenu() {
    document.getElementById('menuOverlay').classList.add('active');
    tg.HapticFeedback.impactOccurred('light');
}

function closeMenu() {
    document.getElementById('menuOverlay').classList.remove('active');
}

function openBackground() {
    document.getElementById('backgroundPanel').classList.add('active');
    tg.HapticFeedback.impactOccurred('light');
}

function closeBackground() {
    document.getElementById('backgroundPanel').classList.remove('active');
}

function openTemplates() {
    document.getElementById('templatesPanel').classList.add('active');
    tg.HapticFeedback.impactOccurred('light');
}

function closeTemplates() {
    document.getElementById('templatesPanel').classList.remove('active');
}

function closeAllPanels() {
    closeMenu();
    closeBackground();
    closeTemplates();
}

// Утилиты
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

function showNotification(message, duration = 2000) {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notificationText');
    
    text.textContent = message;
    notification.classList.remove('hide');
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
    }, duration);
}

function initTools() {
    // Инициализация начального состояния инструментов
    updateBrushSizeDisplay();
}

function updateBrushSizeDisplay() {
    document.querySelector('.size-value').textContent = brushSize;
}

// Обработка ошибок
window.addEventListener('error', (e) => {
    console.error('Ошибка:', e.error);
    showNotification('Произошла ошибка');
});

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);