# Converting Suno links to local assets

Use `scripts/convert-suno-to-local.js` to pull Suno-hosted audio into local files in small batches. The script accepts a text file that lists one Suno link per line (you can add comments with `#`).

## Example: convert 60 tracks safely
To avoid overwhelming Codex while converting many tracks, the script throttles work by batching downloads. For example, to process 60 tracks in batches of 20 with a 5 second pause between batches (about ~20 seconds of throttling time):

```bash
node scripts/convert-suno-to-local.js \
  --input ./data/suno-links.txt \
  --output ./data/suno-assets \
  --batch-size 20 \
  --batch-delay 5000
```

The manifest at `data/suno-manifest.json` is updated after every batch. Existing files are skipped to make repeated runs safe.

## Options
- `--input` (`-i`): path to the text file containing Suno links (required).
- `--output` (`-o`): directory where local `.mp3` files will be stored. Defaults to `data/suno-assets`.
- `--batch-size`: number of links to process per batch. Defaults to `20`.
- `--batch-delay`: delay in milliseconds between batches. Defaults to `5000` ms.
- `--manifest`: path to the manifest JSON file. Defaults to `data/suno-manifest.json`.

## Input file format
- One URL per line.
- Lines starting with `#` are ignored.
- Re-running the script skips already-downloaded files while keeping the manifest up to date.
