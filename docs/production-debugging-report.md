# Production debugging artifacts (ariyo-ai.vercel.app)

## Playwright automation snapshot (Chromium + WebKit)
Captured console errors and failed requests during automated load, launch click-through, and Music/Stories/Games navigation.

```json
{
  "chromium": {
    "consoleLogs": [
      "[error] Failed to load resource: net::ERR_NAME_NOT_RESOLVED",
      "[error] User tracking failed TypeError: Failed to fetch\n    at initUserTracking (https://ariyo-ai.vercel.app/user-tracking.js:11:24)\n    at https://ariyo-ai.vercel.app/scripts/deferred-init.js:49:51"
    ],
    "pageErrors": [
      "gsap is not defined"
    ],
    "failedRequests": [
      {
        "url": "https://cdn.jsdelivr.net/npm/@motionone/dom/dist/motion.min.js",
        "failure": "net::ERR_BLOCKED_BY_ORB",
        "method": "GET"
      },
      {
        "url": "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        "failure": "net::ERR_ABORTED",
        "method": "GET"
      },
      {
        "url": "https://api.countapi.xyz/hit/ariyo-ai/visits",
        "failure": "net::ERR_NAME_NOT_RESOLVED",
        "method": "GET"
      }
    ],
    "manifest": "manifest.json",
    "serviceWorker": true
  },
  "webkit": {
    "consoleLogs": [
      "[error] Failed to load resource: the server responded with a status of 404 (Not Found)",
      "[error] Refused to execute https://cdn.jsdelivr.net/npm/@motionone/dom/dist/motion.min.js as script because \"X-Content-Type-Options: nosniff\" was given and its Content-Type is not a script MIME type.",
      "[error] Failed to load resource: Error resolving \u201capi.countapi.xyz\u201d: Temporary failure in name resolution",
      "[error] User tracking failed TypeError: Load failed"
    ],
    "pageErrors": [
      "Can't find variable: gsap"
    ],
    "failedRequests": [
      {
        "url": "https://cdn.jsdelivr.net/npm/@motionone/dom/dist/motion.min.js",
        "failure": "Load request cancelled",
        "method": "GET"
      },
      {
        "url": "https://api.countapi.xyz/hit/ariyo-ai/visits",
        "failure": "Error resolving \u201capi.countapi.xyz\u201d: Temporary failure in name resolution",
        "method": "GET"
      }
    ],
    "manifest": "manifest.json",
    "serviceWorker": true
  }
}
```

## Lighthouse execution notes
Lighthouse could not run because Chromium is missing shared library dependencies in the container.

```
/root/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome: error while loading shared libraries: libatk-1.0.so.0: cannot open shared object file: No such file or directory
```
