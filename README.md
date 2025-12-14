# Àríyò AI

Àríyò AI is a web-based music player created by **Paul A.K. Iyogun** (also known as **Omoluabi**). It provides a unique and culturally-rich experience for users. The app features a curated selection of Nigerian music and the Ariyo AI assistant. It is designed as a Progressive Web App (PWA), allowing users to install it on their devices for a native-like experience.

## Features

- **Music Player:** Play a variety of Nigerian music from different albums.
- **Ariyo AI:** Interact with the Ariyo AI assistant for assistance and entertainment.
- **PWA:** Install the application on your device for offline access and a native-like experience.
- **Radio:** Listen to a variety of Nigerian and international radio stations.
- **Edge Panel:** Quick-access icons for Picture Game, Omoluabi Tetris, Omoluabi Word Search, Ara Connect-4, and Cycle Precision.
- **Games:** Play mini-games like Picture Game, Omoluabi Tetris, Word Search, and Ara Connect-4.
  - Picture Game
  - Omoluabi Tetris
  - Omoluabi Word Search
  - Ara Connect-4
- **Shareable Links:** Copy or share a URL that opens the app to a specific track (e.g., `main.html?album=kindness&track=locked-away`).

## Technologies Used

- HTML
- CSS
- JavaScript
- [GSAP](https://greensock.com/gsap/) for animations
- [Font Awesome](https://fontawesome.com/) for icons
- [Zapier Interfaces](https://interfaces.zapier.com/) for Ariyo AI

## How to Use

1. Clone the repository.
2. Open the `index.html` file in your browser to see the welcome screen, then click "Enter" to go to `main.html`.
3. Enjoy the music and other features!

## Project Structure

- `apps/` – Self-contained experiences such as the mini-games, chatbots, and tools that open from the edge panel. Each app keeps its HTML, CSS, and JavaScript together for easier maintenance.
- `scripts/` – Core player logic, data definitions, and UI helpers that power `main.html`.
- `icons/`, `img/`, and media files – Visual assets used across the experience.
- Root HTML files (`index.html`, `main.html`, `about.html`) – Primary entry points for the PWA shell.
- `docs/` – Additional documentation about the architecture and organization of the project.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for a deeper dive into how the pieces fit together.

## Development Requirements

- [Node.js](https://nodejs.org/) (tested with v22.19.0)
- [npm](https://www.npmjs.com/) v11.6.1 or later

## Contributing

Contributions are welcome! Please feel free to submit a pull request with any improvements or new features.

## Running Tests

This project does not yet include automated tests. You can run the placeholder test script with:

```bash
npm test
```

The command currently prints "No tests yet".

## Music feeds

The Music section consumes a normalized JSON feed (no RSS parsing in the UI) from an aggregator set by the environment:

- `VITE_MUSIC_FEED_BASE_URL` (or `NEXT_PUBLIC_MUSIC_FEED_BASE_URL` for Next-style hosting).
- Expected endpoints under that base:
  - `GET /feed/latest?limit=50`
  - `GET /feed/library?category=Afrobeat&limit=100`
  - `GET /feed/episodes?limit=50`

Only direct-play sources are rendered (mp3, m4a, aac, ogg, wav; HTTPS required unless running on localhost). If the base URL is not configured, the Music section stays hidden as a feature flag.

## Push notifications

See [docs/push-notifications.md](docs/push-notifications.md) for configuring VAPID keys, enabling client subscriptions, and triggering broadcast alerts for new drops.

## License

This project is licensed under the MIT License.

---

**SEO Keywords:** Paul Iyogun, Omoluabi, Àríyò AI, Ariyo, Nigerian music, Naija AI, AI chatbot, PWA
