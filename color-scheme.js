function changeColorScheme() {
    const selectedTheme = localStorage.getItem('selectedTheme');

    if (selectedTheme) {
        applyTheme(selectedTheme);
        return;
    }

    const currentColor = localStorage.getItem('currentColor') || '#6a5acd';
    localStorage.setItem('currentColor', currentColor);
    applyTheme('default', currentColor, currentColor, '#000');
}

function applyTheme(theme, color, gradientStart, gradientEnd) {
    const style = document.createElement('style');
    let themeColor = color;
    let gradStart = gradientStart || themeColor || '#6a5acd';
    let gradEnd = gradientEnd || '#000';
    let css = '';

    switch (theme) {
        case 'dark':
            themeColor = '#333333';
            gradStart = themeColor;
            gradEnd = '#555';
            css = `
        body { background-color: #121212; color: #ffffff; }
      `;
            break;
        case 'light':
            themeColor = '#e0e0e0';
            gradStart = themeColor;
            gradEnd = '#ccc';
            css = `
        body { background-color: #f5f5f5; color: #000000; }
        .dark-mode { color: #000000; }
      `;
            break;
        case 'ocean':
            themeColor = '#1e90ff';
            gradStart = themeColor;
            gradEnd = '#01579b';
            css = `
        body { background-color: #e0f7fa; color: #000000; }
      `;
            break;
        case 'forest':
            themeColor = '#228b22';
            gradStart = themeColor;
            gradEnd = '#1b5e20';
            css = `
        body { background-color: #e8f5e9; color: #000000; }
      `;
            break;
        case 'sunset':
            themeColor = '#ff7043';
            gradStart = themeColor;
            gradEnd = '#bf360c';
            css = `
        body { background-color: #fff3e0; color: #000000; }
      `;
            break;
        default:
            themeColor = color || '#6a5acd';
            gradStart = gradientStart || themeColor;
            gradEnd = gradientEnd || '#000';
            break;
    }

    style.innerHTML = `
    :root { --theme-color: ${themeColor}; --gradient-start: ${gradStart}; --gradient-end: ${gradEnd}; }
    .header { background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end)); }
    .sidebar button { background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end)); }
    .music-controls.icons-only button { background: ${themeColor}; }
    .track-list a:hover, .album-list a:hover, .radio-list a:hover { background-color: ${themeColor}; }
    .popup-close { background: ${themeColor}; }
    .retry-button { background: ${themeColor}; }
    .progress-bar div { background: ${themeColor}; }
    .install-btn { background: ${themeColor}; }
    #start-button { background-color: ${themeColor}; }
    ${css}
  `;
    document.head.appendChild(style);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', themeColor);
}
