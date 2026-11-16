'use strict';
/*
 * Imports the results of FINISHED tournaments into the site, from their fabtcg.com coverage
 * pages, for events the tracker didn't follow live (e.g. Calling Toulouse, March 2026).
 * The standings then count for the members' stats and automatic achievements.
 *
 *   PowerShell:  $env:API_KEY="<admin API key>"; node scripts/import-coverage.js calling-toulouse calling-valencia
 *   bash:        API_KEY=<admin API key> node scripts/import-coverage.js calling-toulouse
 *   --dry-run    builds and summarizes, uploads nothing (no key needed)
 *   BAF_API      other site than https://bafbordeaux.fr (e.g. http://127.0.0.1:3001 on the VPS)
 *
 * The slug is the end of the coverage URL: https://fabtcg.com/coverage/<slug>/
 * Uploads with notify: false, so nothing is posted to Discord for these old results.
 * Uses the parsers of scripts/fetch-standings.js (needs `npm install` in scripts/).
 */
const { fetchUrl, parseRoundsIndex, parseResultsPage, buildStandings } = require('./fetch-standings');

const API = (process.env.BAF_API || 'https://bafbordeaux.fr').replace(/\/$/, '');
const KEY = process.env.API_KEY || '';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const slugs = args.filter((a) => !a.startsWith('--'));

const importOne = async (slug) => {
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error('invalid slug (expected e.g. calling-toulouse)');
  const rounds = parseRoundsIndex(await fetchUrl(`https://fabtcg.com/coverage/${slug}/`));
  const done = rounds.filter((r) => r.hasResults);
  if (!done.length) throw new Error('no round with results on the coverage page');
  if (done.length < rounds.length) console.log(`  warning: ${rounds.length - done.length} round(s) without results yet — is the event finished?`);

  // One round at a time: gentle with fabtcg.com, and a failed page stops the import
  const allRounds = [];
  for (const r of done) {
    allRounds.push({ roundName: r.roundName, matches: parseResultsPage(await fetchUrl(r.resultsUrl)) });
    process.stdout.write('.');
  }
  process.stdout.write('\n');
  const standings = buildStandings(allRounds, '');
  console.log(`  ${standings.length} players, ${done.length} rounds`);
  if (dryRun) return;

  const res = await fetch(`${API}/api/standings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      slug, standings, liveMatches: {}, liveRoundName: '', droppedPlayers: [],
      lastUpdated: new Date().toISOString(), notify: false,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`upload refused: HTTP ${res.status} ${body.error || ''}`);
  console.log(`  uploaded to ${API} (${body.players} players)`);
};

(async () => {
  if (!slugs.length) { console.log('Usage: node scripts/import-coverage.js <slug> [<slug>...] [--dry-run]'); process.exit(1); }
  if (!dryRun && !KEY) { console.log('Set API_KEY (the admin API key) first, or use --dry-run.'); process.exit(1); }
  let failed = 0;
  for (const slug of slugs) {
    console.log(`${slug}:`);
    try { await importOne(slug); } catch (err) { failed++; console.log(`  FAILED: ${err.message}`); }
  }
  if (!dryRun && failed < slugs.length) console.log('Achievements of linked members are recalculated about 5 minutes after the upload.');
  process.exit(failed ? 1 : 0);
})();
