(function (global) {
  const DEFAULT_CATEGORIES = ['Afrobeat', 'Nigerian Hip-Hop', 'Amapiano', 'Gospel', 'Fusion'];
  const RETRY_DELAYS_MS = [800, 1600, 3200];

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (err) {
      return '';
    }
  }

  function formatSharePayload(item) {
    const lineOne = item.artist ? `${item.title} — ${item.artist}` : item.title;
    const targetUrl = item.audioUrl || item.pageUrl || '';
    const payload = `${lineOne}\n${targetUrl}`.trim();
    return { lineOne, targetUrl, payload };
  }

  class MusicFeedPlayer {
    constructor(onStateChange) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.autoplay = false;
      this.audio.setAttribute('playsinline', '');
      this.audio.setAttribute('controlsList', 'nodownload');
      this.state = 'idle';
      this.currentItem = null;
      this.retryIndex = 0;
      this.onStateChange = onStateChange;

      this.audio.addEventListener('playing', () => this.updateState('playing'));
      this.audio.addEventListener('waiting', () => this.updateState('buffering'));
      this.audio.addEventListener('ended', () => this.resetState());
      this.audio.addEventListener('error', () => this.handleError());
    }

    updateState(state, details) {
      this.state = state;
      if (typeof this.onStateChange === 'function') {
        this.onStateChange(this.currentItem, state, details);
      }
    }

    resetState() {
      this.updateState('idle');
      this.currentItem = null;
      this.retryIndex = 0;
    }

    async play(item) {
      if (this.currentItem && this.currentItem.id === item.id && this.state === 'playing') {
        this.stop();
        return;
      }

      this.currentItem = item;
      this.retryIndex = 0;
      this.updateState('buffering');
      await this.startPlayback();
    }

    async startPlayback() {
      if (!this.currentItem) return;
      try {
        if (typeof setCrossOrigin === 'function') {
          setCrossOrigin(this.audio, this.currentItem.audioUrl);
        }
      } catch (err) {
        /* ignore */
      }

      this.audio.src = this.currentItem.audioUrl;
      try {
        await this.audio.play();
        this.updateState('playing');
      } catch (err) {
        this.handleError();
      }
    }

    stop() {
      if (!this.currentItem) return;
      this.audio.pause();
      this.audio.currentTime = 0;
      this.resetState();
    }

    handleError() {
      if (!this.currentItem) return;
      const delay = RETRY_DELAYS_MS[this.retryIndex];
      if (delay !== undefined) {
        this.retryIndex += 1;
        this.updateState('reconnecting', { retryIn: delay });
        setTimeout(() => this.startPlayback(), delay);
      } else {
        this.updateState('dead');
      }
    }
  }

  function createCategoryChips(container, onSelect) {
    container.innerHTML = '';
    const buttons = [];
    DEFAULT_CATEGORIES.forEach(category => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'music-feed-chip';
      chip.textContent = category;
      chip.addEventListener('click', () => {
        buttons.forEach(btn => btn.classList.toggle('active', btn === chip));
        onSelect(category);
      });
      buttons.push(chip);
      container.appendChild(chip);
    });
    if (buttons[0]) {
      buttons[0].classList.add('active');
    }
  }

  function renderEmptyState(container, message) {
    const empty = document.createElement('div');
    empty.className = 'music-feed-empty';
    empty.textContent = message;
    container.replaceChildren(empty);
  }

  function renderItems(items, container, player) {
    if (!items || !items.length) {
      renderEmptyState(container, 'Nothing to play yet. Check back soon.');
      return;
    }

    container.innerHTML = '';
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'music-feed-row';

      const art = document.createElement('div');
      art.className = 'music-feed-artwork';
      if (item.artwork) {
        const img = document.createElement('img');
        img.src = item.artwork;
        img.alt = `${item.title} cover art`;
        img.loading = 'lazy';
        img.onerror = () => {
          img.remove();
          art.classList.add('music-feed-artwork--fallback');
        };
        art.appendChild(img);
      } else {
        art.classList.add('music-feed-artwork--fallback');
      }

      const info = document.createElement('div');
      info.className = 'music-feed-info';

      const titleRow = document.createElement('div');
      titleRow.className = 'music-feed-title-row';
      const title = document.createElement('h4');
      title.textContent = item.title;
      const artist = document.createElement('span');
      artist.className = 'music-feed-artist';
      artist.textContent = item.artist;
      titleRow.appendChild(title);
      titleRow.appendChild(artist);

      const meta = document.createElement('div');
      meta.className = 'music-feed-meta';
      const source = document.createElement('span');
      source.textContent = item.sourceName;
      const date = document.createElement('span');
      date.textContent = formatDate(item.publishedAt);
      const format = document.createElement('span');
      format.textContent = item.format === 'episode' ? 'Episode' : item.format === 'mix' ? 'Mix' : 'Track';
      meta.appendChild(source);
      meta.appendChild(format);
      meta.appendChild(date);

      const tagline = document.createElement('div');
      tagline.className = 'music-feed-tagline';
      tagline.textContent = item.category;

      info.appendChild(titleRow);
      info.appendChild(meta);
      info.appendChild(tagline);

      const actions = document.createElement('div');
      actions.className = 'music-feed-actions';

      const status = document.createElement('span');
      status.className = 'music-feed-status';

      const spinner = document.createElement('span');
      spinner.className = 'music-feed-spinner';
      spinner.setAttribute('aria-hidden', 'true');

      const play = document.createElement('button');
      play.type = 'button';
      play.className = 'music-feed-action';
      play.textContent = 'Play';
      play.addEventListener('click', () => player.play(item));

      const stop = document.createElement('button');
      stop.type = 'button';
      stop.className = 'music-feed-action';
      stop.textContent = 'Stop';
      stop.addEventListener('click', () => player.stop());

      const shareButton = document.createElement('button');
      shareButton.type = 'button';
      shareButton.className = 'music-feed-action';
      shareButton.textContent = 'Share';
      shareButton.addEventListener('click', async () => {
        const payload = formatSharePayload(item);
        if (navigator.share) {
          try {
            await navigator.share({ title: payload.lineOne, text: payload.payload, url: payload.targetUrl });
          } catch (err) {
            /* ignore */
          }
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(payload.payload).catch(() => {});
        }
      });

      actions.appendChild(spinner);
      actions.appendChild(status);
      actions.appendChild(play);
      actions.appendChild(stop);
      actions.appendChild(shareButton);

      if (item.pageUrl) {
        const link = document.createElement('a');
        link.href = item.pageUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'music-feed-action secondary';
        link.textContent = 'Open source';
        actions.appendChild(link);
      }

      row.appendChild(art);
      row.appendChild(info);
      row.appendChild(actions);
      container.appendChild(row);

      row.dataset.itemId = item.id;
      row.__statusEl = status;
      row.__spinnerEl = spinner;
    });
  }

  function setRowState(row, state) {
    if (!row) return;
    const spinner = row.__spinnerEl;
    const status = row.__statusEl;
    const baseMessage = {
      buffering: 'Buffering…',
      playing: 'Playing',
      reconnecting: 'Reconnecting…',
      dead: 'Unavailable right now',
      idle: '',
    }[state] || '';

    if (spinner) {
      spinner.style.visibility = state === 'buffering' || state === 'reconnecting' ? 'visible' : 'hidden';
    }
    if (status) {
      status.textContent = baseMessage;
      status.classList.toggle('music-feed-status--error', state === 'dead');
    }
    row.classList.toggle('music-feed-row--active', state === 'playing');
  }

  function attachPlayerListeners(container, player) {
    const rows = new Map();

    function findRow(item) {
      if (!item) return null;
      if (rows.has(item.id)) return rows.get(item.id);
      const row = container.querySelector(`[data-item-id="${CSS.escape(item.id)}"]`);
      if (row) rows.set(item.id, row);
      return row;
    }

    return function onStateChange(item, state) {
      const activeRow = findRow(item);
      container.querySelectorAll('.music-feed-row').forEach(row => {
        if (row !== activeRow) {
          setRowState(row, 'idle');
        }
      });
      setRowState(activeRow, state);
    };
  }

  async function initializeMusicFeed() {
    const service = global.musicFeedService;
    const section = document.getElementById('musicFeedSection');
    if (!section) return;

    if (!service || !service.isEnabled) {
      section.remove();
      return;
    }

    const tabButtons = section.querySelectorAll('[data-music-tab]');
    const categoryBar = section.querySelector('.music-feed-categories');
    const listContainer = section.querySelector('#musicFeedList');
    const headerNote = section.querySelector('#musicFeedHeaderNote');

    const player = new MusicFeedPlayer();
    const syncState = attachPlayerListeners(listContainer, player);
    player.onStateChange = (item, state) => syncState(item, state);

    createCategoryChips(categoryBar, (category) => loadLibrary(category));

    async function loadLatest() {
      headerNote.textContent = 'Fresh Afrobeat and Nigerian drops, all direct-play ready.';
      listContainer.dataset.loading = 'true';
      try {
        const { items } = await service.getLatest();
        renderItems(items, listContainer, player);
      } catch (err) {
        renderEmptyState(listContainer, 'Unable to load latest drops right now.');
      } finally {
        listContainer.dataset.loading = 'false';
      }
    }

    async function loadLibrary(category) {
      headerNote.textContent = `${category} picks curated for fast playback.`;
      listContainer.dataset.loading = 'true';
      try {
        const { items } = await service.getLibrary(category);
        renderItems(items, listContainer, player);
      } catch (err) {
        renderEmptyState(listContainer, 'Unable to load this category right now.');
      } finally {
        listContainer.dataset.loading = 'false';
      }
    }

    async function loadEpisodes() {
      headerNote.textContent = 'Long-form mixes and episodes with stable streams.';
      listContainer.dataset.loading = 'true';
      try {
        const { items } = await service.getEpisodes();
        renderItems(items, listContainer, player);
      } catch (err) {
        renderEmptyState(listContainer, 'Episodes are unavailable right now.');
      } finally {
        listContainer.dataset.loading = 'false';
      }
    }

    async function handleTabChange(tab) {
      tabButtons.forEach(btn => {
        const isActive = btn.dataset.musicTab === tab;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });
      categoryBar.style.display = tab === 'library' ? 'flex' : 'none';
      switch (tab) {
        case 'library':
          await loadLibrary(DEFAULT_CATEGORIES[0]);
          break;
        case 'episodes':
          await loadEpisodes();
          break;
        default:
          await loadLatest();
      }
    }

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => handleTabChange(btn.dataset.musicTab));
    });

    section.hidden = false;
    handleTabChange('latest');
  }

  document.addEventListener('DOMContentLoaded', initializeMusicFeed);
})(typeof window !== 'undefined' ? window : globalThis);
