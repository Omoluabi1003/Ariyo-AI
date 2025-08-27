function changeColorScheme() {
    applyTheme();
}

function applyTheme() {
    const themeColor = '#8e44ad';
    const gradStart = themeColor;
    const gradEnd = '#4a148c';
    const style = document.getElementById('theme-style') || document.createElement('style');
    style.id = 'theme-style';
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
    body { background-color: #f3e5f5; color: #000000; }
  `;
    document.head.appendChild(style);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', themeColor);
    }
}

