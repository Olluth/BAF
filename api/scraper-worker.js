'use strict';
/*
 * One-shot tournament scraper, launched as a child process by scraper.js.
 * Usage: node scraper-worker.js <slug>
 * Ports the parsing logic of js/bookmarklet.js (the currently-preferred,
 * most up-to-date scraper) to run headlessly via Puppeteer + JSDOM instead
 * of inside a real browser tab.
 */
const puppeteer     = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { JSDOM }      = require('jsdom');
puppeteer.use(StealthPlugin());

const PORT    = process.env.PORT    || 3001;
const API_KEY = process.env.API_KEY || '';

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node scraper-worker.js <slug>');
  process.exit(1);
}

const parseDoc = html => new JSDOM(html).window.document;

const extractMatch = row => {
  const p1El = row.querySelector('.player-details.player-left');
  const p2El = row.querySelector('.player-details.player-right');
  if (!p1El || !p2El) return null;
  const getName = el => {
    const s = el.querySelector('.player-text strong');
    if (!s) return '';
    const c = s.cloneNode(true);
    c.querySelectorAll('i').forEach(i => i.remove());
    return c.textContent.trim();
  };
  const getHero = el => el.querySelector('.player-text span')?.textContent.trim() ?? '';
  const p1Name = getName(p1El), p2Name = getName(p2El);
  if (!p1Name || !p2Name) return null;
  return { p1Name, p2Name, p1Hero: getHero(p1El), p2Hero: getHero(p2El), p1Won: p1El.classList.contains('winner'), p2Won: p2El.classList.contains('winner') };
};

const parseResults  = html => { const d = parseDoc(html); const m = []; d.querySelectorAll('tr.match-row').forEach(r => { const x = extractMatch(r); if (x) m.push(x); }); return m; };
const parsePairings = html => { const d = parseDoc(html); const p = {}; d.querySelectorAll('tr.match-row').forEach(r => { const x = extractMatch(r); if (!x) return; p[x.p1Name] = { opponent: x.p2Name, opponentHero: x.p2Hero }; p[x.p2Name] = { opponent: x.p1Name, opponentHero: x.p1Hero }; }); return p; };

const fetchPage = async (browser, url) => {
  const page = await browser.newPage();
  try {
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7' });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    const res = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
    const html = await page.content();
    if (/<title>[^<]*just a moment/i.test(html)) throw new Error('Cloudflare challenge — try again next cycle');
    return html;
  } finally {
    await page.close();
  }
};

async function main() {
  if (!API_KEY) { console.error('API_KEY not set in environment.'); process.exit(1); }

  console.log(`Fetching standings for: ${slug}`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-crash-reporter', '--no-first-run'],
  });

  try {
    const fetchUrl = url => fetchPage(browser, url);
    const absHref = (href, base) => { if (!href) return null; try { return new URL(href, base).href; } catch { return null; } };

    const coverageUrl  = `https://fabtcg.com/coverage/${encodeURIComponent(slug)}/`;
    const coverageHtml = await fetchUrl(coverageUrl);
    const coverageDoc  = parseDoc(coverageHtml);

    const rounds = [];
    coverageDoc.querySelectorAll('table tbody tr').forEach(row => {
      const nameCell    = row.querySelector('td.rounds');
      const pairingsLnk = row.querySelector('td.pairings a');
      if (!nameCell || !pairingsLnk) return;
      const resultsLnk = row.querySelector('td.results a');
      rounds.push({
        roundName:   nameCell.textContent.trim(),
        pairingsUrl: absHref(pairingsLnk.getAttribute('href'), coverageUrl),
        resultsUrl:  absHref(resultsLnk?.getAttribute('href'), coverageUrl),
        hasResults:  !!resultsLnk,
      });
    });
    if (!rounds.length) { console.error('No rounds found.'); process.exit(1); }

    const completed = rounds.filter(r => r.hasResults);
    const allRounds  = [];
    for (let i = 0; i < completed.length; i++) {
      console.log(`Round ${i + 1}/${completed.length}: ${completed[i].roundName}`);
      try {
        const html = await fetchUrl(completed[i].resultsUrl);
        allRounds.push({ roundName: completed[i].roundName, matches: parseResults(html) });
      } catch (e) {
        console.error(`  ✗ ${completed[i].roundName}: ${e.message}`);
        allRounds.push({ roundName: completed[i].roundName, matches: [] });
      }
    }

    const liveRound = rounds[rounds.length - 1];
    const liveRoundNameForBuild = liveRound.roundName;

    const map = {};
    const get = (name, hero) => { if (!map[name]) map[name] = { name, hero, wins: 0, losses: 0, draws: 0, history: [] }; return map[name]; };
    allRounds.forEach(({ roundName, matches }) => {
      matches.forEach(({ p1Name, p1Hero, p2Name, p2Hero, p1Won, p2Won }) => {
        const p1 = get(p1Name, p1Hero), p2 = get(p2Name, p2Hero), draw = !p1Won && !p2Won;
        if (draw && roundName === liveRoundNameForBuild) { p1.history.push({ round: roundName, opponent: p2Name, opponentHero: p2Hero, result: 'ongoing' }); p2.history.push({ round: roundName, opponent: p1Name, opponentHero: p1Hero, result: 'ongoing' }); }
        else if (draw) { p1.draws++; p2.draws++; p1.history.push({ round: roundName, opponent: p2Name, opponentHero: p2Hero, result: 'draw' }); p2.history.push({ round: roundName, opponent: p1Name, opponentHero: p1Hero, result: 'draw' }); }
        else if (p1Won) { p1.wins++; p2.losses++; p1.history.push({ round: roundName, opponent: p2Name, opponentHero: p2Hero, result: 'win' }); p2.history.push({ round: roundName, opponent: p1Name, opponentHero: p1Hero, result: 'loss' }); }
        else { p2.wins++; p1.losses++; p1.history.push({ round: roundName, opponent: p2Name, opponentHero: p2Hero, result: 'loss' }); p2.history.push({ round: roundName, opponent: p1Name, opponentHero: p1Hero, result: 'win' }); }
      });
    });

    // Fetch official standings page for accurate rank order (tiebreakers, etc.)
    let officialRankMap = {};
    if (completed.length > 0) {
      try {
        const standingsUrl = absHref(`standings/${completed.length}/`, coverageUrl);
        const sHtml = await fetchUrl(standingsUrl);
        const sDoc  = parseDoc(sHtml);
        sDoc.querySelectorAll('table tbody tr').forEach((row, idx) => {
          const cells = [...row.querySelectorAll('td')];
          if (cells.length < 2) return;
          const rankNum  = parseInt(cells[0]?.textContent.trim()) || (idx + 1);
          const nameCell = cells[1];
          const name     = (nameCell?.querySelector('a') || nameCell)?.textContent.trim() || '';
          if (name) officialRankMap[name.toLowerCase()] = rankNum;
        });
      } catch (e) { console.error(`Official standings unavailable: ${e.message}`); }
    }

    const allPlayers = Object.values(map);
    if (Object.keys(officialRankMap).length > 0) {
      allPlayers.sort((a, b) => {
        const ra = officialRankMap[a.name.toLowerCase()] ?? 9999;
        const rb = officialRankMap[b.name.toLowerCase()] ?? 9999;
        return ra - rb;
      });
    } else {
      allPlayers.sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : a.losses - b.losses);
    }
    const standings = allPlayers;
    const liveMatches = {}, liveRoundName = liveRound.roundName;

    // Players seen in last completed round — anyone absent = dropped
    const lastRoundPlayers = new Set();
    if (allRounds.length > 0) {
      allRounds[allRounds.length - 1].matches.forEach(({ p1Name, p2Name }) => {
        lastRoundPlayers.add(p1Name);
        lastRoundPlayers.add(p2Name);
      });
    }
    const droppedPlayers = allRounds.length > 1
      ? Object.keys(map).filter(name => !lastRoundPlayers.has(name))
      : [];

    console.log(`Sending to local API: ${standings.length} players — ${liveRoundName || 'terminé'}`);
    const res = await fetch(`http://127.0.0.1:${PORT}/api/standings`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body:    JSON.stringify({ slug, lastUpdated: new Date().toISOString(), standings, liveMatches, liveRoundName, droppedPlayers }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    console.log('Saved.');

  } finally {
    await browser.close();
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
