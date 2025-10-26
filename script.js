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
    
    // Устанавливаем правильные размеры canvas
    function setupCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Настройки рисования
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = brushSize.value;
        ctx.strokeStyle = colorPicker.value;
        
        console.log('Canvas setup:', canvas.width, canvas.height);
    }
    
    // Переменные для рисования
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    // Функция получения координат (универсальная для мыши и касаний)
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
        [lastX, lastY] = [coords.x, coords.y];
        
        // Начинаем новый путь
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        
        e.preventDefault();
        console.log('Start drawing at:', lastX, lastY);
    }
    
    // Процесс рисования
    function draw(e) {
        if (!isDrawing) return;
        
        const coords = getCoordinates(e);
        const currentX = coords.x;
        const currentY = coords.y;
        
        // Рисуем линию
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        
        [lastX, lastY] = [currentX, currentY];
        
        e.preventDefault();
    }
    
    // Окончание рисования
    function stopDrawing() {
        if (isDrawing) {
            isDrawing = false;
            console.log('Stop drawing');
        }
    }
    
    // Очистка холста
    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        console.log('Canvas cleared');
    }
    
    // Обновление настроек кисти
    function updateBrush() {
        ctx.lineWidth = brushSize.value;
        ctx.strokeStyle = colorPicker.value;
    }
    
    // Инициализация
    setupCanvas();
    
    // Добавляем обработчики событий для мыши
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Добавляем обработчики для touch-устройств (важно для мобильных!)
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);
    
    // Предотвращаем скроллинг при касании canvas
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
    });
    canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
    });
    
    // Обработчики для кнопок
    clearBtn.addEventListener('click', clearCanvas);
    colorPicker.addEventListener('input', updateBrush);
    brushSize.addEventListener('input', updateBrush);
    
    // Обработчик изменения размера окна
    window.addEventListener('resize', setupCanvas);
    console.log('Paint app initialized successfully');
});

// Обработка ошибок
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
});
