# Media storage migration

This project now expects track playback URLs to come from the `/api/tracks` manifest rather than local MP3 files in the repo. Use object storage + CDN for media delivery.

## Recommended storage stack

- **Object storage:** Amazon S3, Cloudflare R2, or Backblaze B2.
- **CDN:** CloudFront, Cloudflare, or Fastly in front of your bucket.

## Folder layout

```
media/
  albums/
    kindness/
      a-very-good-bad-guy-v3.mp3
      dem-wan-shut-me-up.mp3
  singles/
  artwork/
```

## Upload workflow

1. Export audio masters as MP3 (or preferred streaming format).
2. Upload to your bucket using the folder naming convention above.
3. Configure a CDN in front of the bucket for cacheable playback URLs.

## Backend mapping

`/api/tracks` is built from the current media catalog and expects a base URL in:

```
MEDIA_BASE_URL=https://cdn.example.com/media
```

The API maps existing track paths to full URLs and returns a manifest like:

```json
[
  {
    "id": "kindness-0",
    "title": "A Very Good Bad Guy v3",
    "artist": "Omoluabi",
    "artwork": "https://cdn.example.com/media/artwork/kindness.jpg",
    "url": "https://cdn.example.com/media/albums/kindness/a-very-good-bad-guy-v3.mp3"
  }
]
```

## Local development

For local testing you can point to a local static file host:

```
MEDIA_BASE_URL=http://localhost:4173/media
```

Keep local media in an untracked `media/` folder so it never gets committed to Git.
