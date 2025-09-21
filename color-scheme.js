function changeColorScheme() {
    applyTheme();
}

function applyTheme() {
    const themeColor = '#F97316';
    const gradStart = '#F97316';
    const gradEnd = '#C026D3';
    const style = document.getElementById('theme-style') || document.createElement('style');
    style.id = 'theme-style';
    style.innerHTML = `
    :root { --theme-color: ${themeColor}; --gradient-start: ${gradStart}; --gradient-end: ${gradEnd}; }
    .header { background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end)); }
    .sidebar button { background: linear-gradient(135deg, var(--gradient-start), var(--gradient-end)); }
    .track-list a:hover, .track-list .track-item:hover, .album-list a:hover, .radio-list a:hover { background-color: ${themeColor}; }
    .popup-close { background: ${themeColor}; }
    .retry-button { background: ${themeColor}; }
    .progress-bar div { background: ${themeColor}; }
    .install-btn { background: ${themeColor}; }
    #start-button { background-color: ${themeColor}; }
    body { color: #F8FAFC; }
  `;
    document.head.appendChild(style);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', themeColor);
    }
}

