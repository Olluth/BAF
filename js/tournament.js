'use strict';

const STORAGE_KEY   = 'baf-tracked-players';
const EVENTS_KEY    = 'baf-events';
const STANDINGS_URL = 'https://raw.githubusercontent.com/Olluth/BAF/main/data/standings.json';

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

/* ---- UI helpers ---- */

const esc  = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const toId = s => 'h' + s.replace(/[^a-zA-Z0-9]/g, '-');

let _refreshTimer = null;

const clearRefreshTimer = () => {
  if (_refreshTimer) { clearTimeout(_refreshTimer); _refreshTimer = null; }
};

const setStatus = (msg, isError = false) => {
  const el = document.getElementById('tracker-status');
  if (!el) return;
  if (!msg) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.className = 'tracker-status' + (isError ? ' tracker-status-error' : '');
  el.textContent = msg;
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

  // When tracked players are configured, show only them
  const filtered = trackedSet.size > 0
    ? standings.filter(p => trackedSet.has(p.name.toLowerCase().trim()))
    : standings;

  const sorted = [...filtered].sort((a, b) => {
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
        <h3>${filtered.length} ${t('tracker.col.player').toLowerCase()}s${liveBadge}</h3>
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
    const r = await fetch(`${STANDINGS_URL}?_=${Date.now()}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (gen !== _generation) return;

    if (!data || data.slug !== slug) {
      setStatus(t('tracker.noStandings'), true);
      return;
    }

    setStatus('');
    const droppedSet = new Set(data.droppedPlayers || []);
    renderStandings(
      data.standings    || [],
      slug,
      loadTrackedPlayers(),
      data.liveMatches  || {},
      data.liveRoundName || '',
      droppedSet
    );

    if (data.liveRoundName) {
      const ageMin = Math.round((Date.now() - new Date(data.lastUpdated).getTime()) / 60000);
      const liveEl = document.getElementById('tracker-live-status');
      if (liveEl) liveEl.textContent = `● ${data.liveRoundName} — ${t('tracker.updated', { min: ageMin })}`;
      _refreshTimer = setTimeout(() => {
        if (gen === _generation) loadEvent(slug);
      }, 60 * 1000);
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
    if (_currentSlug) loadEvent(_currentSlug);
    else renderVisitorPlayerList();
  });
};

initialize();
