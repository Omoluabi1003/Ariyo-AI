const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const dropsDataPath = path.join(projectRoot, 'content', 'drops.json');
const dropsOutputDir = path.join(projectRoot, 'drops');
const defaultAuthor = 'Ariyo AI';
const defaultOgImage = 'Banner.png';
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');

function loadDrops() {
  if (!fs.existsSync(dropsDataPath)) {
    throw new Error('Missing content/drops.json');
  }
  const raw = fs.readFileSync(dropsDataPath, 'utf8');
  const drops = JSON.parse(raw);
  return drops.map((drop) => ({
    ...drop,
    author: drop.author || defaultAuthor,
    coverImage: drop.coverImage || defaultOgImage,
  }));
}

function ensureOutputDir() {
  fs.mkdirSync(dropsOutputDir, { recursive: true });
}

function absoluteUrl(relativePath) {
  if (!relativePath) return '';
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  const normalized = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return siteUrl ? `${siteUrl}${normalized}` : normalized;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarkdown(text) {
  if (!text) return '';
  const paragraphs = text.trim().split(/\n\s*\n/);
  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function renderTags(tags = []) {
  return tags
    .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
    .join('');
}

function renderAudioEmbed(audioEmbed) {
  if (!audioEmbed) return '';
  const safeTitle = escapeHtml(audioEmbed.title || 'Listen');
  const safeUrl = escapeHtml(audioEmbed.url || '');
  const safeType = escapeHtml(audioEmbed.type || 'track');
  const thumb = audioEmbed.thumbnail ? `<img src="${escapeHtml(audioEmbed.thumbnail)}" alt="${safeTitle}" class="audio-thumb">` : '';
  const label = safeType === 'radio' ? 'Radio stream' : safeType === 'external' ? 'Mix' : 'Track';

  return `
  <section class="audio-embed" aria-labelledby="audio-embed-heading">
    <div class="section-label">${label} embed</div>
    <div class="audio-card">
      ${thumb}
      <div class="audio-meta">
        <p class="eyebrow">${escapeHtml(audioEmbed.type || 'track')}</p>
        <h3 id="audio-embed-heading">${safeTitle}</h3>
        <audio controls preload="none" src="${safeUrl}" class="audio-control">
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  </section>`;
}

function renderJsonLd(drop, canonicalUrl, imageUrl) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: drop.title,
    description: drop.excerpt,
    datePublished: drop.date,
    image: [imageUrl],
    author: {
      '@type': 'Person',
      name: drop.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Ariyo AI',
      url: siteUrl || undefined,
    },
    keywords: drop.tags && drop.tags.length ? drop.tags.join(', ') : undefined,
    mainEntityOfPage: canonicalUrl,
  };

  return `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}

function buildShareDataAttributes(drop, canonicalUrl) {
  const safeTitle = escapeHtml(drop.title);
  const safeExcerpt = escapeHtml(drop.excerpt);
  const safeTags = escapeHtml((drop.tags || []).join(','));
  return `data-share="true" data-title="${safeTitle}" data-excerpt="${safeExcerpt}" data-url="${escapeHtml(
    canonicalUrl,
  )}" data-tags="${safeTags}"`;
}

function renderDropPage(drop) {
  const canonicalUrl = `${siteUrl || ''}/drops/${drop.slug}`;
  const imageUrl = absoluteUrl(drop.coverImage || defaultOgImage);
  const tagsMarkup = renderTags(drop.tags);
  const audioSection = renderAudioEmbed(drop.audioEmbed);
  const jsonLd = renderJsonLd(drop, canonicalUrl, imageUrl);
  const shareAttributes = buildShareDataAttributes(drop, canonicalUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escapeHtml(drop.title)} | Drops | Ariyo AI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Eczar:wght@600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../drops.css">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="description" content="${escapeHtml(drop.excerpt)}">
  <meta name="robots" content="index,follow">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(drop.title)}">
  <meta property="og:description" content="${escapeHtml(drop.excerpt)}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(drop.title)}">
  <meta name="twitter:description" content="${escapeHtml(drop.excerpt)}">
  <meta name="twitter:image" content="${imageUrl}">
  ${siteUrl ? `<meta property="og:site_name" content="Ariyo AI">` : ''}
  ${jsonLd}
</head>
<body class="drops-surface">
  <header class="drops-header">
    <div class="logo-lockup">
      <a href="/" class="logo">Àríyò AI</a>
      <span class="pill">Drops</span>
    </div>
    <nav class="drops-nav">
      <a href="/main.html" class="nav-link">Music</a>
      <a href="/main.html#stories" class="nav-link">Stories</a>
      <a href="/drops" class="nav-link active">Drops</a>
    </nav>
  </header>
  <main class="drop-main">
    <article class="drop-article">
      <div class="drop-hero">
        <img src="${escapeHtml(drop.coverImage || defaultOgImage)}" alt="${escapeHtml(drop.title)}" class="drop-cover">
      </div>
      <div class="drop-meta">
        <p class="eyebrow">${formatDate(drop.date)} • ${escapeHtml(drop.author)}</p>
        <h1>${escapeHtml(drop.title)}</h1>
        <div class="tag-row">${tagsMarkup}</div>
      </div>
      <div class="drop-body">${renderMarkdown(drop.body)}</div>
      ${audioSection}
      <section class="share-section" ${shareAttributes}>
        <div class="section-label">Share this drop</div>
        <div class="share-actions">
          <button id="copyCaption" class="share-button">Copy caption</button>
          <button id="copyLink" class="share-button secondary">Copy link</button>
          <button id="nativeShare" class="share-button ghost">Native share</button>
        </div>
        <p class="share-status" aria-live="polite">Ready to share.</p>
      </section>
    </article>
  </main>
  <footer class="drops-footer">
    <a href="/drops" class="nav-link">← Back to Drops</a>
  </footer>
  <script src="../share.js" defer></script>
</body>
</html>`;
}

function renderCard(drop) {
  const cover = escapeHtml(drop.coverImage || defaultOgImage);
  return `
  <article class="drop-card">
    <a href="/drops/${escapeHtml(drop.slug)}" class="card-link">
      <div class="card-cover" style="background-image: url('${cover}');"></div>
      <div class="card-body">
        <p class="eyebrow">${formatDate(drop.date)}</p>
        <h3>${escapeHtml(drop.title)}</h3>
        <p class="excerpt">${escapeHtml(drop.excerpt)}</p>
        <div class="tag-row">${renderTags(drop.tags)}</div>
      </div>
    </a>
  </article>`;
}

function renderDropsIndex(drops) {
  const canonicalUrl = `${siteUrl || ''}/drops`;
  const cards = drops.map(renderCard).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Drops | Ariyo AI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&family=Eczar:wght@600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="drops.css">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="description" content="Short-form Drops from Ariyo AI with music and radio embeds for sharing.">
  <meta name="robots" content="index,follow">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Drops | Ariyo AI">
  <meta property="og:description" content="Short stories and embeds crafted for sharing.">
  <meta property="og:image" content="${absoluteUrl(defaultOgImage)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Drops | Ariyo AI">
  <meta name="twitter:description" content="Short stories and embeds crafted for sharing.">
  <meta name="twitter:image" content="${absoluteUrl(defaultOgImage)}">
</head>
<body class="drops-surface">
  <header class="drops-header">
    <div class="logo-lockup">
      <a href="/" class="logo">Àríyò AI</a>
      <span class="pill">Drops</span>
    </div>
    <nav class="drops-nav">
      <a href="/main.html" class="nav-link">Music</a>
      <a href="/main.html#stories" class="nav-link">Stories</a>
      <a href="/drops" class="nav-link active">Drops</a>
    </nav>
  </header>
  <main class="drops-main">
    <section class="drops-hero">
      <p class="eyebrow">Blog</p>
      <h1>Drops: share-ready stories with sound</h1>
      <p class="lede">Keep the music engine humming while every story gets social-native previews for WhatsApp, X, LinkedIn, and Facebook.</p>
    </section>
    <section class="drops-grid">
      ${cards}
    </section>
  </main>
  <footer class="drops-footer">
    <p>Keep vibing with <a href="/main.html">the main player</a> or dive into a Drop.</p>
  </footer>
</body>
</html>`;
}

function writeFileSafely(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

function clearOldDropFolders(activeSlugs) {
  if (!fs.existsSync(dropsOutputDir)) return;
  const entries = fs.readdirSync(dropsOutputDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !activeSlugs.has(entry.name)) {
      fs.rmSync(path.join(dropsOutputDir, entry.name), { recursive: true, force: true });
    }
  }
}

function generate() {
  ensureOutputDir();
  const drops = loadDrops().sort((a, b) => new Date(b.date) - new Date(a.date));
  const slugSet = new Set(drops.map((d) => d.slug));
  clearOldDropFolders(slugSet);

  const indexHtml = renderDropsIndex(drops);
  writeFileSafely(path.join(dropsOutputDir, 'index.html'), indexHtml);

  drops.forEach((drop) => {
    const dropHtml = renderDropPage(drop);
    const dropDir = path.join(dropsOutputDir, drop.slug);
    writeFileSafely(path.join(dropDir, 'index.html'), dropHtml);
  });

  if (!siteUrl) {
    console.warn('NEXT_PUBLIC_SITE_URL not set. Metadata will use relative URLs.');
  }

  console.log(`Generated ${drops.length} drop pages.`);
}

if (require.main === module) {
  generate();
}

module.exports = { generateDrops: generate };
