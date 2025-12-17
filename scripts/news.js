(function() {
  const NEWS_URL = '/api/news';
  const LAST_SEEN_KEY = 'ariyoNewsLastSeen';
  const NEWS_CACHE_KEY = 'ariyoNewsCache';
  const NEWS_PANEL_ID = 'news-section';
  const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80';
  const KEYWORD_IMAGE_BASE = 'https://source.unsplash.com/featured/900x600?';

  const createIconDot = () => {
    const dot = document.createElement('span');
    dot.className = 'nav-notification-dot';
    dot.setAttribute('aria-hidden', 'true');
    return dot;
  };

  function createSidebarNewsButton() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return null;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ripple shockwave news-nav-button';
    button.setAttribute('data-open-target', NEWS_PANEL_ID);
    button.setAttribute('aria-label', 'Open Naija Vibes News');
    button.innerHTML = '<i class="fas fa-newspaper" aria-hidden="true"></i> Naija Vibes News';
    button.appendChild(createIconDot());

    const aboutButton = sidebar.querySelector('button[onclick*="navigateToAbout"]');
    if (aboutButton && aboutButton.parentElement === sidebar) {
      sidebar.insertBefore(button, aboutButton);
    } else {
      sidebar.appendChild(button);
    }
    return button;
  }

  function createEdgePanelNewsButton() {
    const edgeList = document.querySelector('.edge-panel-list');
    if (!edgeList) return null;

    const button = document.createElement('button');
    button.className = 'edge-panel-item edge-panel-launcher news-edge-button';
    button.type = 'button';
    button.setAttribute('role', 'listitem');
    button.setAttribute('data-open-target', NEWS_PANEL_ID);
    button.setAttribute('aria-controls', NEWS_PANEL_ID);
    button.setAttribute('aria-describedby', 'edgeLabelNews');

    const image = document.createElement('img');
    image.src = 'https://raw.githubusercontent.com/Omoluabi1003/Ariyo-AI/main/Naija%20AI2.png';
    image.alt = 'Naija Vibes News icon';

    const label = document.createElement('span');
    label.className = 'edge-panel-label';
    label.id = 'edgeLabelNews';
    label.innerHTML = '<strong>Naija Vibes News</strong>Fresh drops, milestones, and challenges';

    button.append(image, label, createIconDot());

    edgeList.appendChild(button);
    return button;
  }

  function parseDate(item) {
    const parsed = new Date(item.publishedAt || item.date || item.createdAt || Date.now());
    return parsed.getTime();
  }

  function getLatestTimestamp(items) {
    if (!items || !items.length) return 0;
    return Math.max(...items.map(parseDate));
  }

  function buildBadge(tag) {
    const badge = document.createElement('span');
    badge.className = 'news-tag';
    badge.textContent = tag || 'Update';
    return badge;
  }

  function extractKeywords(item) {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'of', 'for', 'to', 'with', 'in', 'on', 'at', 'by', 'from']);
    const text = [item.tag, item.title, item.summary]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z0-9\s,]/g, ' ');

    if (!text) return '';

    const keywords = text
      .split(/\s+/)
      .filter(Boolean)
      .filter((word, index, arr) => !stopWords.has(word) && arr.indexOf(word) === index)
      .slice(0, 6);

    return keywords.join(',');
  }

  function getStoryImage(item) {
    if (item.image) return item.image;

    const keywordQuery = extractKeywords(item);
    if (keywordQuery) {
      return `${KEYWORD_IMAGE_BASE}${encodeURIComponent(keywordQuery)}`;
    }

    return FALLBACK_IMAGE;
  }

  function makeCardInteractive(card, url) {
    if (!url) return;

    const openLink = () => window.open(url, '_blank', 'noreferrer');
    card.setAttribute('role', 'link');
    card.setAttribute('tabindex', '0');
    card.addEventListener('click', openLink);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLink();
      }
    });
  }

  function buildCard(item, isHero = false) {
    const card = document.createElement('article');
    card.className = `news-card${isHero ? ' news-hero-card' : ''}`;

    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'news-image-wrap';
    const img = document.createElement('img');
    const safeImage = getStoryImage(item);
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = safeImage;
    img.alt = item.title;
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => {
      if (img.src !== FALLBACK_IMAGE) {
        img.src = FALLBACK_IMAGE;
      } else {
        img.onerror = null;
      }
    };
    imgWrapper.appendChild(img);

    const body = document.createElement('div');
    body.className = 'news-card-body';

    const heading = document.createElement('h3');
    heading.textContent = item.title;

    const meta = document.createElement('p');
    meta.className = 'news-meta';
    const date = new Date(item.publishedAt || item.date || Date.now());
    const source = item.tag ? ` · ${item.tag}` : '';
    meta.textContent = `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}${source}`;

    const summary = document.createElement('p');
    summary.className = 'news-summary';
    summary.textContent = item.summary;

    const footer = document.createElement('div');
    footer.className = 'news-card-footer';
    footer.appendChild(buildBadge(item.tag));

    body.append(heading, meta, summary, footer);
    card.append(imgWrapper, body);

    makeCardInteractive(card, item.url);
    return card;
  }

  function renderNews(items) {
    const heroTarget = document.getElementById('news-hero');
    const feedTarget = document.getElementById('news-feed');
    if (!heroTarget || !feedTarget) return;

    heroTarget.innerHTML = '';
    feedTarget.innerHTML = '';

    const sorted = [...items].sort((a, b) => parseDate(b) - parseDate(a));
    const pinnedItems = sorted.filter(item => item.pinned);
    const heroItem = pinnedItems[0] || sorted[0];
    const remaining = sorted.filter(item => item !== heroItem);

    if (heroItem) {
      heroTarget.appendChild(buildCard(heroItem, true));
    }

    remaining.forEach(item => feedTarget.appendChild(buildCard(item)));
  }

  function saveCache(items) {
    try {
      localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(items));
    } catch (error) {
      console.warn('Unable to cache news payload', error);
    }
  }

  function getCachedNews() {
    const raw = localStorage.getItem(NEWS_CACHE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  async function loadNews() {
    let newsItems = getCachedNews() || [];
    try {
      const response = await fetch(NEWS_URL, { cache: 'no-store' });
      if (response.ok) {
        newsItems = await response.json();
        saveCache(newsItems);
      }
    } catch (error) {
      if (!newsItems.length) {
        console.warn('News feed is offline; using cache when available.');
      }
    }

    if (!Array.isArray(newsItems) || !newsItems.length) return 0;
    renderNews(newsItems);
    return getLatestTimestamp(newsItems);
  }

  function toggleNotificationDot(show) {
    document.querySelectorAll('.nav-notification-dot').forEach(dot => {
      dot.classList.toggle('visible', show);
    });
  }

  function markSeen(latestTimestamp) {
    localStorage.setItem(LAST_SEEN_KEY, String(latestTimestamp || Date.now()));
    toggleNotificationDot(false);
  }

  function closeOtherPanels() {
    if (!Array.isArray(window.PANEL_IDS)) return;
    window.PANEL_IDS.forEach(id => {
      if (id === NEWS_PANEL_ID) return;
      const panel = document.getElementById(id);
      if (panel && panel.style.display === 'block' && typeof window.closePanel === 'function') {
        window.closePanel(id);
      }
    });
  }

  function openNewsPanel(trigger) {
    const latestTimestamp = Number(localStorage.getItem(LAST_SEEN_KEY) || 0);
    if (typeof window.openPanel === 'function') {
      closeOtherPanels();
      window.openPanel(NEWS_PANEL_ID, trigger || null);
      const section = document.getElementById(NEWS_PANEL_ID);
      if (section) {
        requestAnimationFrame(() => section.classList.add('news-visible'));
      }
    }
    markSeen(latestTimestamp);
  }

  function setupCloseButton() {
    const closeBtn = document.querySelector('[data-close-target="news-section"]');
    const section = document.getElementById(NEWS_PANEL_ID);
    if (closeBtn && section) {
      closeBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        section.classList.remove('news-visible');
        setTimeout(() => window.closePanel && window.closePanel(NEWS_PANEL_ID), 180);
      }, { capture: true });
    }
  }

  async function init() {
    const sidebarBtn = createSidebarNewsButton();
    const edgeBtn = createEdgePanelNewsButton();

    const latestTimestamp = await loadNews();
    const lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY) || 0);
    const hasFreshNews = latestTimestamp > lastSeen;
    toggleNotificationDot(hasFreshNews);

    const openers = [sidebarBtn, edgeBtn].filter(Boolean);
    openers.forEach(btn => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        markSeen(latestTimestamp);
        openNewsPanel(btn);
      });
    });

    setupCloseButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
