'use strict';
const https  = require('https');
const http   = require('http');
const { JSDOM } = require('jsdom');
const fs     = require('fs');
const path   = require('path');

const ROOT = path.resolve(__dirname, '..');

// Shim DOMParser using jsdom so we can reuse the browser parsing logic
global.DOMParser = class {
  parseFromString(html) { return new JSDOM(html).window.document; }
};

/* ---- Parsers (mirrored from js/tournament.js) ---- */

const resolveHref = href =>
  href ? new URL(href, 'https://fabtcg.com').href : null;

const parseRoundsIndex = (html) => {
  const doc  = new DOMParser().parseFromString(html);
  const rows = Array.from(doc.querySelectorAll('table tbody tr'));
  return rows.reduce((acc, row) => {
    const nameCell    = row.querySelector('td.rounds');
    const pairingsLnk = row.querySelector('td.pairings a');
    if (!nameCell || !pairingsLnk) return acc;
    const resultsLnk = row.querySelector('td.results a');
    const pairingsUrl = resolveHref(pairingsLnk.getAttribute('href'));
    if (!pairingsUrl) return acc;
    acc.push({
      roundNum:    acc.length + 1,
      roundName:   nameCell.textContent.trim(),
      pairingsUrl,
      resultsUrl:  resolveHref(resultsLnk?.getAttribute('href')),
      hasResults:  !!resultsLnk,
    });
    return acc;
  }, []);
};

const extractMatchRow = (row) => {
  const p1El = row.querySelector('.player-details.player-left');
  const p2El = row.querySelector('.player-details.player-right');
  if (!p1El || !p2El) return null;
  const getName = el => {
    const strong = el.querySelector('.player-text strong');
    if (!strong) return '';
    const clone = strong.cloneNode(true);
    clone.querySelectorAll('i').forEach(i => i.remove());
    return clone.textContent.trim();
  };
  const getHero = el => el.querySelector('.player-text span')?.textContent.trim() ?? '';
  const p1Name = getName(p1El);
  const p2Name = getName(p2El);
  if (!p1Name || !p2Name) return null;
  return {
    p1Name, p2Name,
    p1Hero: getHero(p1El),
    p2Hero: getHero(p2El),
    p1Won: p1El.classList.contains('winner'),
    p2Won: p2El.classList.contains('winner'),
  };
};

const parseResultsPage = (html) => {
  const doc = new DOMParser().parseFromString(html);
  const matches = [];
  doc.querySelectorAll('tr.match-row').forEach(row => {
    const data = extractMatchRow(row);
    if (data) matches.push(data);
  });
  return matches;
};

const parsePairingsPage = (html) => {
  const doc = new DOMParser().parseFromString(html);
  const pairings = {};
  doc.querySelectorAll('tr.match-row').forEach(row => {
    const data = extractMatchRow(row);
    if (!data) return;
    pairings[data.p1Name] = { opponent: data.p2Name, opponentHero: data.p2Hero };
    pairings[data.p2Name] = { opponent: data.p1Name, opponentHero: data.p1Hero };
  });
  return pairings;
};

const buildStandings = (allRounds) => {
  const map = {};
  const get = (name, hero) => {
    if (!map[name]) map[name] = { name, hero, wins: 0, losses: 0, draws: 0, history: [] };
    return map[name];
  };
  allRounds.forEach(({ roundName, matches }) => {
    matches.forEach(({ p1Name, p1Hero, p2Name, p2Hero, p1Won, p2Won }) => {
      const p1   = get(p1Name, p1Hero);
      const p2   = get(p2Name, p2Hero);
      const draw = !p1Won && !p2Won;
      if (draw) {
        p1.draws++; p2.draws++;
        p1.history.push({ round: roundName, opponent: p2Name, opponentHero: p2Hero, result: 'draw' });
        p2.history.push({ round: roundName, opponent: p1Name, opponentHero: p1Hero, result: 'draw' });
      } else if (p1Won) {
        p1.wins++; p2.losses++;
        p1.history.push({ round: roundName, opponent: p2Name, opponentHero: p2Hero, result: 'win' });
        p2.history.push({ round: roundName, opponent: p1Name, opponentHero: p1Hero, result: 'loss' });
      } else {
        p2.wins++; p1.losses++;
        p1.history.push({ round: roundName, opponent: p2Name, opponentHero: p2Hero, result: 'loss' });
        p2.history.push({ round: roundName, opponent: p1Name, opponentHero: p1Hero, result: 'win' });
      }
    });
  });
  return Object.values(map).sort((a, b) =>
    b.wins !== a.wins ? b.wins - a.wins : a.losses - b.losses
  );
};

/* ---- HTTP fetch with redirect support ---- */

const fetchUrl = (url, redirects = 5) => new Promise((resolve, reject) => {
  if (redirects === 0) return reject(new Error('Too many redirects'));
  const parsed  = new URL(url);
  const lib     = parsed.protocol === 'https:' ? https : http;
  const options = {
    hostname: parsed.hostname,
    port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path:     parsed.pathname + parsed.search,
    headers: {
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  };
  lib.get(options, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      const next = new URL(res.headers.location, url).href;
      res.resume();
      return fetchUrl(next, redirects - 1).then(resolve).catch(reject);
    }
    if (res.statusCode === 404) { res.resume(); return reject(new Error('HTTP 404')); }
    if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
    let data = '';
    res.setEncoding('utf8');
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (/<title>[^<]*just a moment/i.test(data)) return reject(new Error('Cloudflare challenge'));
      resolve(data);
    });
  }).on('error', reject);
});

/* ---- Main ---- */

async function main() {
  const configPath   = path.join(ROOT, 'data', 'config.json');
  const standingsPath = path.join(ROOT, 'data', 'standings.json');

  // Allow slug override via CLI arg or env var
  const cliSlug = process.argv[2] || process.env.TOURNAMENT_SLUG || '';
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    config = { active: false, active_slug: '' };
  }

  const slug = cliSlug || config.active_slug;
  if (!slug) {
    console.log('No active tournament slug configured. Set active_slug in data/config.json or pass as argument.');
    process.exit(0);
  }
  if (!cliSlug && !config.active) {
    console.log('Tournament not marked active in data/config.json. Skipping.');
    process.exit(0);
  }

  console.log(`Fetching standings for: ${slug}`);

  // 1. Fetch coverage index
  const indexHtml = await fetchUrl(`https://fabtcg.com/coverage/${encodeURIComponent(slug)}/`);
  const rounds    = parseRoundsIndex(indexHtml);
  console.log(`Found ${rounds.length} round(s)`);

  if (!rounds.length) {
    console.log('No rounds found in index — HTML structure may have changed.');
    process.exit(1);
  }

  // 2. Fetch completed rounds and build standings
  const completedRounds = rounds.filter(r => r.hasResults);
  let standings = [];

  if (completedRounds.length) {
    const fetches = await Promise.allSettled(completedRounds.map(r => fetchUrl(r.resultsUrl)));
    const allRounds = completedRounds.map((r, i) => ({
      roundName: r.roundName,
      matches:   fetches[i].status === 'fulfilled' ? parseResultsPage(fetches[i].value) : [],
    }));
    standings = buildStandings(allRounds);
    console.log(`Standings built: ${standings.length} player(s) across ${completedRounds.length} completed round(s)`);
  }

  // 3. Fetch live pairings for the current round
  const liveRound    = rounds[rounds.length - 1];
  let liveMatches    = {};
  let liveRoundName  = '';
  const droppedPlayers = [];

  try {
    const pairingsHtml = await fetchUrl(liveRound.pairingsUrl);
    const allPairings  = parsePairingsPage(pairingsHtml);

    const resolvedSet = new Set();
    if (liveRound.hasResults) {
      const resultsHtml = await fetchUrl(liveRound.resultsUrl);
      parseResultsPage(resultsHtml).forEach(m => {
        resolvedSet.add(m.p1Name);
        resolvedSet.add(m.p2Name);
      });
    }

    Object.entries(allPairings).forEach(([player, pairing]) => {
      if (!resolvedSet.has(player)) liveMatches[player] = pairing;
    });
    liveRoundName = liveRound.roundName;

    if (Object.keys(liveMatches).length > 0) {
      const activeInRound = new Set([...Object.keys(allPairings), ...resolvedSet]);
      standings.forEach(p => {
        if (!activeInRound.has(p.name)) droppedPlayers.push(p.name);
      });
    }
    console.log(`Live round: ${liveRoundName} — ${Object.keys(liveMatches).length} match(es) in progress`);
  } catch (e) {
    console.log(`Pairings unavailable: ${e.message}`);
  }

  // 4. Save
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(standingsPath, JSON.stringify({
    slug,
    lastUpdated:  new Date().toISOString(),
    standings,
    liveMatches,
    liveRoundName,
    droppedPlayers,
  }, null, 2));
  console.log('Saved to data/standings.json');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
