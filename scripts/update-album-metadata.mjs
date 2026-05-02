#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_OUTPUT = 'data/albums.json';
const SPOKEN_WORD_TITLE = 'OfficialPaulInspires Spoken Word Series';
const SPOKEN_WORD_RELEASE_YEAR = 2026;
const SPOKEN_WORD_FALLBACK_DATE = '2026-02-15T12:00:00Z';

const args = new Set(process.argv.slice(2));
const outputFlagIndex = process.argv.indexOf('--output');
const outputPath = outputFlagIndex > -1 ? process.argv[outputFlagIndex + 1] : DEFAULT_OUTPUT;
const dryRun = args.has('--dry-run');
const verbose = args.has('--verbose');

function log(...messages) {
  if (verbose) {
    console.log('[metadata]', ...messages);
  }
}

function logError(...messages) {
  console.error('[metadata]', ...messages);
}

function runGit(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    logError('Git command failed:', command);
    if (verbose) {
      logError(error?.message || error);
    }
    return null;
  }
}

function ensureRepo() {
  const result = runGit('git rev-parse --is-inside-work-tree');
  return result === 'true';
}

/**
 * Uses git log to find the first commit where a file/dir was added.
 * --diff-filter=A limits to additions, --follow tracks renames,
 * and --format=%aI returns the author date in strict ISO format.
 */
function getFirstAddedDate(targetPath) {
  if (!targetPath) return null;
  const normalized = targetPath.replace(/\\/g, '/');
  const gitCommand = `git log --diff-filter=A --follow --format=%aI --reverse -- "${normalized}"`;
  const output = runGit(gitCommand);
  if (!output) return null;
  const firstLine = output.split('\n').find(Boolean);
  return firstLine || null;
}

function toIsoString(dateLike) {
  if (!dateLike) return null;
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function getYearFromDate(dateLike) {
  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getUTCFullYear();
}

function isRemotePath(value) {
  return /^https?:\/\//i.test(value);
}

function resolveFallbackDate(isSpokenWord) {
  return isSpokenWord ? SPOKEN_WORD_FALLBACK_DATE : new Date().toISOString();
}

function resolveAddedDate({ filePath, isSpokenWord }) {
  if (!filePath || isRemotePath(filePath)) {
    return resolveFallbackDate(isSpokenWord);
  }
  const gitDate = getFirstAddedDate(filePath);
  return toIsoString(gitDate) || resolveFallbackDate(isSpokenWord);
}

const albumInputs = [
  {
    id: 'kindness',
    title: 'Kindness',
    description: 'Community-rooted Afrobeats and storytelling snapshots from Lagos and Port Harcourt.',
    genre: 'Afrobeats',
    curator: 'Àríyò AI',
    sourcePath: 'Kindness Cover Art.jpg',
    tracks: [
      {
        id: 'a-very-good-bad-guy-v3',
        title: 'A Very Good Bad Guy v3',
        description: 'Opening reflections on resilience and streetwise grit.',
        durationSeconds: null,
        filePath: 'A Very Good Bad Guy v3.mp3',
      },
      {
        id: 'dem-wan-shut-me-up',
        title: 'Dem Wan Shut Me Up',
        description: 'A pulsing anthem about speaking truth in public spaces.',
        durationSeconds: null,
        filePath: 'Dem Wan Shut Me Up.mp3',
      },
      {
        id: 'efcc',
        title: 'EFCC',
        description: 'Noir-styled commentary on the hustle and accountability.',
        durationSeconds: null,
        filePath: 'EFCC.mp3',
      },
    ],
  },
  {
    id: 'street-sense',
    title: 'Street Sense',
    description: 'Naija city tales and everyday wit for the open road.',
    genre: 'Afrobeats',
    curator: 'Àríyò AI',
    sourcePath: 'Street_Sense_Album_Cover.jpg',
    tracks: [
      {
        id: 'na-we-dey',
        title: 'Na We Dey',
        description: 'Collective pride anthem with Lagos traffic energy.',
        durationSeconds: null,
        filePath: 'Na We Dey.mp3',
      },
      {
        id: 'street-sense',
        title: 'Street Sense',
        description: 'Signature track capturing the album vibe.',
        durationSeconds: null,
        filePath: 'Street Sense.mp3',
      },
    ],
  },
  {
    id: 'spoken-word-series',
    title: SPOKEN_WORD_TITLE,
    description: 'OfficialPaulInspires spoken word narratives about family, leadership, and healing.',
    genre: 'Spoken Word',
    curator: 'OfficialPaulInspires',
    sourcePath: 'SpokenWordSeries_Logo.png',
    tracks: [
      {
        id: 'parking-lot-therapy',
        title: 'Parking Lot Therapy',
        description: 'A quiet conversation turned reflection on growth.',
        durationSeconds: null,
        filePath: 'https://cdn1.suno.ai/c366aac4-5bf4-4137-a021-65de1812af6e.mp3',
      },
      {
        id: 'when-a-good-man-walks-away',
        title: 'When A Good Man Walks Away',
        description: 'Stories of responsibility and the cost of absence.',
        durationSeconds: null,
        filePath: 'https://cdn1.suno.ai/350fdbb1-c55d-4ee4-a7f6-5a3848fa3efd.mp3',
      },
      {
        id: 'disrupted-career',
        title: 'Disrupted Career',
        description: 'A spoken narrative on pivots and resilience.',
        durationSeconds: null,
        filePath: 'https://cdn1.suno.ai/ab730851-6c85-49e8-9816-bb26177e289d.mp3',
      },
    ],
  },
];

function buildAlbumMetadata(album) {
  const isSpokenWord = album.title === SPOKEN_WORD_TITLE;
  const albumAddedDate = resolveAddedDate({ filePath: album.sourcePath, isSpokenWord });
  const releaseYear = isSpokenWord
    ? SPOKEN_WORD_RELEASE_YEAR
    : getYearFromDate(albumAddedDate) || new Date().getUTCFullYear();

  const tracks = album.tracks.map((track) => {
    const addedDate = resolveAddedDate({ filePath: track.filePath, isSpokenWord });
    return {
      id: track.id,
      title: track.title,
      description: track.description,
      durationSeconds: track.durationSeconds,
      addedDate,
      filePath: track.filePath,
    };
  });

  return {
    id: album.id,
    title: album.title,
    description: album.description,
    genre: album.genre,
    curator: album.curator,
    releaseYear,
    addedDate: albumAddedDate,
    tracks,
  };
}

function writeOutput(payload) {
  const outputFile = outputPath ? path.resolve(outputPath) : null;
  const json = JSON.stringify(payload, null, 2);

  if (dryRun || !outputFile) {
    console.log(json);
    return;
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${json}\n`, 'utf8');
  console.log(`Metadata written to ${outputFile}`);
}

function main() {
  if (!ensureRepo()) {
    logError('Not inside a git repository. Falling back to current dates.');
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    albums: albumInputs.map(buildAlbumMetadata),
  };

  writeOutput(payload);
}

main();
