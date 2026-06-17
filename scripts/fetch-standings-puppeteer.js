'use strict';
const puppeteer      = require('puppeteer-extra');
const StealthPlugin  = require('puppeteer-extra-plugin-stealth');
const { JSDOM }      = require('jsdom');
puppeteer.use(StealthPlugin());
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

global.DOMParser = class {
  parseFromString(html) { return new JSDOM(html).window.document; }
};

/* ---- Parsers (same as fetch-standings.js) ---- */

const resolveHref = href =>
  href ? new URL(href, 'https://fabtcg.com').href : null;

const parseRoundsIndex = (html) => {
  const doc  = new DOMParser().parseFromString(html);
  const rows = Array.from(doc.querySelectorAll('table tbody tr'));
  return rows.reduce((acc, row) => {
    const nameCell    = row.querySelector('td.rounds');
    const pairingsLnk = row.querySelector('td.pairings a');
    if (!nameCell || !pairingsLnk) return acc;
    const resultsLnk  = row.querySelector('td.results a');
    const pairingsUrl = resolveHref(pairingsLnk.getAttribute('href'));
    if (!pairingsUrl) return acc;
    acc.push({
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
    p1Hero: getHero(p1El), p2Hero: getHero(p2El),
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

/* ---- Browser fetch ---- */

const fetchPage = async (browser, url) => {
  const page = await browser.newPage();
  try {
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' });
    const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
    const html = await page.content();
    if (/<title>[^<]*just a moment/i.test(html)) throw new Error('Cloudflare challenge — try again in a few seconds');
    return html;
  } finally {
    await page.close();
  }
};

/* ---- Main ---- */

async function main() {
  const configPath    = path.join(ROOT, 'data', 'config.json');
  const standingsPath = path.join(ROOT, 'data', 'standings.json');

  const cliSlug = process.argv[2] || process.env.TOURNAMENT_SLUG || '';
  let config;
  try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch { config = { active: false, active_slug: '' }; }

  const slug = cliSlug || config.active_slug;
  if (!slug) {
    console.log('Usage: node fetch-standings-puppeteer.js <slug>');
    process.exit(0);
  }

  console.log(`Fetching standings for: ${slug}`);
  console.log('Launching browser…');

  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    (process.env.LOCALAPPDATA || '') + '\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Chromium\\Application\\chromium.exe',
  ];
  const executablePath = chromePaths.find(p => fs.existsSync(p)) || undefined;
  if (executablePath) console.log(`Using Chrome: ${executablePath}`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const fetchUrl = (url) => fetchPage(browser, url);

    const indexHtml = await fetchUrl(`https://fabtcg.com/coverage/${encodeURIComponent(slug)}/`);
    const rounds    = parseRoundsIndex(indexHtml);
    console.log(`Found ${rounds.length} round(s)`);
    if (!rounds.length) { console.log('No rounds found.'); process.exit(1); }

    const completedRounds = rounds.filter(r => r.hasResults);
    let standings = [];

    if (completedRounds.length) {
      const allRounds = [];
      for (const r of completedRounds) {
        try {
          const html = await fetchUrl(r.resultsUrl);
          allRounds.push({ roundName: r.roundName, matches: parseResultsPage(html) });
          process.stdout.write(`  ✓ ${r.roundName}\n`);
        } catch (e) {
          console.log(`  ✗ ${r.roundName}: ${e.message}`);
          allRounds.push({ roundName: r.roundName, matches: [] });
        }
      }
      standings = buildStandings(allRounds);
      console.log(`Standings: ${standings.length} player(s)`);
    }

    const liveRound = rounds[rounds.length - 1];
    let liveMatches   = {};
    let liveRoundName = '';
    const droppedPlayers = [];

    try {
      const pairingsHtml = await fetchUrl(liveRound.pairingsUrl);
      const allPairings  = parsePairingsPage(pairingsHtml);
      const resolvedSet  = new Set();

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
        standings.forEach(p => { if (!activeInRound.has(p.name)) droppedPlayers.push(p.name); });
      }
      console.log(`Live: ${liveRoundName} — ${Object.keys(liveMatches).length} match(es) in progress`);
    } catch (e) {
      console.log(`Pairings unavailable: ${e.message}`);
    }

    fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
    fs.writeFileSync(standingsPath, JSON.stringify({
      slug,
      lastUpdated: new Date().toISOString(),
      standings,
      liveMatches,
      liveRoundName,
      droppedPlayers,
    }, null, 2));
    console.log('Saved to data/standings.json');

  } finally {
    await browser.close();
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
