module.exports = {
  globDirectory: '.',
  globPatterns: [
    '**/*.{html,css,js,json,png,jpg,jpeg,svg}',
    'offline-audio.mp3'
  ],
  globIgnores: [
    'node_modules/**/*',
    'workbox-config.js',
    'package-lock.json',
    'package.json'
  ],
  swDest: 'service-worker.js',
  runtimeCaching: [
    {
      urlPattern: /\\.mp3$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'audio-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
      },
    },
  ],
};
