/*
 * Cloudflare Worker relay for live tournament tracking.
 * fabtcg.com blocks the VPS IP but answers Cloudflare's network, so this replaces the
 * home PC relay (scripts/live-agent.js). Every minute (cron) it:
 *   1. reports to bafbordeaux.fr/api/live/agent and gets the job back (admin "Suivi live"),
 *   2. if a job is running, reads fabtcg.com/coverage/<slug>/, its round results and the
 *      official standings, rebuilds the standings exactly like js/bookmarklet.js does,
 *   3. POSTs them (gzipped) to bafbordeaux.fr/api/standings.
 * The bookmarklet / home PC relay stay usable as a fallback.
 *
 * HTTP routes (all need "Authorization: Bearer <API_KEY>"):
 *   POST /run              run one cycle now, returns the result
 *   GET  /dry-run?slug=x   scrape without posting, returns a summary
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';
const ROUND_TTL = 60 * 60 * 24 * 30; // finished rounds are kept 30 days in KV


const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => decodeEntities(s).replace(/\s+/g, ' ').trim();
const hasClass = (el, c) => (` ${el.getAttribute('class') || ''} `).includes(` ${c} `);

// HTMLRewriter hands out raw source text, entities included.
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decodeEntities = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') {
    const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(n) ? String.fromCodePoint(n) : m;
  }
  return NAMED[e.toLowerCase()] ?? m;
});

/* ---- fabtcg.com ---- */

// GET that fails on HTTP errors or a Cloudflare challenge instead of returning it as a page.
const fetchPage = async (url) => {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    cf: { cacheTtl: 0 },
  });
  if (!res.ok) throw new Error(`fabtcg.com HTTP ${res.status}`);
  if (res.headers.get('cf-mitigated')) throw new Error('fabtcg.com challenge Cloudflare');
  return res;
};

// Rounds listed on the coverage page: name + pairings/results links.
const parseCoverage = async (res, baseUrl) => {
  const rows = [];
  let row = null;
  await new HTMLRewriter()
    .on('table tbody tr', { element() { row = { name: '', pairings: null, results: null }; rows.push(row); } })
    .on('table tbody tr td.rounds', { text(t) { if (row) row.name += t.text; } })
    .on('table tbody tr td.pairings a', { element(el) { if (row && !row.pairings) row.pairings = el.getAttribute('href'); } })
    .on('table tbody tr td.results a', { element(el) { if (row && !row.results) row.results = el.getAttribute('href'); } })
    .transform(res).arrayBuffer();
  const abs = (h) => { if (!h) return null; try { return new URL(decodeEntities(h), baseUrl).href; } catch { return null; } };
  return rows
    .map((r) => ({ roundName: clean(r.name), pairingsUrl: abs(r.pairings), resultsUrl: abs(r.results) }))
    .filter((r) => r.roundName && (r.pairingsUrl || r.resultsUrl))
    .map((r) => ({ ...r, hasResults: !!r.resultsUrl }));
};

// Matches on a results page: both players, heroes and who won.
const parseResults = async (res) => {
  const matches = [];
  let cur = null, side = null, inIcon = 0;
  const blank = () => ({ name: '', hero: '', spans: 0, won: false });
  const enterSide = (key) => ({ element(el) { if (!cur) return; side = cur[key]; side.won = hasClass(el, 'winner'); } });
  await new HTMLRewriter()
    .on('tr.match-row', { element() { cur = { left: blank(), right: blank() }; side = null; matches.push(cur); } })
    .on('tr.match-row .player-details.player-left', enterSide('left'))
    .on('tr.match-row .player-details.player-right', enterSide('right'))
    // <i> inside the name (flags, icons) is not part of the name.
    .on('tr.match-row .player-details .player-text strong i', {
      element(el) { inIcon++; try { el.onEndTag(() => { inIcon--; }); } catch { inIcon--; } },
    })
    .on('tr.match-row .player-details .player-text strong', { text(t) { if (side && !inIcon) side.name += t.text; } })
    .on('tr.match-row .player-details .player-text span', {
      element() { if (side) side.spans++; },
      text(t) { if (side && side.spans === 1) side.hero += t.text; },
    })
    .transform(res).arrayBuffer();
  return matches
    .map(({ left, right }) => ({
      p1Name: clean(left.name), p2Name: clean(right.name),
      p1Hero: clean(left.hero), p2Hero: clean(right.hero),
      p1Won: left.won, p2Won: right.won,
    }))
    .filter((m) => m.p1Name && m.p2Name);
};

// Official standings page: lower-cased name -> rank (tiebreakers included).
const parseStandings = async (res) => {
  const rows = [];
  let row = null;
  await new HTMLRewriter()
    .on('table tbody tr', { element() { row = { cells: [], link: null, links: 0 }; rows.push(row); } })
    .on('table tbody tr td', { element() { if (row) row.cells.push(''); }, text(t) { if (row?.cells.length) row.cells[row.cells.length - 1] += t.text; } })
    .on('table tbody tr td a', {
      element() { if (row && row.cells.length === 2) { row.links++; if (row.links === 1) row.link = ''; } },
      text(t) { if (row && row.cells.length === 2 && row.links === 1) row.link += t.text; },
    })
    .transform(res).arrayBuffer();
  const rankMap = {};
  rows.forEach((r, idx) => {
    if (r.cells.length < 2) return;
    const rank = parseInt(clean(r.cells[0]), 10) || idx + 1;
    const name = clean(r.link ?? r.cells[1]);
    if (name) rankMap[name.toLowerCase()] = rank;
  });
  return rankMap;
};

// One round's results, retried twice. No match rows = failure (rate-limit / challenge page).
const fetchRound = async (url) => {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(2000 * attempt);
    try {
      const matches = await parseResults(await fetchPage(url));
      if (matches.length) return matches;
      lastErr = new Error('page vide');
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
};

/* ---- Standings (same rules as js/bookmarklet.js) ---- */

const scrape = async (env, slug) => {
  const coverageUrl = `https://fabtcg.com/coverage/${slug}/`;
  const rounds = await parseCoverage(await fetchPage(coverageUrl), coverageUrl);
  if (!rounds.length) throw new Error('Aucun round trouvé');

  // Finished rounds come from KV; the last two are always re-read (late score fixes).
  const completed = rounds.filter((r) => r.hasResults);
  const allRounds = [];
  let fetched = 0;
  for (let i = 0; i < completed.length; i++) {
    const { roundName, resultsUrl } = completed[i];
    const isRecent = i >= completed.length - 2;
    const kvKey = `r:${resultsUrl}`;
    const cached = await env.ROUNDS.get(kvKey, 'json');
    if (!isRecent && cached) { allRounds.push({ roundName, matches: cached }); continue; }
    try {
      if (fetched++) await sleep(400); // be gentle with fabtcg.com
      const matches = await fetchRound(resultsUrl);
      if (!isRecent) await env.ROUNDS.put(kvKey, JSON.stringify(matches), { expirationTtl: ROUND_TTL });
      allRounds.push({ roundName, matches });
    } catch (e) {
      // Pushing a round with no matches would wipe it on the site: use the old copy or give up.
      if (cached) { allRounds.push({ roundName, matches: cached }); continue; }
      throw new Error(`${roundName} illisible (${e.message}), màj ignorée`);
    }
  }

  const liveRoundName = rounds[rounds.length - 1].roundName;

  // Each player's record; a "draw" in the latest round is a match still in progress.
  const map = {};
  const get = (name, hero) => (map[name] ??= { name, hero, wins: 0, losses: 0, draws: 0, history: [] });
  allRounds.forEach(({ roundName, matches }) => {
    matches.forEach(({ p1Name, p1Hero, p2Name, p2Hero, p1Won, p2Won }) => {
      const p1 = get(p1Name, p1Hero), p2 = get(p2Name, p2Hero), draw = !p1Won && !p2Won;
      const add = (r1, r2) => {
        p1.history.push({ round: roundName, opponent: p2Name, opponentHero: p2Hero, result: r1 });
        p2.history.push({ round: roundName, opponent: p1Name, opponentHero: p1Hero, result: r2 });
      };
      if (draw && roundName === liveRoundName) add('ongoing', 'ongoing');
      else if (draw) { p1.draws++; p2.draws++; add('draw', 'draw'); }
      else if (p1Won) { p1.wins++; p2.losses++; add('win', 'loss'); }
      else { p2.wins++; p1.losses++; add('loss', 'win'); }
    });
  });

  // Official order (tiebreakers) from the last round's standings page.
  let rankMap = {};
  if (completed.length) {
    try {
      const lastNum = completed[completed.length - 1].roundName.match(/(\d+)/)?.[1] || completed.length;
      rankMap = await parseStandings(await fetchPage(new URL(`standings/${lastNum}/`, coverageUrl).href));
    } catch {}
  }
  const standings = Object.values(map);
  if (Object.keys(rankMap).length) {
    standings.sort((a, b) => (rankMap[a.name.toLowerCase()] ?? 9999) - (rankMap[b.name.toLowerCase()] ?? 9999));
  } else {
    standings.sort((a, b) => (b.wins !== a.wins ? b.wins - a.wins : a.losses - b.losses));
  }

  // Dropped = stopped playing although the next round was not a cut (a round with under
  // 60% of the previous round's players is a cut: day 2, top 8…).
  const roundPlayers = allRounds.map(({ matches }) => {
    const set = new Set();
    matches.forEach(({ p1Name, p2Name }) => { set.add(p1Name); set.add(p2Name); });
    return set;
  });
  const droppedPlayers = Object.keys(map).filter((name) => {
    let last = -1;
    roundPlayers.forEach((set, i) => { if (set.has(name)) last = i; });
    const next = roundPlayers[last + 1];
    return last >= 0 && next && next.size >= roundPlayers[last].size * 0.6;
  });

  return {
    data: { slug, lastUpdated: new Date().toISOString(), standings, liveMatches: {}, liveRoundName, droppedPlayers },
    info: { rounds: rounds.length, completed: completed.length, fetched, officialRanks: Object.keys(rankMap).length },
  };
};

/* ---- bafbordeaux.fr ---- */

// The secret is pasted in a terminal: ignore stray spaces / line breaks around it.
const apiKey = (env) => (env.API_KEY || '').trim();

const api = async (env, method, route, body, extraHeaders = {}) => {
  const res = await fetch(env.SITE + route, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey(env)}`, ...extraHeaders },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(`API ${res.status}${err?.error ? ` : ${err.error}` : ''}`);
  }
  return res.json();
};

// Gzipped like the bookmarklet: 1000+ player events pass nginx's 1 MB upload limit.
const pushStandings = async (env, data) => {
  const gz = await new Response(
    new Blob([JSON.stringify(data)]).stream().pipeThrough(new CompressionStream('gzip')),
  ).arrayBuffer();
  return api(env, 'POST', '/api/standings', gz, { 'Content-Encoding': 'gzip' });
};

const report = (env, slug, status, lastSuccessAt, consecutiveErrors) =>
  api(env, 'POST', '/api/live/agent', JSON.stringify({ slug, status, lastSuccessAt, consecutiveErrors }));

const time = () => new Date().toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });

// One cron cycle: read the job, scrape + push if running, then report the outcome once.
// Each run may be a fresh isolate, so the previous report (kept by the API) is the memory:
// the status shown in the admin stays the last real outcome until this run finishes.
const cycle = async (env) => {
  if (!apiKey(env)) throw new Error('API_KEY secret missing (npx wrangler secret put API_KEY)');
  const { job, agent: prev } = await api(env, 'GET', '/api/live');
  if (!job.running || !job.slug) {
    await report(env, '', '☁️ En attente', null, 0);
    return { running: false };
  }
  const sameJob = prev?.slug === job.slug;
  try {
    const { data, info } = await scrape(env, job.slug);
    await pushStandings(env, data);
    await report(env, job.slug, `☁️ ${data.standings.length} joueurs — ${data.liveRoundName || 'Terminé'} (màj ${time()})`, new Date().toISOString(), 0);
    return { running: true, slug: job.slug, players: data.standings.length, ...info };
  } catch (e) {
    await report(env, job.slug, `☁️ ❌ ${e.message}`,
      sameJob ? prev.lastSuccessAt : null,
      (sameJob ? prev.consecutiveErrors || 0 : 0) + 1).catch(() => {});
    throw e;
  }
};

export default {
  async scheduled(event, env, ctx) {
    try {
      const r = await cycle(env);
      if (r.running) console.log('pushed', JSON.stringify(r));
    } catch (e) {
      console.error('cycle failed:', e.message);
    }
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const authorized = apiKey(env) && request.headers.get('Authorization') === `Bearer ${apiKey(env)}`;
    // Live status is in the admin "Suivi live" tab (this isolate may not be the cron's).
    if (url.pathname === '/') return new Response('BAF coverage relay.');
    if (!authorized) return new Response('unauthorized', { status: 401 });

    try {
      if (url.pathname === '/run' && request.method === 'POST') {
        return Response.json(await cycle(env));
      }
      if (url.pathname === '/dry-run') {
        const slug = url.searchParams.get('slug') || '';
        if (!/^[a-z0-9-]{1,79}$/.test(slug)) return Response.json({ error: 'invalid slug' }, { status: 400 });
        const t0 = Date.now();
        const sNum = url.searchParams.get('standings'); // check one official standings page
        if (sNum) {
          const ranks = await parseStandings(await fetchPage(`https://fabtcg.com/coverage/${slug}/standings/${parseInt(sNum, 10)}/`));
          return Response.json({ count: Object.keys(ranks).length, first: Object.entries(ranks).slice(0, 5) });
        }
        const { data, info } = await scrape(env, slug);
        return Response.json({
          ...info,
          ms: Date.now() - t0,
          players: data.standings.length,
          liveRoundName: data.liveRoundName,
          dropped: data.droppedPlayers.length,
          top8: data.standings.slice(0, 8).map((p) => `${p.name} (${p.hero}) ${p.wins}-${p.losses}-${p.draws}`),
        });
      }
    } catch (e) {
      return Response.json({ error: e.message }, { status: 502 });
    }
    return new Response('not found', { status: 404 });
  },
};
