# Àríyò AI Architecture

This document outlines the organization of the project after restructuring the repository into clearer domains.

## High-Level Overview

Àríyò AI is a static Progressive Web App served from GitHub Pages. The experience is split into two layers:

1. **Core shell** – The landing experience (`index.html`), the primary player (`main.html`), and supporting pages such as `about.html`. These files live at the repository root so the existing URLs remain unchanged.
2. **Modular apps** – Games, chatbots, and utilities that open from the edge panel. Each one is encapsulated in `apps/<name>/` so its HTML, CSS, and JavaScript travel together.

```
/
├── apps/
│   ├── ariyo-ai-chat/
│   ├── cycle-precision/
│   ├── connect-four/
│   ├── picture-game/
│   ├── sabi-bible/
│   ├── tetris/
│   └── word-search/
├── docs/
├── icons/
├── img/
├── scripts/
└── *.html, *.css, *.js, media assets
```

## Apps Directory

Each folder inside `apps/` is self-contained:

- `ariyo-ai-chat/` – Embed for the Àríyò AI Zapier chatbot.
- `sabi-bible/` – Embed for the Sabi Bible chatbot.
- `picture-game/` – Sliding puzzle including its styling and game logic.
- `tetris/` – Omoluabi Tetris and its theme controller.
- `word-search/` – Word search generator plus grid helper.
- `connect-four/` – Ara Connect-4 experience.
- `cycle-precision/` – Cycle Precision calculator utility.

Shared utilities such as `viewport-height.js`, `prevent-zoom.js`, and the global color-scheme files remain at the root because they are consumed by multiple experiences (including the PWA shell).

## Service Worker & Offline Support

`service-worker.js` precaches the shell assets and now targets the reorganized `apps/` paths. The cache manifest (`version.json`) should be bumped whenever static assets move so clients pull the latest files.

## Deployment Notes

- Install dependencies only when you need to work with the lyric parser (`npm install`). The `node_modules/` directory is ignored to keep the repository lean.
- Because files moved into new folders, perform a hard refresh (or clear site data) when testing locally to avoid the browser caching the old paths.
