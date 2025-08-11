function changeColorScheme() {
    const selectedTheme = localStorage.getItem('selectedTheme');

    if (selectedTheme) {
        applyTheme(selectedTheme);
        return;
    }

    const currentColor = localStorage.getItem('currentColor') || '#6a5acd';
    localStorage.setItem('currentColor', currentColor);
    applyTheme('default', currentColor);
}

function applyTheme(theme, color) {
    const style = document.createElement('style');
    let themeColor = color;
    let css = '';

    switch (theme) {
        case 'dark':
            themeColor = '#333333';
            css = `
        body { background-color: #121212; color: #ffffff; }
        .header { background: linear-gradient(135deg, ${themeColor}, #000); }
        .sidebar button { background: linear-gradient(135deg, ${themeColor}, #555); }
      `;
            break;
        case 'light':
            themeColor = '#e0e0e0';
            css = `
        body { background-color: #f5f5f5; color: #000000; }
        .header { background: linear-gradient(135deg, ${themeColor}, #fff); }
        .sidebar button { background: linear-gradient(135deg, ${themeColor}, #ccc); }
        .dark-mode { color: #000000; }
      `;
            break;
        case 'ocean':
            themeColor = '#1e90ff';
            css = `
        body { background-color: #e0f7fa; color: #000000; }
        .header { background: linear-gradient(135deg, ${themeColor}, #01579b); }
        .sidebar button { background: linear-gradient(135deg, ${themeColor}, #0288d1); }
      `;
            break;
        case 'forest':
            themeColor = '#228b22';
            css = `
        body { background-color: #e8f5e9; color: #000000; }
        .header { background: linear-gradient(135deg, ${themeColor}, #1b5e20); }
        .sidebar button { background: linear-gradient(135deg, ${themeColor}, #2e7d32); }
      `;
            break;
        case 'sunset':
            themeColor = '#ff7043';
            css = `
        body { background-color: #fff3e0; color: #000000; }
        .header { background: linear-gradient(135deg, ${themeColor}, #bf360c); }
        .sidebar button { background: linear-gradient(135deg, ${themeColor}, #e64a19); }
      `;
            break;
        default:
            themeColor = color || '#6a5acd';
            break;
    }

    style.innerHTML = `
    :root { --theme-color: ${themeColor}; }
    .header { background: linear-gradient(135deg, ${themeColor}, #000); }
    .sidebar button { background: linear-gradient(135deg, ${themeColor}, #333); }
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
