#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_ALBUM_FILE = 'data/albums.json';
const DEFAULT_ALBUM_DIR = 'data/albums';

// Manual overrides (highest priority).
// Add known or planned releases here.
const releaseYearOverrides = {
  'OfficialPaulInspires Spoken Word Series': 2026,
  'Spoken Word Series': 2026
};

const args = new Set(process.argv.slice(2));
const inputFlagIndex = process.argv.indexOf('--input');
const overridesFlagIndex = process.argv.indexOf('--overrides');
const inputPath = inputFlagIndex > -1 ? process.argv[inputFlagIndex + 1] : null;
const overridesPath = overridesFlagIndex > -1 ? process.argv[overridesFlagIndex + 1] : null;
const dryRun = args.has('--dry-run');
const verbose = args.has('--verbose');

const currentYear = new Date().getUTCFullYear();
const historicalCutoffYear = currentYear - 1;

function logInfo(...messages) {
  console.log(...messages);
}

function logVerbose(...messages) {
  if (verbose) {
    console.log(...messages);
  }
}

function logWarning(...messages) {
  console.warn(...messages);
}

function runGit(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    logVerbose('[git] command failed:', command);
    logVerbose(error?.message || error);
    return null;
  }
}

function isGitRepo() {
  return runGit('git rev-parse --is-inside-work-tree') === 'true';
}

function resolveInputPath() {
  if (inputPath) return inputPath;
  if (fs.existsSync(DEFAULT_ALBUM_FILE)) return DEFAULT_ALBUM_FILE;
  if (fs.existsSync(DEFAULT_ALBUM_DIR)) return DEFAULT_ALBUM_DIR;
  return null;
}

function loadOverrides() {
  const overrides = { ...releaseYearOverrides };
  if (!overridesPath) return overrides;
  try {
    const raw = fs.readFileSync(overridesPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      Object.assign(overrides, parsed);
    } else {
      logWarning(`[overrides] ignored non-object overrides file: ${overridesPath}`);
    }
  } catch (error) {
    logWarning(`[overrides] failed to read overrides from ${overridesPath}: ${error?.message || error}`);
  }
  return overrides;
}

function normalizeGitPath(value) {
  return value?.replace(/\\/g, '/');
}

function getAddedCommitInfo(filePath) {
  if (!filePath || !isGitRepo()) return null;
  const normalized = normalizeGitPath(filePath);
  if (!normalized) return null;
  const format = '%aI%x1f%B%x1e';
  const output = runGit(`git log --diff-filter=A --follow --reverse --format=${format} -- "${normalized}"`);
  if (!output) return null;
  const entry = output.split('\x1e').find(Boolean);
  if (!entry) return null;
  const [date, body] = entry.split('\x1f');
  return { date, body };
}

function getCommitMessagesForFile(filePath) {
  if (!filePath || !isGitRepo()) return [];
  const normalized = normalizeGitPath(filePath);
  const output = runGit(`git log --format=%B%x1e -- "${normalized}"`);
  if (!output) return [];
  return output
    .split('\x1e')
    .map(message => message.trim())
    .filter(Boolean);
}

function parseYearFromText(text) {
  if (!text) return null;
  const patterns = [
    /release(?:-|\s*)year\s*[:=]?\s*(20\d{2})/i,
    /release\s*:\s*(20\d{2})/i,
    /\[(20\d{2})\]/,
    /(?:added album|edition|release)\D*(20\d{2})/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return Number.parseInt(match[1], 10);
  }
  const fallback = text.match(/\b(20\d{2})\b/);
  return fallback?.[1] ? Number.parseInt(fallback[1], 10) : null;
}

function parseYearFromCommitMessage(filePath) {
  const info = getAddedCommitInfo(filePath);
  if (!info?.body) return null;
  return parseYearFromText(info.body);
}

function parseYearFromHistoryForAlbum({ filePath, albumName, albumId }) {
  const messages = getCommitMessagesForFile(filePath);
  if (!messages.length) return null;
  const needles = [albumName, albumId].filter(Boolean).map(value => value.toLowerCase());
  for (const message of messages) {
    const lower = message.toLowerCase();
    if (needles.length && !needles.some(needle => lower.includes(needle))) {
      continue;
    }
    const parsed = parseYearFromText(message);
    if (parsed) return parsed;
  }
  return null;
}

function parseYearFromGitAddedDate(filePath) {
  const info = getAddedCommitInfo(filePath);
  if (!info?.date) return null;
  const parsed = new Date(info.date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getUTCFullYear();
}

function determineReleaseYear({
  albumName,
  albumId,
  filePath,
  overrides,
  useHistorySearch
}) {
  if (overrides[albumName] != null) {
    const overrideYear = overrides[albumName];
    logInfo(`[${albumName}] \u2192 using manual override \u2192 ${overrideYear}`);
    return overrideYear;
  }
  if (overrides[albumId] != null) {
    const overrideYear = overrides[albumId];
    logInfo(`[${albumName}] \u2192 using manual override (id) \u2192 ${overrideYear}`);
    return overrideYear;
  }

  const commitMessageYear = useHistorySearch
    ? parseYearFromHistoryForAlbum({ filePath, albumName, albumId })
    : parseYearFromCommitMessage(filePath);
  if (commitMessageYear) {
    logInfo(`[${albumName}] \u2192 parsed from commit message \u2192 ${commitMessageYear}`);
    return commitMessageYear;
  }

  const addedYear = parseYearFromGitAddedDate(filePath);
  if (addedYear != null) {
    if (addedYear <= historicalCutoffYear) {
      logInfo(`[${albumName}] \u2192 git addition year ${addedYear} \u2192 accepted (historical)`);
      return addedYear;
    }
    logInfo(
      `[${albumName}] \u2192 git addition year ${addedYear} \u2192 SKIPPED (not historical) \u2192 no value set`
    );
  } else {
    logInfo(`[${albumName}] \u2192 git addition year unavailable \u2192 no value set`);
  }

  logWarning(`[${albumName}] \u2192 no reliable release year found \u2192 setting releaseYear to null`);
  return null;
}

function updateAlbumRecord({ album, albumName, albumId, filePath, overrides, useHistorySearch }) {
  const nextYear = determineReleaseYear({
    albumName,
    albumId,
    filePath,
    overrides,
    useHistorySearch
  });
  album.releaseYear = nextYear;
}

function loadAlbumFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeAlbumFile(filePath, payload) {
  const json = JSON.stringify(payload, null, 2);
  if (dryRun) {
    logInfo(`[dry-run] ${filePath}`);
    logInfo(json);
    return;
  }
  fs.writeFileSync(filePath, `${json}\n`, 'utf8');
  logInfo(`Updated ${filePath}`);
}

function updateAlbumsJson(filePath, overrides) {
  const payload = loadAlbumFile(filePath);
  const useHistorySearch = true;
  if (Array.isArray(payload?.albums)) {
    payload.albums.forEach(album => {
      const albumName = album.title || album.id || 'Unknown Album';
      updateAlbumRecord({
        album,
        albumName,
        albumId: album.id,
        filePath,
        overrides,
        useHistorySearch
      });
    });
  } else if (payload && typeof payload === 'object') {
    Object.entries(payload).forEach(([key, album]) => {
      if (!album || typeof album !== 'object') return;
      const albumName = album.title || key;
      updateAlbumRecord({
        album,
        albumName,
        albumId: album.id || key,
        filePath,
        overrides,
        useHistorySearch
      });
    });
  } else {
    logWarning(`[albums.json] unsupported structure in ${filePath}`);
    return;
  }
  writeAlbumFile(filePath, payload);
}

function updateAlbumDirectory(dirPath, overrides) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .forEach(entry => {
      const filePath = path.join(dirPath, entry.name);
      const payload = loadAlbumFile(filePath);
      const albumName = payload?.title || payload?.name || payload?.id || entry.name;
      updateAlbumRecord({
        album: payload,
        albumName,
        albumId: payload?.id,
        filePath,
        overrides,
        useHistorySearch: false
      });
      writeAlbumFile(filePath, payload);
    });
}

function main() {
  const resolvedPath = resolveInputPath();
  if (!resolvedPath) {
    logWarning('No album input found. Provide --input <path> or ensure data/albums.json exists.');
    process.exitCode = 1;
    return;
  }
  if (!isGitRepo()) {
    logWarning('[git] not inside a git repository, commit-based checks will be skipped.');
  }
  const overrides = loadOverrides();
  const stats = fs.statSync(resolvedPath);
  if (stats.isDirectory()) {
    updateAlbumDirectory(resolvedPath, overrides);
  } else {
    updateAlbumsJson(resolvedPath, overrides);
  }
}

main();
