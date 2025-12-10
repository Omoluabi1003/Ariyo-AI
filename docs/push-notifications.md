# Push notifications for Àríyò AI

This project now ships a serverless-friendly push pipeline for the PWA.

## Environment variables
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — generated with `npx web-push generate-vapid-keys`.
- `VAPID_SUBJECT` — contact email or URL used in VAPID claims (e.g. `mailto:alerts@example.com`).
- `NOTIFICATION_API_TOKEN` — bearer token required for `/api/notify/new-drop`.
- `PUSH_SUBSCRIPTIONS_PATH` *(optional)* — override where subscriptions are stored. Defaults to `data/push-subscriptions.json`.

## Generating VAPID keys
```bash
npx web-push generate-vapid-keys
# Set the resulting public/private keys in your environment (e.g. Vercel project vars)
```

## Client subscription flow
1. Service worker registers automatically via `scripts/sw-controller.js`.
2. Users click **Enable notifications** on `index.html` or inside `main.html`.
3. `scripts/push-notifications.js` requests permission, subscribes with the VAPID public key from `/api/push/public-key`,
   and POSTs the `PushSubscription` JSON to `/api/push/subscribe` for storage.

## Triggering notifications
Use the authenticated endpoint to broadcast the latest drop:
```bash
curl -X POST https://your-domain/api/notify/new-drop \
  -H "Authorization: Bearer $NOTIFICATION_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Drop on Àríyò AI","body":"A fresh track just landed. Tap to listen.","url":"/new-drop"}'
```

## Example payloads
```json
{"title":"New Drop on Àríyò AI","body":"A fresh track just landed. Tap to listen.","url":"/new-drop"}
{"title":"Fresh Content Alert","body":"Something new is waiting for you inside the app.","url":"/latest"}
```

## Notes
- The service worker displays notifications with icon, badge, and click-through URL, opening or focusing an existing tab when possible.
- Replace the file-based subscription store with a database for production deployments.
- Push subscriptions require HTTPS (or localhost) for service worker registration.
