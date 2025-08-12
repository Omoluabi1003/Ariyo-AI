function changeColorScheme() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    applyTheme(darkMode ? 'dark' : 'sunset');
}

function toggleDarkMode() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    localStorage.setItem('darkMode', (!darkMode).toString());
    applyTheme(!darkMode ? 'dark' : 'sunset');
}

function applyTheme(mode) {
    const themeColor = '#ff7043';
    const gradStart = themeColor;
    const gradEnd = '#bf360c';
    const style = document.getElementById('theme-style') || document.createElement('style');
    style.id = 'theme-style';
    let css = '';

    if (mode === 'dark') {
        css = `body { background-color: #121212; color: #ffffff; }`;
    } else {
        css = `body { background-color: #fff3e0; color: #000000; }`;
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
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', themeColor);
    }
}

