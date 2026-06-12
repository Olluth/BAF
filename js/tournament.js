'use strict';

const STORAGE_KEY = 'baf-tracked-players';
const EVENTS_KEY  = 'baf-events';

let trackedPlayers = [];
let lastRows       = null;
let currentSlug    = null;
let currentView    = 'main';
let currentRound   = 1;
let maxRound       = 1;

// --- Data ---

const loadTrackedPlayers = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((n) => n.trim()).filter(Boolean) : [];
  } catch { return []; }
};

const loadEvents = () => {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((e) => e.active !== false) : [];
  } catch { return []; }
};

// --- API ---

// fabtcg.com does not send CORS headers, so requests from the browser
// are blocked. We route through corsproxy.io which adds the missing header.
const CORS_PROXY = 'https://corsproxy.io/?';

const buildApiUrl = (slug, view, round) => {
  const target = `https://fabtcg.com/coverage/${encodeURIComponent(slug)}/${encodeURIComponent(view)}/${encodeURIComponent(round)}/`;
  return `${CORS_PROXY}${target}`;
};

const parseStandings = (data) => {
  if (!data || !Array.isArray(data.standings)) return null;
  return data.standings.map((entry) => ({
    rank:     entry.rank     ?? '-',
    player:   entry.player   ?? entry.name          ?? t('tracker.unknown'),
    score:    entry.score    ?? entry.points         ?? '-',
    record:   entry.record   ?? '-',
    hero:     entry.hero     ?? entry.character      ?? t('tracker.unknown'),
    opponent: entry.opponent ?? entry.opponent_name  ?? t('tracker.tbd'),
    round:    entry.round    ?? entry.match_round    ?? '-',
  }));
};

const tryFetchRound = async (slug, view, round) => {
  const url = buildApiUrl(slug, view, round);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) {
      return { error: `HTTP ${r.status} ${r.statusText}`, round };
    }
    const data = await r.json();
    const rows = parseStandings(data);
    return rows && rows.length ? { round, rows } : { noData: true, round };
  } catch (err) {
    return { error: err.message || 'Fetch failed', round };
  }
};

// Fire rounds 1-15 in parallel, return the highest round that has data or the last error.
const detectCurrentRound = async (slug, view) => {
  const MAX = 15;
  const results = await Promise.allSettled(
    Array.from({ length: MAX }, (_, i) => tryFetchRound(slug, view, i + 1)),
  );
  let lastError = null;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i].status !== 'fulfilled') continue;
    const val = results[i].value;
    if (!val) continue;
    if (val.rows) return val;
    if (val.error) lastError = val.error;
  }
  return { error: lastError || t('tracker.loadError') };
};

// --- Status bar ---

const setStatus = (msg, isError = false) => {
  const el = document.getElementById('tracker-status');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  el.style.backgroundColor = isError ? 'rgba(248, 113, 113, 0.12)' : 'rgba(187, 222, 251, 0.15)';
  el.style.color = isError ? '#fecaca' : '#f9e6c5';
};

// --- Round nav ---

const updateRoundDisplay = (round) => {
  currentRound = round;
  const el = document.getElementById('round-display');
  if (el) el.textContent = `Round ${round}`;
  const prev = document.getElementById('round-prev');
  if (prev) prev.disabled = round <= 1;
};

const showRoundNav = (show) => {
  const nav = document.getElementById('round-nav');
  if (nav) nav.classList.toggle('hidden', !show);
};

// --- Renders ---

const renderVisitorPlayerList = () => {
  const container = document.getElementById('visitor-player-list');
  if (!container) return;
  if (!trackedPlayers.length) {
    container.innerHTML = `<div class="visitor-player-list-card"><p>${t('tracker.noPlayers')}</p></div>`;
    return;
  }
  container.innerHTML = `
    <div class="visitor-player-list-card">
      <h3>${t('tracker.trackedTitle')}</h3>
      <ol>${trackedPlayers.map((p) => `<li>${p}</li>`).join('')}</ol>
    </div>`;
};

const renderStandings = (rows) => {
  const container = document.getElementById('standings-container');
  if (!container) return;
  if (!rows?.length) {
    container.innerHTML = `<p>${t('tracker.noStandings')}</p>`;
    return;
  }
  const normalized = trackedPlayers.map((v) => v.trim().toLowerCase());
  const isWatched  = (player) => normalized.some((n) => player.toLowerCase().includes(n));

  const tableRows = rows.map((row) => `
    <tr class="${isWatched(row.player) ? 'highlighted' : ''}">
      <td>${row.rank}</td>
      <td>${row.player}</td>
      <td>${row.hero}</td>
      <td>${row.opponent}</td>
      <td>${row.score}</td>
      <td>${row.record}</td>
    </tr>`).join('');

  container.innerHTML = `
    <table class="standings-table">
      <thead><tr>
        <th>${t('tracker.col.rank')}</th>
        <th>${t('tracker.col.player')}</th>
        <th>${t('tracker.col.hero')}</th>
        <th>${t('tracker.col.opponent')}</th>
        <th>${t('tracker.col.score')}</th>
        <th>${t('tracker.col.record')}</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table>`;
};

const renderTrackedPlayers = (rows) => {
  const container = document.getElementById('tracked-players');
  if (!container) return;
  const normalized = trackedPlayers.map((v) => v.trim().toLowerCase());
  const watched    = rows.filter((row) => normalized.some((n) => row.player.toLowerCase().includes(n)));

  if (!watched.length) {
    container.innerHTML = trackedPlayers.length ? `<p>${t('tracker.noTrackedFound')}</p>` : '';
    return;
  }
  container.innerHTML = watched.map((row) => `
    <article class="player-card">
      <h3>${row.player}</h3>
      <dl>
        <div><dt>${t('tracker.card.rank')}</dt><dd>${row.rank}</dd></div>
        <div><dt>${t('tracker.card.hero')}</dt><dd>${row.hero}</dd></div>
        <div><dt>${t('tracker.card.opponent')}</dt><dd>${row.opponent}</dd></div>
        <div><dt>${t('tracker.card.score')}</dt><dd>${row.score}</dd></div>
        <div><dt>${t('tracker.card.record')}</dt><dd>${row.record}</dd></div>
        <div><dt>${t('tracker.card.round')}</dt><dd>${row.round}</dd></div>
      </dl>
    </article>`).join('');
};

// --- Event dropdown ---

const populateEventDropdown = () => {
  const select = document.getElementById('event-select');
  if (!select) return;
  const events = loadEvents();

  while (select.options.length > 1) select.remove(1);

  if (!events.length) {
    const opt = document.createElement('option');
    opt.disabled = true;
    opt.textContent = t('tracker.event.empty');
    select.appendChild(opt);
    return;
  }
  events.forEach((ev) => {
    const opt = document.createElement('option');
    opt.value = JSON.stringify({ slug: ev.slug, view: ev.view || 'main' });
    opt.textContent = ev.name;
    select.appendChild(opt);
  });
};

// --- Load helpers ---

const applyRows = (rows) => {
  lastRows = rows;
  renderStandings(rows);
  renderTrackedPlayers(rows);
  const count = rows.filter((row) =>
    trackedPlayers.some((n) => row.player.toLowerCase().includes(n.toLowerCase())),
  ).length;
  setStatus(t(count === 1 ? 'tracker.loaded' : 'tracker.loaded.plural', { count }));
};

const loadAndDisplayRound = async (slug, view, round) => {
  setStatus(t('tracker.loading'));
  const result = await tryFetchRound(slug, view, round);
  if (!result || !result.rows) {
    if (result?.error) {
      setStatus(`${t('tracker.fetchError')} ${result.error}`, true);
      document.getElementById('standings-container').innerHTML = `<p>${t('tracker.networkError')}</p>`;
    } else {
      setStatus(t('tracker.loadError'), true);
      document.getElementById('standings-container').innerHTML = `<p>${t('tracker.networkError')}</p>`;
    }
    return false;
  }
  updateRoundDisplay(round);
  applyRows(result.rows);
  return true;
};

const loadEvent = async (slug, view) => {
  currentSlug = slug;
  currentView = view;
  showRoundNav(false);
  setStatus(t('tracker.round.detecting'));
  document.getElementById('standings-container').innerHTML = '';
  document.getElementById('tracked-players').innerHTML   = '';

  let result = await detectCurrentRound(slug, view);
  let attemptedView = view;
  if (!result || !result.rows) {
    const fallbackView = view === 'results' ? 'main' : 'results';
    if (fallbackView !== view) {
      const fallback = await detectCurrentRound(slug, fallbackView);
      if (fallback && fallback.rows) {
        currentView = fallbackView;
        result = fallback;
        attemptedView = fallbackView;
      }
    }
  }

  if (!result || !result.rows) {
    setStatus(`${t('tracker.fetchError')} ${result?.error || t('tracker.loadError')}`, true);
    document.getElementById('standings-container').innerHTML = `<p>${t('tracker.networkError')}</p>`;
    return;
  }

  maxRound = result.round;
  updateRoundDisplay(result.round);
  showRoundNav(true);
  applyRows(result.rows);
  if (attemptedView !== view) {
    setStatus(`${t('tracker.loaded.plural', { count: result.rows.filter((row) => trackedPlayers.some((n) => row.player.toLowerCase().includes(n.toLowerCase()))).length })} (${t('tracker.viewFallback', { view: attemptedView })})`);
  }
};

// --- Wire ---

const wireEvents = () => {
  const select = document.getElementById('event-select');
  if (select) {
    select.addEventListener('change', () => {
      if (!select.value) return;
      try {
        const { slug, view } = JSON.parse(select.value);
        loadEvent(slug, view);
      } catch {}
    });
  }

  document.getElementById('round-prev')?.addEventListener('click', async () => {
    if (currentRound <= 1 || !currentSlug) return;
    const ok = await loadAndDisplayRound(currentSlug, currentView, currentRound - 1);
    if (ok) maxRound = Math.max(maxRound, currentRound);
  });

  document.getElementById('round-next')?.addEventListener('click', async () => {
    if (!currentSlug) return;
    const ok = await loadAndDisplayRound(currentSlug, currentView, currentRound + 1);
    if (ok) maxRound = Math.max(maxRound, currentRound);
  });
};

// --- Initialize ---

const initialize = () => {
  trackedPlayers = loadTrackedPlayers();
  renderVisitorPlayerList();
  populateEventDropdown();
  wireEvents();

  document.addEventListener('langchange', () => {
    trackedPlayers = loadTrackedPlayers();
    renderVisitorPlayerList();
    populateEventDropdown();
    if (lastRows) {
      renderStandings(lastRows);
      renderTrackedPlayers(lastRows);
    }
  });
};

initialize();
