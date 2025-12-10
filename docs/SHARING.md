# Sharing payload formatting

The music and radio sharing flows now rely on a single helper, `formatMusicSharePayload`, to ensure consistent, title-first messaging across Web Share dialogs and QR codes.

## Formatting rules
- The heading line is always bolded and starts with the track or station title.
- The artist name is appended after an en dash when provided (`Title – Artist`).
- The URL is normalized to HTTPS and placed on its own line below the heading.
- The helper is reused for track, radio, and default app sharing so every surface matches.

## Examples
### Track share payload
- **Before:** `**Midnight Breeze**\nhttp://example.com/track` (artist not appended and URL could remain HTTP)
- **After:** `**Midnight Breeze – Omoluabi**\nhttps://example.com/track`

### Radio share payload
- **Before:** `**Omoluabi FM**\nhttp://radio.example.com/live` (HTTP URL could slip through)
- **After:** `**Omoluabi FM**\nhttps://radio.example.com/live`
