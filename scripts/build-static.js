const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, 'dist');

const EXCLUDED_ENTRIES = new Set([
  'node_modules',
  'dist',
  '.git',
  '.github',
  '.vscode',
  'tests',
  '.DS_Store',
  'package-lock.json',
]);

function cleanDist() {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });
}

function shouldSkip(entryName) {
  return EXCLUDED_ENTRIES.has(entryName);
}

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      if (shouldSkip(entry.name)) continue;
      const entrySrc = path.join(src, entry.name);
      const entryDest = path.join(dest, entry.name);
      copyRecursive(entrySrc, entryDest);
    }
  } else if (stats.isFile()) {
    fs.copyFileSync(src, dest);
  }
}

function build() {
  console.log('Preparing static build...');
  cleanDist();
  const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (shouldSkip(entry.name)) continue;
    const srcPath = path.join(projectRoot, entry.name);
    const destPath = path.join(distDir, entry.name);
    copyRecursive(srcPath, destPath);
  }
  console.log('Build complete: static files copied to dist/.');
}

build();
