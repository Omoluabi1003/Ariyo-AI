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
- **Crew Console:** Multi-agent AI workflows with brand governance, streaming outputs, and run history.
- **Shareable Links:** Copy or share a URL that opens the app to a specific track (e.g., `main.html?album=kindness&track=locked-away`).

## Cultural metadata + recommendations

  ```js
  {
    title: "Locked Away",
    culturalNote: {
      yo: "Ọ̀rọ̀ ọdún kì í tán l'ọ́jọ́ kan.",
      en: "Wisdom isn't learned in a day."
    }
  }
  ```
- **Storyliner (album-level)**: add album context with the `storyliner` object.
  ```js
  {
    name: "Kindness",
    storyliner: {
      origin: "Lagos and Port Harcourt sessions shaped by community storytelling circles.",
      inspiration: "Street wisdom, family conversations, and everyday resilience.",
      whyItMatters: "Keeps community memory alive while spotlighting contemporary Afrobeats truth-telling."
    }
  }
  ```
- **Why this track? reasons**: the player surfaces short reasons for the upcoming track based on playback state.
  - Album continuation when shuffle is off.
  - Shuffle mix when shuffle is on.
- **Proverb of the Day share cards**: shares use the current track’s `culturalNote` when available, otherwise a daily proverb from the local library. Use `share.html?card=proverb&album=<slug>&track=<slug>` to render the card without login.

## Growth Opportunities (2026+)

- **Amplify the cultural narrative:** Showcase the Yoruba-inspired storytelling through targeted marketing, editorial content, and social campaigns that differentiate Ariyo AI in the AI music landscape.
- **Deepen AI transparency + playback trust:** Clarify how AI recommendations are generated, surface inline explanations, and strengthen media playback controls for consistent, reliable listening sessions.
- **Optimize for Core Web Vitals + WCAG 2.2 AA:** Maintain a performance- and accessibility-first roadmap to improve SEO, inclusivity, and long-term user retention.

## 2026 Product Optimization Update (Single Consolidated Plan)

- **Cultural narrative amplification**
  - Introduce **Storyliner cards** per album with *Origin / Inspiration / Why it matters* to communicate Yoruba identity in short, skimmable modules.
  - Extend shareable links with **“Proverb of the Day”** cards for lightweight cultural marketing loops (social-ready, low-lift).
  - Sample track metadata snippet:
    ```js
    {
      title: "Locked Away",
      artist: "Omoluabi",
      culturalNote: {
        yo: "Ọ̀rọ̀ ọdún kì í tán l'ọ́jọ́ kan.",
        en: "Wisdom isn't learned in a day."
      }
    }
    ```

- **AI transparency + playback UX trust**
  - Add **“Why this track?”** cues on recommendations (e.g., “Picked because you played X” or “Tempo match: 78%”), keeping AI behavior understandable.
  - Label AI-driven and non-AI content explicitly (**AI-curated**, **Live radio**) to clarify provenance and build trust.
  - Surface a **resume prompt** on return if a recent session was saved (“Resume where you left off?”).
  - Improve buffering/error clarity with “Reconnecting…” and “Saving your place…” states plus a one-tap retry.
  - Sample resume prompt logic:
    ```js
    const saved = loadPlayerState();
    if (saved) showToast(`Resume ${saved.title}?`, { action: () => resume(saved) });
    ```

- **Performance + accessibility (WCAG 2.2 AA + Core Web Vitals)**
  - Add `preconnect` hints for CDNs/fonts and reserve layout space for hero art + loaders to reduce LCP/CLS.
  - Defer non-critical UI panels with `requestIdleCallback` to improve INP.
  - Ensure icon-only controls include `aria-label` and full keyboard navigation for player actions.
  - Respect `prefers-reduced-motion` for animations/GSAP transitions.
  - Extend structured data with `MusicRecording` and `RadioStation` schema for SEO.
  - Maintain offline support while keeping audio network-first to prevent large cache bloat.

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

## Development Requirements

- [Node.js](https://nodejs.org/) (tested with v22.19.0)
- [npm](https://www.npmjs.com/) v11.6.1 or later

## Contributing

Contributions are welcome! Please feel free to submit a pull request with any improvements or new features.

## Running Tests

Run the unit tests with:

```bash
npm test
```

The Jest suite covers utilities such as audio recovery helpers and cultural metadata selection.

## Push notifications

See [docs/push-notifications.md](docs/push-notifications.md) for configuring VAPID keys, enabling client subscriptions, and triggering broadcast alerts.

## License

This project is licensed under the MIT License.

---

**SEO Keywords:** Paul Iyogun, Omoluabi, Àríyò AI, Ariyo, Nigerian music, Naija AI, AI chatbot, PWA
