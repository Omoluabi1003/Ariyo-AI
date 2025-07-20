function changeColorScheme() {
    const selectedTheme = localStorage.getItem('selectedTheme');

    if (selectedTheme) {
        applyTheme(selectedTheme);
        return;
    }

    const lastColorChange = localStorage.getItem('lastColorChange');
    const now = new Date().getTime();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    if (!lastColorChange || (now - lastColorChange > oneWeek)) {
        let newColor;
        let recentColors = JSON.parse(localStorage.getItem('recentColors')) || [];
        do {
            newColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
        } while (recentColors.includes(newColor));

        recentColors.push(newColor);
        if (recentColors.length > 8) {
            recentColors.shift();
        }
        localStorage.setItem('recentColors', JSON.stringify(recentColors));
        localStorage.setItem('lastColorChange', now);
        localStorage.setItem('currentColor', newColor);
    }

    const currentColor = localStorage.getItem('currentColor');
    if (currentColor) {
        applyTheme('default', currentColor);
    }
}

function applyTheme(theme, color) {
    const root = document.documentElement;
    let themeColor = color;

    switch (theme) {
        case 'dark':
            themeColor = '#333333';
            root.style.setProperty('--background-color', '#121212');
            root.style.setProperty('--text-color', '#ffffff');
            break;
        case 'light':
            themeColor = '#e0e0e0';
            root.style.setProperty('--background-color', '#f5f5f5');
            root.style.setProperty('--text-color', '#000000');
            break;
        default:
            themeColor = color || '#00bcd4';
            root.style.setProperty('--background-color', '#000');
            root.style.setProperty('--text-color', '#fff');
            break;
    }

    root.style.setProperty('--theme-color', themeColor);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', themeColor);
}
