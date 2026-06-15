'use strict';
const { execSync, spawnSync } = require('child_process');
const path = require('path');

const ROOT         = path.resolve(__dirname, '..');
const INTERVAL_MIN = 5;

const slug = process.argv[2];
if (!slug) {
  console.log('Usage: node scripts/watch-tournament.js <slug>');
  console.log('Example: node scripts/watch-tournament.js calling-valencia');
  process.exit(1);
}

const git = (cmd) => execSync(`git -C "${ROOT}" ${cmd}`, { encoding: 'utf8' }).trim();

const run = () => {
  const time = new Date().toLocaleTimeString('fr-FR');
  console.log(`\n[${time}] Fetching ${slug}…`);

  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, 'fetch-standings-puppeteer.js'), slug],
    { cwd: ROOT, stdio: 'inherit' }
  );

  if (result.status !== 0) {
    console.log('Fetch failed — will retry next cycle.');
    return;
  }

  const diff = git('diff data/standings.json data/config.json');
  if (!diff) {
    console.log('No changes.');
    return;
  }

  try {
    git('add data/standings.json data/config.json');
    git('commit -m "chore(data): update standings [skip ci]"');
    git('fetch origin main');
    git('rebase origin/main');
    git('push origin main');
    console.log('Pushed.');
  } catch (err) {
    console.log(`Git error: ${err.message}`);
  }
};

console.log(`Watching "${slug}" — updating every ${INTERVAL_MIN} minutes. Ctrl+C to stop.\n`);
run();
setInterval(run, INTERVAL_MIN * 60 * 1000);
