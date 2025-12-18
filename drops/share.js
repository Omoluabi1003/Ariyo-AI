(function() {
  const defaultHashtags = ['AriyoAI', 'Afrobeats', 'NigeriaMusic', 'NowPlaying'];
  const emojiMap = {
    music: '🎶',
    afrobeats: '🎶',
    lagos: '🌅',
    radio: '📻',
    night: '🌙',
    sunrise: '🌅',
    nigeria: '🇳🇬',
    ai: '🤖',
    pepper: '🌶️',
  };

  function toHashtag(tag) {
    return `#${tag
      .trim()
      .replace(/[^a-z0-9]+/gi, '')
      .replace(/^#/, '')}`;
  }

  function pickEmoji(tags) {
    for (const tag of tags) {
      const cleaned = tag.toLowerCase();
      if (emojiMap[cleaned]) return emojiMap[cleaned];
    }
    return '';
  }

  function buildCaption(title, excerpt, url, tags) {
    const tagHashtags = tags.map(toHashtag).filter((tag) => tag !== '#');
    const unique = Array.from(new Set([...defaultHashtags.map((t) => `#${t}`), ...tagHashtags])).slice(0, 12);
    const emoji = pickEmoji(tags);
    return `${title}\n${excerpt}\n${url}\n${unique.join(' ')}${emoji ? ` ${emoji}` : ''}`;
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch (err) {
      return false;
    } finally {
      textarea.remove();
    }
  }

  function initShareModule() {
    const shareSection = document.querySelector('[data-share]');
    if (!shareSection) return;

    const title = shareSection.getAttribute('data-title') || '';
    const excerpt = shareSection.getAttribute('data-excerpt') || '';
    const url = shareSection.getAttribute('data-url') || window.location.href;
    const tags = (shareSection.getAttribute('data-tags') || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const statusEl = shareSection.querySelector('.share-status');
    const caption = buildCaption(title, excerpt, url, tags);

    const setStatus = (msg) => {
      if (statusEl) {
        statusEl.textContent = msg;
      }
    };

    const copyCaptionBtn = document.getElementById('copyCaption');
    const copyLinkBtn = document.getElementById('copyLink');
    const nativeShareBtn = document.getElementById('nativeShare');

    if (copyCaptionBtn) {
      copyCaptionBtn.addEventListener('click', async () => {
        const ok = await copyText(caption);
        setStatus(ok ? 'Caption copied. Paste into WhatsApp, X, or LinkedIn.' : 'Unable to copy caption.');
      });
    }

    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', async () => {
        const ok = await copyText(url);
        setStatus(ok ? 'Link copied. Ready to drop.' : 'Unable to copy link.');
      });
    }

    if (nativeShareBtn) {
      if (!navigator.share) {
        nativeShareBtn.disabled = true;
        nativeShareBtn.setAttribute('aria-disabled', 'true');
        nativeShareBtn.textContent = 'Native share unavailable';
      } else {
        nativeShareBtn.addEventListener('click', async () => {
          try {
            await navigator.share({ title, text: caption, url });
            setStatus('Shared successfully.');
          } catch (err) {
            setStatus('Share dismissed.');
          }
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShareModule);
  } else {
    initShareModule();
  }
})();
