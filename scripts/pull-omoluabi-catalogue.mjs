import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const markdownPath = path.join(repoRoot, 'Omoluabi_Production_Catalogue.md');
const audioDir = path.join(repoRoot, 'Omoluabi_Production_Catalogue_Audio');
const dataDir = path.join(repoRoot, 'data');
const dataPath = path.join(dataDir, 'omoluabiProductionCatalogue.json');

const linkRegex = /\[([^\]]+)\]\((https:\/\/(?:suno\.com|cdn1\.suno\.ai)[^\s)]+)\)/g;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const slugify = (title) => {
  const normalized = title
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'track';
};

const ensureDirs = async () => {
  await fs.mkdir(audioDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });
};

const parseLinks = (markdown) => {
  const links = [];
  let match;
  while ((match = linkRegex.exec(markdown)) !== null) {
    links.push({ title: match[1].trim(), url: match[2] });
  }
  return links;
};

const downloadTrack = async (url, destination) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(destination, Buffer.from(arrayBuffer));
};

const updateMarkdownLinks = (markdown, replacements) => {
  let updated = markdown;
  for (const { url, localPath } of replacements) {
    const pattern = new RegExp(`\\(${escapeRegExp(url)}\\)`, 'g');
    updated = updated.replace(pattern, `(${localPath})`);
  }
  return updated;
};

const buildLocalPath = (filename) => `./${path.posix.join(path.basename(audioDir), filename)}`;

const main = async () => {
  const markdown = await fs.readFile(markdownPath, 'utf8');
  const links = parseLinks(markdown);

  if (links.length === 0) {
    console.log('No matching Suno links found.');
    return;
  }

  await ensureDirs();

  const catalogue = [];
  const replacements = [];

  for (const [index, link] of links.entries()) {
    const slug = slugify(link.title);
    const filename = `${String(index + 1).padStart(2, '0')}_${slug}.mp3`;
    const filePath = path.join(audioDir, filename);
    const localPath = buildLocalPath(filename);

    console.log(`Downloading [${link.title}] from ${link.url}`);
    await downloadTrack(link.url, filePath);

    catalogue.push({
      id: index + 1,
      title: link.title,
      file: path.posix.join(path.basename(audioDir), filename),
      sourceUrl: link.url,
    });

    replacements.push({ url: link.url, localPath });
  }

  const updatedMarkdown = updateMarkdownLinks(markdown, replacements);

  await fs.writeFile(dataPath, `${JSON.stringify(catalogue, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, updatedMarkdown, 'utf8');

  console.log(`Saved ${links.length} tracks to ${audioDir}`);
  console.log(`Catalogue data written to ${dataPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
