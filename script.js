// Инициализация Telegram Mini App
let tg = window.Telegram.WebApp;
tg.ready(); // Сообщаем Telegram, что приложение готово
tg.expand(); // Разворачиваем приложение на весь экран

// Получаем доступ к элементам на странице
const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const clearBtn = document.getElementById('clearBtn');

// Переменные для отслеживания рисования
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Настройка холста под высокое разрешение экранов
function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    // Задаем стиль рисования
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
}
setupCanvas();

// ФУНКЦИИ ДЛЯ РИСОВАНИЯ

// Начало рисования (нажали кнопку мыши)
function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getMousePos(e);
}

// Процесс рисования (двигаем мышью)
function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();

    const [currentX, currentY] = getMousePos(e);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.strokeStyle = colorPicker.value;
    ctx.lineWidth = brushSize.value;
    ctx.stroke();

    [lastX, lastY] = [currentX, currentY];
}

// Окончание рисования (отпустили кнопку мыши)
function stopDrawing() {
    isDrawing = false;
}

// Вспомогательная функция для получения координат мыши
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.type.includes('touch')) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    return [clientX - rect.left, clientY - rect.top];
}

// Очистка холста
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// СОБЫТИЯ
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Поддержка сенсорных экранов
canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDrawing);

clearBtn.addEventListener('click', clearCanvas);