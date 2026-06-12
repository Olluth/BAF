'use strict';

const STORAGE_KEY  = 'baf-tracked-players';
const EVENTS_KEY   = 'baf-events';
const CACHE_PREFIX = 'baf-tracker-';
const CACHE_TTL    = 5 * 60 * 1000;

const PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url=',
];

/* ---- Storage ---- */

const loadTrackedPlayers = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const p   = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p.map(n => n.trim()).filter(Boolean) : [];
  } catch { return []; }
};

const loadEvents = () => {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    const p   = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p.filter(e => e.active !== false) : [];
  } catch { return []; }
};

const getCached = (slug) => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + slug);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    return Date.now() - ts < CACHE_TTL ? data : null;
  } catch { return null; }
};

const setCache = (slug, data) => {
  try { localStorage.setItem(CACHE_PREFIX + slug, JSON.stringify({ ts: Date.now(), data })); } catch {}
};

/* ---- Network ---- */

const proxiedFetch = async (url) => {
  for (const proxy of PROXIES) {
    try {
      const r = await fetch(proxy + encodeURIComponent(url));
      if (r.ok) return r.text();
    } catch {}
  }
  throw new Error(t('tracker.loadError'));
};

/* ---- Parsers ---- */

const parseRoundsIndex = (html, slug) => {
  const doc  = new DOMParser().parseFromString(html, 'text/html');
  const rows = Array.from(doc.querySelectorAll('table tbody tr'));
  const base = `https://fabtcg.com/coverage/${encodeURIComponent(slug)}`;
  return rows.reduce((acc, row, idx) => {
    const nameCell    = row.querySelector('td.rounds');
    const pairingsLnk = row.querySelector('td.pairings a');
    if (!nameCell || !pairingsLnk) return acc;
    const n = idx + 1;
    acc.push({
      roundNum:    n,
      roundName:   nameCell.textContent.trim(),
      pairingsUrl: `${base}/pairings/${n}/`,
      resultsUrl:  row.querySelector('td.results a') ? `${base}/results/${n}/` : null,
      hasResults:  !!row.querySelector('td.results a'),
    });
    return acc;
  }, []);
};

// Shared extractor used by both results and pairings parsers
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
  const doc     = new DOMParser().parseFromString(html, 'text/html');
  const matches = [];
  doc.querySelectorAll('tr.match-row').forEach(row => {
    const data = extractMatchRow(row);
    if (data) matches.push(data);
  });
  return matches;
};

const parsePairingsPage = (html) => {
  const doc      = new DOMParser().parseFromString(html, 'text/html');
  const pairings = {};
  doc.querySelectorAll('tr.match-row').forEach(row => {
    const data = extractMatchRow(row);
    if (!data) return;
    pairings[data.p1Name] = { opponent: data.p2Name, opponentHero: data.p2Hero };
    pairings[data.p2Name] = { opponent: data.p1Name, opponentHero: data.p1Hero };
  });
  return pairings;
};

/* ---- Standings builder ---- */

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

/* ---- UI helpers ---- */

const esc  = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const toId = s => 'h' + s.replace(/[^a-zA-Z0-9]/g, '-');

let _refreshTimer = null;

const clearRefreshTimer = () => {
  if (_refreshTimer) { clearInterval(_refreshTimer); _refreshTimer = null; }
};

const setStatus = (msg, isError = false) => {
  const el = document.getElementById('tracker-status');
  if (!el) return;
  if (!msg) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.className = 'tracker-status' + (isError ? ' tracker-status-error' : '');
  el.textContent = msg;
};

const updateLiveStatus = (secondsLeft, roundName) => {
  const el = document.getElementById('tracker-live-status');
  if (!el) return;
  el.textContent = `● ${roundName} — ${t('tracker.refresh.in', { n: secondsLeft })}`;
};

const clearStandings = () => {
  const el = document.getElementById('standings-container');
  if (el) el.innerHTML = '';
};

/* ---- Render ---- */

const resultBadge = result =>
  `<span class="result-badge result-${result}">${t('tracker.result.' + result)}</span>`;

const renderVisitorPlayerList = (hidden = false) => {
  const el = document.getElementById('visitor-player-list');
  if (!el) return;
  if (hidden) { el.innerHTML = ''; return; }
  const players = loadTrackedPlayers();
  if (!players.length) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="visitor-player-list-card">
      <h3>${t('tracker.trackedTitle')}</h3>
      <ol>${players.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
    </div>`;
};

let _currentSlug = null;

const renderStandings = (standings, slug, trackedNames, liveMatches = {}, liveRoundName = '', droppedSet = new Set()) => {
  const container = document.getElementById('standings-container');
  if (!container) return;
  renderVisitorPlayerList(true);

  if (!standings.length && !Object.keys(liveMatches).length) {
    container.innerHTML = `<p class="tracker-empty">${t('tracker.noStandings')}</p>`;
    return;
  }

  const trackedSet = new Set(trackedNames.map(n => n.toLowerCase().trim()));
  const hasLive    = Object.keys(liveMatches).length > 0;

  // Active players first (sorted by W-L), dropped players at the bottom
  const sorted = [...standings].sort((a, b) => {
    const aD = droppedSet.has(a.name);
    const bD = droppedSet.has(b.name);
    if (aD !== bD) return aD ? 1 : -1;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.losses - b.losses;
  });

  const rows = sorted.map((p, i) => {
    const tracked   = trackedSet.has(p.name.toLowerCase().trim());
    const liveMatch = liveMatches[p.name];
    const dropped   = droppedSet.has(p.name);
    const record    = `${p.wins}–${p.losses}${p.draws > 0 ? `–${p.draws}` : ''}`;
    const hid       = toId(p.name);

    const liveIndicator = liveMatch
      ? `<span class="live-match-indicator">● ${t('tracker.vs')} ${esc(liveMatch.opponent)}</span>`
      : '';

    const histRows = p.history.map(h => `
      <tr>
        <td>${esc(h.round)}</td>
        <td>${esc(h.opponent)}</td>
        <td>${esc(h.opponentHero)}</td>
        <td>${resultBadge(h.result)}</td>
      </tr>`).join('');

    const liveNote = liveMatch
      ? `<div class="live-pairing-note">● ${esc(liveRoundName)} — ${t('tracker.vs')} ${esc(liveMatch.opponent)} (${esc(liveMatch.opponentHero)})</div>`
      : '';

    return `
      <tr class="standings-row${tracked ? ' highlighted' : ''}${liveMatch ? ' live-row' : ''}${dropped ? ' dropped-row' : ''}" data-hid="${hid}" tabindex="0" role="button" aria-expanded="false">
        <td class="rank-cell">${i + 1}</td>
        <td class="player-cell">
          <span class="player-cell-inner">
            ${tracked ? '<span class="tracked-indicator" aria-hidden="true"></span>' : ''}
            <span class="player-name-text">${esc(p.name)}</span>
            ${dropped ? `<span class="dropped-badge" aria-label="${t('tracker.dropped')}">${t('tracker.dropped')}</span>` : ''}
            <span class="row-chevron" aria-hidden="true">›</span>
          </span>
        </td>
        <td>${esc(p.hero)}</td>
        <td class="record-cell">${record}${liveIndicator}</td>
      </tr>
      <tr class="history-panel-row hidden" id="${hid}">
        <td colspan="4" class="history-panel-cell">
          <div class="history-panel">
            ${liveNote}
            <table class="history-table">
              <thead><tr>
                <th>${t('tracker.card.round')}</th>
                <th>${t('tracker.col.opponent')}</th>
                <th>${t('tracker.col.hero')}</th>
                <th>${t('tracker.col.result')}</th>
              </tr></thead>
              <tbody>${histRows}</tbody>
            </table>
          </div>
        </td>
      </tr>`;
  }).join('');

  const coverageUrl = `https://fabtcg.com/coverage/${encodeURIComponent(slug)}/`;
  const liveBadge   = hasLive
    ? ` <span class="live-badge">● ${esc(liveRoundName)}</span>`
    : '';

  container.innerHTML = `
    <div class="standings-container">
      <div class="standings-header">
        <h3>${standings.length} ${t('tracker.col.player').toLowerCase()}s${liveBadge}</h3>
        <a href="${esc(coverageUrl)}" target="_blank" rel="noopener noreferrer" class="button" style="font-size:.85rem;padding:.45rem 1rem;">${t('tracker.openCoverage')}</a>
      </div>
      ${hasLive ? '<div id="tracker-live-status" class="tracker-live-status"></div>' : ''}
      <table class="standings-table">
        <thead><tr>
          <th class="rank-col">#</th>
          <th>${t('tracker.col.player')}</th>
          <th>${t('tracker.col.hero')}</th>
          <th>${t('tracker.col.record')}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  container.querySelectorAll('.standings-row').forEach(row => {
    const toggle = () => {
      const panel = document.getElementById(row.dataset.hid);
      if (!panel) return;
      panel.classList.toggle('hidden');
      const isOpen = !panel.classList.contains('hidden');
      row.classList.toggle('expanded', isOpen);
      row.setAttribute('aria-expanded', String(isOpen));
    };
    row.addEventListener('click', toggle);
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
};

/* ---- Auto-refresh ---- */

const startAutoRefresh = (slug, gen, liveRoundName) => {
  clearRefreshTimer();
  let secondsLeft = 60;
  updateLiveStatus(secondsLeft, liveRoundName);

  _refreshTimer = setInterval(() => {
    if (gen !== _generation) { clearRefreshTimer(); return; }
    secondsLeft--;
    updateLiveStatus(secondsLeft, liveRoundName);
    if (secondsLeft <= 0) {
      clearRefreshTimer();
      try { localStorage.removeItem(CACHE_PREFIX + slug); } catch {}
      loadEvent(slug);
    }
  }, 1000);
};

/* ---- Load event ---- */

let _generation = 0;

const loadEvent = async (slug) => {
  _currentSlug = slug;
  const gen = ++_generation;
  clearRefreshTimer();

  clearStandings();
  renderVisitorPlayerList(false);
  setStatus(t('tracker.loading'));

  try {
    // 1. Fetch coverage index
    const indexHtml = await proxiedFetch(`https://fabtcg.com/coverage/${encodeURIComponent(slug)}/`);
    if (gen !== _generation) return;

    const rounds = parseRoundsIndex(indexHtml, slug);
    if (!rounds.length) { setStatus(t('tracker.noStandings'), true); return; }

    const completedRounds = rounds.filter(r => r.hasResults);
    const liveRound       = rounds[rounds.length - 1]; // last announced round

    // 2. Base standings from cache or fetch
    let standings = getCached(slug);

    if (!standings) {
      if (completedRounds.length) {
        setStatus(t('tracker.roundsLoaded', { done: 0, total: completedRounds.length }));
        let done = 0;
        const fetches = await Promise.allSettled(
          completedRounds.map(r =>
            proxiedFetch(r.resultsUrl).then(html => {
              done++;
              if (gen === _generation) setStatus(t('tracker.roundsLoaded', { done, total: completedRounds.length }));
              return html;
            })
          )
        );
        if (gen !== _generation) return;

        const allRounds = completedRounds.map((r, i) => ({
          roundName: r.roundName,
          matches:   fetches[i].status === 'fulfilled' ? parseResultsPage(fetches[i].value) : [],
        }));
        standings = buildStandings(allRounds);
        setCache(slug, standings);
      } else {
        standings = [];
      }
    }

    // 3. Live round: fetch pairings (always fresh), and results if available
    let liveMatches   = {};
    let liveRoundName = '';
    let droppedSet    = new Set();

    setStatus(t('tracker.loading'));
    try {
      const pairingsHtml = await proxiedFetch(liveRound.pairingsUrl);
      if (gen !== _generation) return;

      const allPairings = parsePairingsPage(pairingsHtml);

      // Identify already-resolved matches in this round
      const resolvedSet = new Set();
      if (liveRound.hasResults) {
        const resultsHtml = await proxiedFetch(liveRound.resultsUrl);
        if (gen !== _generation) return;
        parseResultsPage(resultsHtml).forEach(m => {
          resolvedSet.add(m.p1Name);
          resolvedSet.add(m.p2Name);
        });
      }

      Object.entries(allPairings).forEach(([player, pairing]) => {
        if (!resolvedSet.has(player)) liveMatches[player] = pairing;
      });
      liveRoundName = liveRound.roundName;

      // Detect dropped players: played before but absent from this round entirely
      if (Object.keys(liveMatches).length > 0) {
        const activeInRound = new Set([...Object.keys(allPairings), ...resolvedSet]);
        standings.forEach(p => {
          if (!activeInRound.has(p.name)) droppedSet.add(p.name);
        });
      }

    } catch {
      // Pairings unavailable — event not live or proxy issue
    }

    // 4. Render
    setStatus('');
    renderStandings(standings, slug, loadTrackedPlayers(), liveMatches, liveRoundName, droppedSet);

    // 5. Auto-refresh only when matches are still in progress
    if (Object.keys(liveMatches).length > 0) {
      startAutoRefresh(slug, gen, liveRoundName);
    }

  } catch (err) {
    if (gen !== _generation) return;
    setStatus(`${t('tracker.loadError')}: ${err.message}`, true);
  }
};

/* ---- Dropdown ---- */

const populateEventDropdown = () => {
  const select = document.getElementById('event-select');
  if (!select) return;
  while (select.options.length > 1) select.remove(1);
  const events = loadEvents();
  if (!events.length) {
    const opt       = document.createElement('option');
    opt.disabled    = true;
    opt.textContent = t('tracker.event.empty');
    select.appendChild(opt);
    return;
  }
  events.forEach(ev => {
    const opt       = document.createElement('option');
    opt.value       = ev.slug;
    opt.textContent = ev.name;
    select.appendChild(opt);
  });
};

/* ---- Init ---- */

const wireEvents = () => {
  const select = document.getElementById('event-select');
  if (select) {
    select.addEventListener('change', () => {
      if (!select.value) return;
      loadEvent(select.value);
    });
  }
};

const initialize = () => {
  renderVisitorPlayerList();
  populateEventDropdown();
  wireEvents();

  document.addEventListener('langchange', () => {
    populateEventDropdown();
    if (_currentSlug) {
      const cached = getCached(_currentSlug);
      if (cached) renderStandings(cached, _currentSlug, loadTrackedPlayers());
    } else {
      renderVisitorPlayerList();
    }
  });
};

initialize();
