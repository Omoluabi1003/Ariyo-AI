# Àríyò AI

Àríyò AI is a progressive web application that streams original Nigerian music, lets you listen to live radio and includes simple games and a built‑in chatbot. The app works offline once installed and can be added to your mobile or desktop like a native application.

## Features

- **Music Player** – browse multiple albums and play songs.
- **Radio Streaming** – tune in to several Nigerian and international stations.
- **Chatbot** – get help or entertainment via the Zapier Interfaces chatbot.
- **Sabi Bible Mode** – access inspirational Bible content with one click.
- **Mini Games** – picture puzzle and word search games are included.
- **Color Themes** – automatically cycles through color schemes or let users pick one.
- **PWA Support** – install the app and enjoy offline playback through the service worker.

## Setup

1. Clone this repository.
2. Because a service worker is used, serve the files over HTTP instead of opening them directly. A simple option is Python's built‑in server:

   ```bash
   python3 -m http.server
   ```

   Then visit `http://localhost:8000` in your browser.
3. On the welcome screen (`index.html`), click **Enter** to open the main interface.

## Usage

- Select **Albums** to play tracks from the bundled albums.
- Choose **Radio** to stream any of the available stations.
- Use the floating icons for the **Chatbot**, **Sabi Bible**, **Picture Puzzle** or **Word Search**.
- Share the app with friends through the Web Share button.
- Install it from your browser's PWA prompt for an offline experience.

## Contributing

Contributions and suggestions are welcome! Feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
