(async function () {
  'use strict';

  // Capture script src before any await (currentScript is null after first await)
  const _src = document.currentScript?.src || '';
  const API_KEY = new URL(_src || 'https://x/?key=').searchParams.get('key') || '';

  // Overlay UI
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed', 'top:1rem', 'right:1rem', 'z-index:2147483647',
    'background:#1a0c02', 'border:1px solid rgba(249,230,197,.35)', 'border-radius:14px',
    'padding:1rem 1.25rem', 'color:#f9e6c5', 'font:14px/1.6 system-ui,sans-serif',
    'min-width:230px', 'max-width:320px', 'box-shadow:0 6px 24px rgba(0,0,0,.6)',
    'transition:opacity .3s',
  ].join(';');
  document.body.appendChild(el);

  const setStatus = (msg, done = false) => {
    el.innerHTML = `<b style="font-size:1rem">🎴 BAF Tracker</b><br><span style="opacity:.85">${msg}</span>`;
    if (done) setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3500);
  };

  try {
    if (!API_KEY) { setStatus('❌ Clé API manquante. Regénère le bookmarklet depuis l\'admin.', true); return; }

    const m = location.pathname.match(/\/coverage\/([^/]+)/);
    if (!m) { setStatus('❌ Navigue vers une page coverage fabtcg.com d\'abord.', true); return; }
    const slug = m[1];

    setStatus(`Tournoi : <b>${slug}</b><br>Lecture des rounds…`);

    // Parse rounds from current page (no fetch needed — we're already on it)
    const rounds = [];
    document.querySelectorAll('table tbody tr').forEach(row => {
      const nameCell    = row.querySelector('td.rounds');
      const pairingsLnk = row.querySelector('td.pairings a');
      if (!nameCell || !pairingsLnk) return;
      const resultsLnk = row.querySelector('td.results a');
      rounds.push({
        roundName:   nameCell.textContent.trim(),
        pairingsUrl: pairingsLnk.href,
        resultsUrl:  resultsLnk?.href || null,
        hasResults:  !!resultsLnk,
      });
    });
    if (!rounds.length) { setStatus('❌ Aucun round trouvé sur cette page.', true); return; }

    const parseDoc = html => new DOMParser().parseFromString(html, 'text/html');

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

    // Fetch completed rounds
    const completed = rounds.filter(r => r.hasResults);
    const allRounds = [];
    for (let i = 0; i < completed.length; i++) {
      setStatus(`Rounds terminés : ${i + 1} / ${completed.length}…`);
      try {
        const html = await fetch(completed[i].resultsUrl).then(r => r.text());
        allRounds.push({ roundName: completed[i].roundName, matches: parseResults(html) });
      } catch { allRounds.push({ roundName: completed[i].roundName, matches: [] }); }
    }

    // Build standings
    const map = {};
    const get = (name, hero) => { if (!map[name]) map[name] = { name, hero, wins: 0, losses: 0, draws: 0, history: [] }; return map[name]; };
    allRounds.forEach(({ roundName, matches }) => {
      matches.forEach(({ p1Name, p1Hero, p2Name, p2Hero, p1Won, p2Won }) => {
        const p1 = get(p1Name, p1Hero), p2 = get(p2Name, p2Hero), draw = !p1Won && !p2Won;
        if (draw) { p1.draws++; p2.draws++; p1.history.push({ round: roundName, opponent: p2Name, opponentHero: p2Hero, result: 'draw' }); p2.history.push({ round: roundName, opponent: p1Name, opponentHero: p1Hero, result: 'draw' }); }
        else if (p1Won) { p1.wins++; p2.losses++; p1.history.push({ round: roundName, opponent: p2Name, opponentHero: p2Hero, result: 'win' }); p2.history.push({ round: roundName, opponent: p1Name, opponentHero: p1Hero, result: 'loss' }); }
        else { p2.wins++; p1.losses++; p1.history.push({ round: roundName, opponent: p2Name, opponentHero: p2Hero, result: 'loss' }); p2.history.push({ round: roundName, opponent: p1Name, opponentHero: p1Hero, result: 'win' }); }
      });
    });
    const standings = Object.values(map).sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : a.losses - b.losses);

    // Live round
    const liveRound = rounds[rounds.length - 1];
    let liveMatches = {}, liveRoundName = '';
    const droppedPlayers = [];
    setStatus('Pairings en cours…');
    try {
      const allPairings = parsePairings(await fetch(liveRound.pairingsUrl).then(r => r.text()));
      const resolved    = new Set();
      if (liveRound.hasResults) {
        parseResults(await fetch(liveRound.resultsUrl).then(r => r.text())).forEach(m => { resolved.add(m.p1Name); resolved.add(m.p2Name); });
      }
      Object.entries(allPairings).forEach(([pl, pr]) => { if (!resolved.has(pl)) liveMatches[pl] = pr; });
      liveRoundName = liveRound.roundName;
      if (Object.keys(liveMatches).length) {
        const active = new Set([...Object.keys(allPairings), ...resolved]);
        standings.forEach(p => { if (!active.has(p.name)) droppedPlayers.push(p.name); });
      }
    } catch (_) {}

    // Send to BAF API
    setStatus('Envoi vers bafbordeaux.fr…');
    const res = await fetch('https://bafbordeaux.fr/api/standings', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body:    JSON.stringify({ slug, lastUpdated: new Date().toISOString(), standings, liveMatches, liveRoundName, droppedPlayers }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    setStatus(`✅ ${standings.length} joueurs mis à jour !<br><small>${liveRoundName || 'Tournoi terminé'}</small>`, true);

  } catch (err) {
    setStatus(`❌ ${err.message}`, true);
  }
})();
