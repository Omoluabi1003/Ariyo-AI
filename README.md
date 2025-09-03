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

## Contributing

Contributions are welcome! Please feel free to submit a pull request with any improvements or new features.

## Running Tests

This project does not yet include automated tests. You can run the placeholder test script with:

```bash
npm test
```

The command currently prints "No tests yet".

## Utilities

- `user_tracker.py`: stores basic user information in a local SQLite database. If
  `SMTP_USER` and `SMTP_PASS` environment variables are set, the script also
  sends a notification email to `pakiyogun10@gmail.com` each time a user is
  added.

Run the script with:

```bash
python user_tracker.py
```

## License

This project is licensed under the MIT License.

---

**SEO Keywords:** Paul Iyogun, Omoluabi, Àríyò AI, Ariyo, Nigerian music, Naija AI, AI chatbot, PWA
