/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  publicDir: 'public',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate', // Automatically update SW when new content is available
      injectRegister: 'auto',
                              // If 'script', it generates a registerSW.js file.
                              // If 'inline', it inlines the registration script in index.html.
                              // We might need to remove our manual registration from main.js

      // manifest: false, // Set to false if you want to solely use the public/manifest.json
      // filename: 'sw.js', // Name of the generated service worker file
      // strategies: 'generateSW', // Default, good for most cases. 'injectManifest' for custom SW.

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'], // Precaching for app shell + static assets
        runtimeCaching: [
          {
            urlPattern: /\.(?:mp3|aac|ogg|wav)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ariyo-ai-audio-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 14 // 2 weeks
              },
              cacheableResponse: {
                statuses: [0, 200] // Cache opaque responses for cross-origin audio
              }
            }
          },
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/Omoluabi1003\/(Ariyo-AI|afro-gospel-stream)\/main\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ariyo-ai-github-assets',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
           { // Cache for Zapier assets if needed, though they might be better left to browser cache or NetworkFirst
            urlPattern: /^https:\/\/interfaces\.zapier\.com\/.*/i,
            handler: 'NetworkFirst', // Or StaleWhileRevalidate
            options: {
              cacheName: 'zapier-assets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 3 // 3 days
              },
            }
          }
        ]
      },
      devOptions: {
        enabled: true, // Enable PWA in development for testing
        type: 'module', // Generate a module SW in dev
      },
      // If your manifest.json is in public/manifest.json, VitePWA should pick it up by default.
      // Otherwise, you can configure it explicitly:
      manifest: {
        // These will be merged with/override public/manifest.json if both exist
        // Or, if manifest.json is not in public, these values will be used to generate one.
        // For now, let's assume public/manifest.json is primary.
        // name: 'Àríyò AI - Smart Naija AI',
        // short_name: 'Àríyò AI',
        // description: 'A smart Naija AI music player and chatbot with offline support',
        // theme_color: '#ff758c',
        // background_color: '#000000',
        // icons: [ // Paths should be relative to the public folder or absolute URLs
        //   { src: '/icons/Ariyo.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        //   { src: '/icons/Ariyo_AI.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        // ]
      }
    })
  ],
  build: {
    // Other build options
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // setupFiles: './src/test/setup.js', // Optional: if you need global setup for tests
  },
});
