/*
 * Browser bookmarklet for live tournament tracking.
 * Run it on a fabtcg.com/coverage/<slug>/ page: every 90s it re-reads
 * all round results, rebuilds the standings and POSTs them to bafbordeaux.fr/api/standings.
 * The admin page generates the bookmark link, with the API key passed as ?key=.
 * Finished rounds are cached, so each cycle only re-downloads the last two rounds;
 * if a round can't be loaded the update is skipped rather than pushing partial data.
 */
(function () {
  'use strict';

  // Clicking the bookmark again pauses / resumes instead of injecting a second copy
  if (window.__bafTrackerRunning) {
    window.__bafTrackerRunning.toggle();
    return;
  }

  // API key comes from this script's own URL (…/bookmarklet.js?key=…).
  const _src = document.currentScript?.src || '';
  const API_KEY = new URL(_src || 'https://x/?key=').searchParams.get('key') || '';
  const INTERVAL_MS = 90 * 1000; // 90 seconds

  /* ---- Overlay (status box pinned to the top-right of the page) ---- */
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed', 'top:1rem', 'right:1rem', 'z-index:2147483647',
    'background:#1a0c02', 'border:1px solid rgba(249,230,197,.35)', 'border-radius:14px',
    'padding:1rem 1.25rem', 'color:#f9e6c5', 'font:14px/1.6 system-ui,sans-serif',
    'min-width:240px', 'max-width:320px', 'box-shadow:0 6px 24px rgba(0,0,0,.6)',
  ].join(';');
  document.body.appendChild(el);

  let _stopped = false;
  let _timer = null;
  let _countdownTimer = null;
  let _nextRun = 0;

  // Redraws the overlay; the countdown is hidden while an update is running.
  const renderOverlay = (status, isRunning = false) => {
    const now = Date.now();
    const remaining = _stopped ? 0 : Math.max(0, Math.ceil((_nextRun - now) / 1000));
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');
    const countdownHtml = (!_stopped && !isRunning)
      ? `<div style="margin-top:.5rem;font-size:.8rem;opacity:.6">Prochaine màj dans ${mm}:${ss}</div>`
      : '';
    const stopBtnStyle = 'margin-top:.75rem;padding:.3rem .75rem;border-radius:8px;border:1px solid rgba(249,230,197,.3);background:rgba(249,230,197,.08);color:#f9e6c5;font:13px system-ui,sans-serif;cursor:pointer';
    const stopLabel = _stopped ? '▶ Reprendre' : '■ Arrêter';
    el.innerHTML = `
      <b style="font-size:1rem">🎴 BAF Tracker</b>
      <span style="font-size:.75rem;opacity:.5;margin-left:.4rem">auto</span><br>
      <span style="opacity:.85">${status}</span>
      ${countdownHtml}
      <div><button id="__baf_stop" style="${stopBtnStyle}">${stopLabel}</button></div>`;
    document.getElementById('__baf_stop')?.addEventListener('click', () => window.__bafTrackerRunning.toggle());
  };

  // Ticks the "next update in mm:ss" line every second.
  const startCountdown = () => {
    if (_countdownTimer) clearInterval(_countdownTimer);
    _countdownTimer = setInterval(() => {
      if (_stopped) { clearInterval(_countdownTimer); return; }
      renderOverlay(_lastStatus);
    }, 1000);
  };

  let _lastStatus = 'Initialisation…';

  const setStatus = (msg) => {
    _lastStatus = msg;
    renderOverlay(msg, true);
  };

  /* ---- Scraping logic ---- */
  const parseDoc = html => new DOMParser().parseFromString(html, 'text/html');

  // Extracts both players, heroes and the winner from one match row.
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

  // fetch() that fails on HTTP errors instead of returning an error / Cloudflare page as text.
  const fetchText = async (url) => {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  };
  const sleep = ms => new Promise(res => setTimeout(res, ms));

  // Downloads one round's results, retrying twice. A page with no match rows is treated
  // as a failure too (that's what a rate-limit or challenge page looks like).
  const fetchRound = async (url) => {
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await sleep(2000 * attempt);
      try {
        const matches = parseResults(await fetchText(url));
        if (matches.length) return matches;
        lastErr = new Error('page vide');
      } catch (e) { lastErr = e; }
    }
    throw lastErr;
  };

  // Results of finished rounds, keyed by results URL. Only the last two completed
  // rounds are re-downloaded each cycle (late score corrections, live round).
  const roundCache = {};

  // One full update: read rounds, rebuild standings, push to the API, schedule the next run.
  const doUpdate = async () => {
    if (_stopped) return;
    try {
      if (!API_KEY) { setStatus('❌ Clé API manquante.'); _stopped = true; return; }

      const m = location.pathname.match(/\/coverage\/([^/]+)/);
      if (!m) { setStatus('❌ Page coverage introuvable.'); _stopped = true; return; }
      const slug = m[1];

      setStatus(`<b>${slug}</b> — Lecture des rounds…`);

      const coverageHtml = await fetchText(location.href);
      const coverageDoc  = parseDoc(coverageHtml);
      const absHref = el => { if (!el) return null; const h = el.getAttribute('href'); if (!h) return null; try { return new URL(h, location.href).href; } catch { return null; } };
      const rounds = [];
      coverageDoc.querySelectorAll('table tbody tr').forEach(row => {
        const nameCell    = row.querySelector('td.rounds');
        const pairingsLnk = row.querySelector('td.pairings a');
        const resultsLnk  = row.querySelector('td.results a');
        if (!nameCell || (!pairingsLnk && !resultsLnk)) return;
        rounds.push({ roundName: nameCell.textContent.trim(), pairingsUrl: absHref(pairingsLnk), resultsUrl: absHref(resultsLnk), hasResults: !!resultsLnk });
      });
      if (!rounds.length) { setStatus('❌ Aucun round trouvé.'); return; }

      const completed = rounds.filter(r => r.hasResults);
      const allRounds = [];
      for (let i = 0; i < completed.length; i++) {
        const { roundName, resultsUrl } = completed[i];
        const isRecent = i >= completed.length - 2;
        if (!isRecent && roundCache[resultsUrl]) {
          allRounds.push({ roundName, matches: roundCache[resultsUrl] });
          continue;
        }
        setStatus(`Rounds : ${i + 1} / ${completed.length}…`);
        try {
          const matches = await fetchRound(resultsUrl);
          roundCache[resultsUrl] = matches;
          allRounds.push({ roundName, matches });
        } catch (e) {
          // Keep the previous copy of this round if we have one, otherwise skip this
          // update entirely: pushing a round with no matches would wipe it on the site.
          if (roundCache[resultsUrl]) { allRounds.push({ roundName, matches: roundCache[resultsUrl] }); continue; }
          throw new Error(`${roundName} illisible (${e.message}) — màj ignorée, nouvel essai bientôt`);
        }
        if (i < completed.length - 1) await sleep(400); // be gentle with fabtcg.com
      }

      const liveRound = rounds[rounds.length - 1];
      const liveRoundNameForBuild = liveRound.roundName;

      // Rebuild each player's record; a "draw" in the latest round is a match still in progress.
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
          const lastNum = completed[completed.length - 1].roundName.match(/(\d+)/)?.[1] || completed.length;
          const standingsUrl = new URL(`standings/${lastNum}/`, location.href).href;
          setStatus('Classement officiel…');
          const sHtml = await fetchText(standingsUrl);
          const sDoc  = parseDoc(sHtml);
          sDoc.querySelectorAll('table tbody tr').forEach((row, idx) => {
            const cells = [...row.querySelectorAll('td')];
            if (cells.length < 2) return;
            const rankNum  = parseInt(cells[0]?.textContent.trim()) || (idx + 1);
            const nameCell = cells[1];
            const name     = (nameCell?.querySelector('a') || nameCell)?.textContent.trim() || '';
            if (name) officialRankMap[name.toLowerCase()] = rankNum;
          });
        } catch {}
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

      // Dropped = stopped playing although the next round was not a cut. A round with
      // under 60% of the previous round's players is a cut (day 2, top 8…): players who
      // didn't make it were eliminated, not dropped.
      const roundPlayers = allRounds.map(({ matches }) => {
        const set = new Set();
        matches.forEach(({ p1Name, p2Name }) => { set.add(p1Name); set.add(p2Name); });
        return set;
      });
      const droppedPlayers = [];
      Object.keys(map).forEach(name => {
        let last = -1;
        roundPlayers.forEach((set, i) => { if (set.has(name)) last = i; });
        const next = roundPlayers[last + 1];
        if (last >= 0 && next && next.size >= roundPlayers[last].size * 0.6) droppedPlayers.push(name);
      });

      setStatus('Envoi vers bafbordeaux.fr…');
      const res = await fetch('https://bafbordeaux.fr/api/standings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body:    JSON.stringify({ slug, lastUpdated: new Date().toISOString(), standings, liveMatches, liveRoundName, droppedPlayers }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(`API ${res.status}${body?.error ? ` : ${body.error}` : ''}`);
      }

      const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      _lastStatus = `✅ ${standings.length} joueurs — ${liveRoundName || 'Terminé'}<br><small style="opacity:.6">Dernière màj : ${time}</small>`;
      _nextRun = Date.now() + INTERVAL_MS;
      renderOverlay(_lastStatus);
      startCountdown();

      _timer = setTimeout(doUpdate, INTERVAL_MS);

    } catch (err) {
      _lastStatus = `❌ ${err.message}`;
      renderOverlay(_lastStatus);
      if (!_stopped) {
        _nextRun = Date.now() + INTERVAL_MS;
        startCountdown();
        _timer = setTimeout(doUpdate, INTERVAL_MS);
      }
    }
  };

  window.__bafTrackerRunning = {
    toggle() {
      _stopped = !_stopped;
      if (_stopped) {
        clearTimeout(_timer);
        clearInterval(_countdownTimer);
        _lastStatus = '⏸ Auto-update arrêté';
        renderOverlay(_lastStatus);
      } else {
        doUpdate();
      }
    },
  };

  doUpdate();
})();
