function changeColorScheme() {
  const lastColorChange = localStorage.getItem('lastColorChange');
  const now = new Date().getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  if (!lastColorChange || (now - lastColorChange > oneWeek)) {
    let newColor;
    let recentColors = JSON.parse(localStorage.getItem('recentColors')) || [];
    do {
      newColor = '#' + Math.floor(Math.random()*16777215).toString(16);
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
    const style = document.createElement('style');
    style.innerHTML = `
      :root { --theme-color: ${currentColor}; }
      .header { background: linear-gradient(135deg, ${currentColor}, #000); }
      .sidebar button { background: linear-gradient(135deg, ${currentColor}, #333); }
      .music-controls.icons-only button { background: ${currentColor}; }
      .track-list a:hover, .album-list a:hover, .radio-list a:hover { background-color: ${currentColor}; }
      .popup-close { background: ${currentColor}; }
      .retry-button { background: ${currentColor}; }
      .progress-bar div { background: ${currentColor}; }
      .install-btn { background: ${currentColor}; }
      #start-button { background-color: ${currentColor}; }
    `;
    document.head.appendChild(style);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', currentColor);
  }
}
