(function () {
  'use strict';

  // Prevent double-injection
  if (window.__bafTrackerRunning) {
    window.__bafTrackerRunning.toggle();
    return;
  }

  const _src = document.currentScript?.src || '';
  const API_KEY = new URL(_src || 'https://x/?key=').searchParams.get('key') || '';
  const INTERVAL_MS = 90 * 1000; // 90 seconds

  /* ---- Overlay ---- */
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

  const doUpdate = async () => {
    if (_stopped) return;
    try {
      if (!API_KEY) { setStatus('❌ Clé API manquante.'); _stopped = true; return; }

      const m = location.pathname.match(/\/coverage\/([^/]+)/);
      if (!m) { setStatus('❌ Page coverage introuvable.'); _stopped = true; return; }
      const slug = m[1];

      setStatus(`<b>${slug}</b> — Lecture des rounds…`);

      const coverageHtml = await fetch(location.href).then(r => r.text());
      const coverageDoc  = parseDoc(coverageHtml);
      const absHref = el => { if (!el) return null; const h = el.getAttribute('href'); if (!h) return null; try { return new URL(h, location.href).href; } catch { return null; } };
      const rounds = [];
      coverageDoc.querySelectorAll('table tbody tr').forEach(row => {
        const nameCell    = row.querySelector('td.rounds');
        const pairingsLnk = row.querySelector('td.pairings a');
        if (!nameCell || !pairingsLnk) return;
        const resultsLnk = row.querySelector('td.results a');
        rounds.push({ roundName: nameCell.textContent.trim(), pairingsUrl: absHref(pairingsLnk), resultsUrl: absHref(resultsLnk), hasResults: !!resultsLnk });
      });
      if (!rounds.length) { setStatus('❌ Aucun round trouvé.'); return; }

      const completed = rounds.filter(r => r.hasResults);
      const allRounds = [];
      for (let i = 0; i < completed.length; i++) {
        setStatus(`Rounds : ${i + 1} / ${completed.length}…`);
        try {
          const html = await fetch(completed[i].resultsUrl).then(r => r.text());
          allRounds.push({ roundName: completed[i].roundName, matches: parseResults(html) });
        } catch { allRounds.push({ roundName: completed[i].roundName, matches: [] }); }
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
      const standings = Object.values(map).sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : a.losses - b.losses);
      const liveMatches = {}, liveRoundName = liveRound.roundName;
      const droppedPlayers = [];

      setStatus('Envoi vers bafbordeaux.fr…');
      const res = await fetch('https://bafbordeaux.fr/api/standings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body:    JSON.stringify({ slug, lastUpdated: new Date().toISOString(), standings, liveMatches, liveRoundName, droppedPlayers }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);

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
