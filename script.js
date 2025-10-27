// Инициализация Telegram Web App
let tg = window.Telegram.WebApp;

// Ждем полной загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
    // Инициализируем Telegram Web App
    tg.ready();
    tg.expand();
    
    // Получаем элементы
    const canvas = document.getElementById('paintCanvas');
    const ctx = canvas.getContext('2d');
    const colorPicker = document.getElementById('colorPicker');
    const brushSize = document.getElementById('brushSize');
    const clearBtn = document.getElementById('clearBtn');
    const brushType = document.getElementById('brushType');
    
    // Элементы инструментов
    const brushBtn = document.getElementById('brushBtn');
    const lineBtn = document.getElementById('lineBtn');
    const rectBtn = document.getElementById('rectBtn');
    const circleBtn = document.getElementById('circleBtn');
    const textBtn = document.getElementById('textBtn');
    const eraserBtn = document.getElementById('eraserBtn');
    
    // Переменные для рисования
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentTool = 'brush';
    let startX = 0;
    let startY = 0;
    let savedImageData = null;
    
    // История действий для Undo/Redo
    let history = [];
    let historyIndex = -1;
    
    // Устанавливаем правильные размеры canvas
    function setupCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        updateBrushSettings();
        saveState(); // Сохраняем первоначальное состояние
        
        console.log('Canvas setup:', canvas.width, canvas.height);
    }
    
    // Сохраняем состояние canvas
    function saveState() {
        // Удаляем состояния после текущего индекса (если сделали undo и начали новое действие)
        history = history.slice(0, historyIndex + 1);
        
        // Сохраняем текущее состояние
        history.push(canvas.toDataURL());
        historyIndex++;
        
        // Ограничиваем историю 20 состояниями
        if (history.length > 20) {
            history.shift();
            historyIndex--;
        }
    }
    
    // Восстанавливаем состояние
    function restoreState() {
        if (historyIndex >= 0 && historyIndex < history.length) {
            const img = new Image();
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = history[historyIndex];
        }
    }
    
    // Undo
    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            restoreState();
        }
    }
    
    // Redo
    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            restoreState();
        }
    }
    
    // Обновление настроек кисти
    function updateBrushSettings() {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = brushSize.value;
        
        if (currentTool === 'eraser') {
            ctx.strokeStyle = '#FFFFFF';
        } else {
            ctx.strokeStyle = colorPicker.value;
        }
        
        // Настройка типа кисти
        switch(brushType.value) {
            case 'dashed':
                ctx.setLineDash([5, 5]);
                break;
            default:
                ctx.setLineDash([]);
        }
    }
    
    // Выбор инструмента
    function selectTool(tool) {
        currentTool = tool;
        
        // Обновляем активные кнопки
        [brushBtn, lineBtn, rectBtn, circleBtn, textBtn, eraserBtn].forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(tool + 'Btn').classList.add('active');
        
        updateBrushSettings();
    }
    
    // Функция получения координат
    function getCoordinates(e) {
        let clientX, clientY;
        
        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const rect = canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
    
    // Начало рисования
    function startDrawing(e) {
        isDrawing = true;
        const coords = getCoordinates(e);
        [startX, startY] = [coords.x, coords.y];
        [lastX, lastY] = [coords.x, coords.y];
        
        // Сохраняем состояние для временного рисования
        if (['line', 'rect', 'circle'].includes(currentTool)) {
            savedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        
        if (currentTool === 'brush' || currentTool === 'eraser') {
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
        }
        
        e.preventDefault();
    }
    
    // Процесс рисования
    function draw(e) {
        if (!isDrawing) return;
        
        const coords = getCoordinates(e);
        const currentX = coords.x;
        const currentY = coords.y;
        
        switch(currentTool) {
            case 'brush':
            case 'eraser':
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
                [lastX, lastY] = [currentX, currentY];
                break;
                
            case 'line':
                // Временное рисование линии
                ctx.putImageData(savedImageData, 0, 0);
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
                break;
                
            case 'rect':
                // Временное рисование прямоугольника
                ctx.putImageData(savedImageData, 0, 0);
                ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
                break;
                
            case 'circle':
                // Временное рисование круга
                ctx.putImageData(savedImageData, 0, 0);
                const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
                ctx.beginPath();
                ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
                ctx.stroke();
                break;
                
            case 'text':
                // Режим текста - просто сохраняем позицию
                [lastX, lastY] = [currentX, currentY];
                break;
        }
        
        e.preventDefault();
    }
    
    // Окончание рисования
    function stopDrawing() {
        if (isDrawing) {
            isDrawing = false;
            
            // Для инструментов, которые рисуют временно, сохраняем окончательное состояние
            if (['line', 'rect', 'circle', 'brush', 'eraser'].includes(currentTool)) {
                saveState();
            }
            
            savedImageData = null;
        }
    }
    
    // Очистка холста
    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveState();
    }
    
    // Отправка рисунка в Telegram
    function sendToTelegram() {
        canvas.toBlob(function(blob) {
            const formData = new FormData();
            formData.append('image', blob, 'drawing.png');
            
            // Здесь будет код для отправки на сервер
            // Пока просто покажем уведомление
            tg.showPopup({
                title: 'Готово!',
                message: 'Рисунок готов к отправке',
                buttons: [{ type: 'ok' }]
            });
        }, 'image/png');
    }
    
    // Добавление текста
    function addText(x, y) {
        const text = prompt('Введите текст:');
        if (text) {
            ctx.font = `${brushSize.value * 5}px Arial`;
            ctx.fillStyle = colorPicker.value;
            ctx.fillText(text, x, y);
            saveState();
        }
    }
    
    // Инициализация
    setupCanvas();
    
    // Обработчики событий
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    
    // Предотвращаем скроллинг
    canvas.addEventListener('touchstart', (e) => e.preventDefault());
    canvas.addEventListener('touchmove', (e) => e.preventDefault());
    
    // Обработчики кнопок
    clearBtn.addEventListener('click', clearCanvas);
    colorPicker.addEventListener('input', updateBrushSettings);
    brushSize.addEventListener('input', updateBrushSettings);
    brushType.addEventListener('change', updateBrushSettings);
    
    // Обработчики инструментов
    brushBtn.addEventListener('click', () => selectTool('brush'));
    lineBtn.addEventListener('click', () => selectTool('line'));
    rectBtn.addEventListener('click', () => selectTool('rect'));
    circleBtn.addEventListener('click', () => selectTool('circle'));
    textBtn.addEventListener('click', () => selectTool('text'));
    eraserBtn.addEventListener('click', () => selectTool('eraser'));
    
    // Двойной клик для добавления текста
    canvas.addEventListener('dblclick', (e) => {
        if (currentTool === 'text') {
            const coords = getCoordinates(e);
            addText(coords.x, coords.y);
        }
    });
    
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
            }
        }
    });
    
    // Кнопка отправки в Telegram
    tg.MainButton.setText("Отправить рисунок");
    tg.MainButton.onClick(sendToTelegram);
    tg.MainButton.show();
    
    console.log('Enhanced Paint app initialized');
});