// Полная инициализация Telegram Web App
let tg = window.Telegram.WebApp;

// Инициализируем приложение
tg.ready();
tg.expand(); // Раскрываем на весь экран

// Используем тему Telegram
document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');

// Показываем основную кнопку
tg.MainButton.setText("Отправить рисунок");
tg.MainButton.show();

// Обработчик для кнопки отправки
tg.MainButton.onClick(function() {
    // Конвертируем canvas в изображение
    const dataURL = canvas.toDataURL('image/png');
    
    // Отправляем данные в Telegram
    tg.sendData(JSON.stringify({
        type: 'image',
        data: dataURL
    }));
    
    tg.close(); // Закрываем приложение
});