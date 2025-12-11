const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_BATCH_DELAY_MS = 5000;
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'data', 'suno-assets');
const DEFAULT_MANIFEST = path.join(process.cwd(), 'data', 'suno-manifest.json');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: null,
    output: DEFAULT_OUTPUT_DIR,
    batchSize: DEFAULT_BATCH_SIZE,
    batchDelay: DEFAULT_BATCH_DELAY_MS,
    manifest: DEFAULT_MANIFEST
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--input':
      case '-i':
        options.input = next;
        i += 1;
        break;
      case '--output':
      case '-o':
        options.output = path.resolve(next);
        i += 1;
        break;
      case '--batch-size':
        options.batchSize = Number(next) || DEFAULT_BATCH_SIZE;
        i += 1;
        break;
      case '--batch-delay':
        options.batchDelay = Number(next) || DEFAULT_BATCH_DELAY_MS;
        i += 1;
        break;
      case '--manifest':
        options.manifest = path.resolve(next);
        i += 1;
        break;
      default:
        break;
    }
  }

  if (!options.input) {
    console.error('Usage: node scripts/convert-suno-to-local.js --input <links.txt> [--output <dir>]');
    process.exit(1);
  }

  return options;
}

function readLinks(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destination);
    const request = https.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 400) {
        reject(new Error(`Request failed with status ${response.statusCode}`));
        response.resume();
        return;
      }

      response.pipe(fileStream);
    });

    request.on('error', (error) => {
      reject(error);
    });

    fileStream.on('finish', () => {
      fileStream.close(() => resolve(destination));
    });

    fileStream.on('error', (error) => {
      reject(error);
    });
  });
}

function createFileName(url, existingNames) {
  const urlObj = new URL(url);
  const baseName = path.basename(urlObj.pathname) || `suno-${Date.now()}`;
  const normalized = baseName.includes('.') ? baseName : `${baseName}.mp3`;

  if (!existingNames.has(normalized)) {
    existingNames.add(normalized);
    return normalized;
  }

  let suffix = 1;
  let candidate = normalized;
  const [name, ext] = normalized.split(/(?=\.[^\.]+$)/);

  while (existingNames.has(candidate)) {
    candidate = `${name}-${suffix}${ext || ''}`;
    suffix += 1;
  }

  existingNames.add(candidate);
  return candidate;
}

async function processBatch(batch, options, existingNames, manifest) {
  for (const link of batch) {
    try {
      const fileName = createFileName(link, existingNames);
      const filePath = path.join(options.output, fileName);

      if (fs.existsSync(filePath)) {
        console.log(`[skip] Already downloaded: ${fileName}`);
        manifest[link] = path.relative(process.cwd(), filePath);
        continue;
      }

      console.log(`[download] ${link}`);
      await downloadFile(link, filePath);
      manifest[link] = path.relative(process.cwd(), filePath);
      console.log(`[saved] ${fileName}`);
    } catch (error) {
      console.error(`[error] Failed to download ${link}: ${error.message}`);
    }
  }
}

async function main() {
  const options = parseArgs();
  const links = readLinks(options.input);

  if (!links.length) {
    console.warn('No links found in input file.');
    return;
  }

  ensureDir(options.output);
  const manifest = fs.existsSync(options.manifest)
    ? JSON.parse(fs.readFileSync(options.manifest, 'utf8'))
    : {};
  const existingNames = new Set(fs.readdirSync(options.output, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name));

  console.log(`Processing ${links.length} link(s) in batches of ${options.batchSize}.`);

  for (let i = 0; i < links.length; i += options.batchSize) {
    const batch = links.slice(i, i + options.batchSize);
    console.log(`\nStarting batch ${i / options.batchSize + 1} (${batch.length} item(s)).`);
    await processBatch(batch, options, existingNames, manifest);

    fs.writeFileSync(options.manifest, JSON.stringify(manifest, null, 2));
    console.log(`Batch complete. Manifest saved to ${options.manifest}.`);

    if (i + options.batchSize < links.length) {
      console.log(`Waiting ${options.batchDelay}ms before next batch...`);
      await wait(options.batchDelay);
    }
  }

  console.log('\nAll batches finished.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
