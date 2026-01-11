const { OMOLUABI_TRACKS } = require('./omoluabi-catalogue');

const missing = OMOLUABI_TRACKS.filter(track => !track || !track.releaseYear);

if (missing.length) {
  console.warn(`Release year missing for ${missing.length} Omoluabi catalogue track(s):`);
  missing.forEach(track => {
    console.warn(`- ${track.title || track.slug || 'Unknown track'}`);
  });
  if (process.argv.includes('--strict')) {
    process.exitCode = 1;
  }
} else {
  console.log('All Omoluabi catalogue tracks include releaseYear values.');
}
