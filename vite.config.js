import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      filename: 'sw.js',
      includeAssets: ['icons/Ariyo.png'],
      manifest: {
        name: 'Àríyò AI',
        short_name: 'Àríyò AI',
        theme_color: '#8E5BFF',
        background_color: '#0b0b0f',
        display: 'standalone',
        icons: [
          {
            src: 'icons/Ariyo.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        navigateFallback: '/offline.html',
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff,woff2,ttf}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => ['script', 'style', 'image', 'font'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'asset-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'audio' && url.pathname.toLowerCase().endsWith('.mp3'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname.includes('stream') || url.pathname.includes('stream'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'stream-cache',
              networkTimeoutSeconds: 6,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    outDir: 'dist',
  },
});
