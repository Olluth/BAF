'use strict';

const STORAGE_KEY    = 'baf-tracked-players';
const EVENTS_KEY     = 'baf-events';
const STANDINGS_BASE = '/api/standings/';

/* ---- Storage ---- */

let _trackedPlayers = [];

const fetchTrackedPlayers = async () => {
  try {
    const r = await fetch('/api/players');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (Array.isArray(data)) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
      _trackedPlayers = data.map(n => n.trim()).filter(Boolean);
      return;
    }
  } catch {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const p   = raw ? JSON.parse(raw) : [];
    _trackedPlayers = Array.isArray(p) ? p.map(n => n.trim()).filter(Boolean) : [];
  } catch { _trackedPlayers = []; }
};

const loadTrackedPlayers = () => _trackedPlayers;

const fetchEvents = async () => {
  try {
    const r = await fetch('/api/events');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (Array.isArray(data)) {
      try { localStorage.setItem(EVENTS_KEY, JSON.stringify(data)); } catch {}
      return data.filter(e => e.active !== false);
    }
  } catch {}
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    const p   = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p.filter(e => e.active !== false) : [];
  } catch { return []; }
};

/* ---- UI helpers ---- */

const esc  = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const toId = s => 'h' + s.replace(/[^a-zA-Z0-9]/g, '-');

const _HERO_ICON_MAP = [
  ['arakni, marionette',              '/images/icon_arakni_m.webp'],
  ['arakni, 5l!p3d',                  '/images/icon_arakni_sttc-1.webp'],
  ['arakni',                          '/images/icon_arakni_th-1.webp'],
  ['aurora, legacy of the tempest',   '/images/icon_aurora_lot-2.webp'],
  ['aurora',                          '/images/icon_aurora.webp'],
  ['baalghor',                        '/images/icon_baalghor_oote.webp'],
  ['oscilio, constella intelligence', '/images/icon_oscilio_fc-1.webp'],
  ['oscilio',                         '/images/icon_oscillio.webp'],
  ['bravo, showstopper',              '/images/icon_bravo_sots.webp'],
  ['bravo, fearless',                 '/images/icon_bravo_fs.webp'],
  ['bravo',                           '/images/icon_bravo_s.webp'],
  ['dash, inventor extraordinaire',   '/images/icon_dash_ie.webp'],
  ['dash',                            '/images/icon_dash_io.webp'],
  ['kassai, cintari',                 '/images/icon_kassai_cs.webp'],
  ['kassai',                          '/images/icon_kassai_gs.webp'],
  ['kayo, army of darkness',          '/images/icon_kayo_ad.webp'],
  ['kayo',                            '/images/icon_kayo_uc-2.webp'],
  ['oldhim',                          '/images/icon_oldhim-1.webp'],
  ['prism, sculptor',                 '/images/icon_prism_soa.webp'],
  ['prism',                           '/images/icon_prism_aos.webp'],
  ['rhinar',                          '/images/icon_rhinar_rr-1.webp'],
  ['hala',                            '/images/icon_hala_pos.webp'],
  ['pleiades',                        '/images/icon_pleiades-1.webp'],
  ['lyath',                           '/images/icon_lyath-2.webp'],
  ['tuffnut',                         '/images/icon_tuffnut-1.webp'],
  ['zyggy',                           '/images/icon_zyggy-1.webp'],
  ['azalea',                          '/images/icon_azalea.webp'],
  ['benji',                           '/images/icon_benji.webp'],
  ['betsy',                           '/images/icon_betsy.webp'],
  ['blaze',                           '/images/icon_blaze.webp'],
  ['boltyn',                          '/images/icon_boltyn.webp'],
  ['brevant',                         '/images/icon_brevant.webp'],
  ['briar',                           '/images/icon_briar.webp'],
  ['chane',                           '/images/icon_chane.webp'],
  ['cindra',                          '/images/icon_cindra.webp'],
  ['data doll',                       '/images/icon_datadoll.webp'],
  ['dorinthea',                       '/images/icon_dorinthea.webp'],
  ['dromai',                          '/images/icon_dromai.webp'],
  ['emperor',                         '/images/icon_emperor.webp'],
  ['enigma',                          '/images/icon_enigma.webp'],
  ['fai',                             '/images/icon_fai.webp'],
  ['fang',                            '/images/icon_fang.webp'],
  ['florian',                         '/images/icon_florian.webp'],
  ['frankie',                         '/images/icon_frankie.webp'],
  ['genis',                           '/images/icon_genis.webp'],
  ['gravybones',                      '/images/icon_gravybones.webp'],
  ['ira',                             '/images/icon_ira.webp'],
  ['iyslander',                       '/images/icon_iyslander.webp'],
  ['jarl',                            '/images/icon_jarl.webp'],
  ['kano',                            '/images/icon_kano.webp'],
  ['katsu',                           '/images/icon_katsu.webp'],
  ['kavdaen',                         '/images/icon_kavdaen.webp'],
  ['levia',                           '/images/icon_levia.webp'],
  ['lexi',                            '/images/icon_lexi.webp'],
  ['marlynn',                         '/images/icon_marlynn.webp'],
  ['maxx nitro',                      '/images/icon_maxxnitro.webp'],
  ['melody',                          '/images/icon_melody.webp'],
  ["nu'u",                            '/images/icon_nuu.webp'],
  ['nuu',                             '/images/icon_nuu.webp'],
  ['olympia',                         '/images/icon_olympia.webp'],
  ['puffin',                          '/images/icon_puffin.webp'],
  ['riptide',                         '/images/icon_riptide.webp'],
  ['scurv',                           '/images/icon_scurv.webp'],
  ['shiyana',                         '/images/icon_shiyana.webp'],
  ['teklovossen',                     '/images/icon_teklovossen.webp'],
  ['terra',                           '/images/icon_terra.webp'],
  ['uzuri',                           '/images/icon_uzuri.webp'],
  ['valda',                           '/images/icon_valda.webp'],
  ['verdance',                        '/images/icon_verdance.webp'],
  ['victor',                          '/images/icon_victor.webp'],
  ['viserai',                         '/images/icon_viserai.webp'],
  ['vynnset',                         '/images/icon_vynnset.webp'],
  ['yoji',                            '/images/icon_yoji.webp'],
  ['zen',                             '/images/icon_zen.webp'],
];

const getHeroIcon = (heroName) => {
  if (!heroName) return null;
  const n = heroName.toLowerCase();
  for (const [key, path] of _HERO_ICON_MAP) {
    if (n.startsWith(key)) return path;
  }
  return null;
};

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

let _currentSlug  = null;
let _eventsCache  = [];

const toEmbedUrl = (url) => {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=0`;
  const tw = url.match(/(?:twitch\.tv\/)([a-zA-Z0-9_]+)/);
  if (tw) return `https://player.twitch.tv/?channel=${tw[1]}&parent=${location.hostname}`;
  if (url.startsWith('http')) return url;
  return null;
};

const renderStreamEmbed = (slug) => {
  const el = document.getElementById('stream-embed');
  if (!el) return;
  if (el.dataset.slug === slug) return;
  el.dataset.slug = slug;
  const ev = _eventsCache.find(e => e.slug === slug);
  const embedUrl = ev ? toEmbedUrl(ev.streamUrl) : null;
  if (!embedUrl) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  el.classList.remove('hidden');
  el.innerHTML = `<iframe src="${esc(embedUrl)}" allowfullscreen allow="autoplay; fullscreen"></iframe>`;
};

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

  const rankMap = new Map(standings.map((p, i) => [p.name.toLowerCase().trim(), i + 1]));
  const total   = standings.length;

  const rows = sorted.map((p, i) => {
    const tracked   = trackedSet.has(p.name.toLowerCase().trim());
    const liveMatch = liveMatches[p.name];
    const dropped   = droppedSet.has(p.name);
    const record    = `${p.wins}–${p.losses}${p.draws > 0 ? `–${p.draws}` : ''}`;
    const hid       = toId(p.name);
    const rank      = rankMap.get(p.name.toLowerCase().trim()) ?? (i + 1);

    const lastH       = p.history.length ? p.history[p.history.length - 1] : null;
    const heroIcon    = (heroName) => { const src = getHeroIcon(heroName || ''); return src ? `<img src="${esc(src)}" class="hero-icon" title="${esc(heroName || '')}" loading="lazy">` : `<span class="hero-icon-text">${esc((heroName || '').split(',')[0])}</span>`; };
    const matchupCell = lastH
      ? `<td class="matchup-cell"><div class="hero-matchup">${heroIcon(p.hero)}<span class="vs-x">×</span>${heroIcon(lastH.opponentHero)}</div></td>`
      : `<td class="matchup-cell">—</td>`;
    const liveCell    = `<td class="live-round-cell">${lastH ? esc(lastH.round) : '—'}</td>`;
    const roundResult = liveRoundName && lastH && lastH.round === liveRoundName ? lastH.result : null;
    const recordClass = roundResult === 'win' ? ' score-highlight-win' : (roundResult === 'loss' || roundResult === 'draw') ? ' score-highlight-loss' : '';

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
        <td class="rank-cell">${rank}${total ? '/' + total : ''}</td>
        <td class="player-cell">
          <span class="player-cell-inner">
            ${tracked ? '<span class="tracked-indicator" aria-hidden="true"></span>' : ''}
            <span class="player-name-text">${esc(p.name)}</span>
            ${dropped ? `<span class="dropped-badge" aria-label="${t('tracker.dropped')}">${t('tracker.dropped')}</span>` : ''}
            <span class="row-chevron" aria-hidden="true">›</span>
          </span>
        </td>
        <td>${esc(p.hero)}</td>
        ${matchupCell}
        <td class="record-cell${recordClass}">${record}</td>
        ${liveCell}
      </tr>
      <tr class="history-panel-row hidden" id="${hid}">
        <td colspan="6" class="history-panel-cell">
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
          <th class="matchup-col"></th>
          <th>${t('tracker.col.record')}</th>
          <th class="live-round-col">${t('tracker.col.liveRound')}</th>
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
  const isRefresh = slug === _currentSlug;
  _currentSlug = slug;
  renderStreamEmbed(slug);
  const gen = ++_generation;
  clearRefreshTimer();
  if (!isRefresh) {
    clearStandings();
    renderVisitorPlayerList(false);
    setStatus(t('tracker.loading'));
  }

  try {
    const r = await fetch(`${STANDINGS_BASE}${encodeURIComponent(slug)}?_=${Date.now()}`);
    if (gen !== _generation) return;
    if (r.status === 404) { setStatus(t('tracker.noStandings'), true); return; }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if (gen !== _generation) return;

    setStatus('');
    const droppedSet   = new Set(data.droppedPlayers || []);
    const newStandings = data.standings || [];
    renderStandings(newStandings, slug, loadTrackedPlayers(), data.liveMatches || {}, data.liveRoundName || '', droppedSet);

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

const populateEventDropdown = async () => {
  const select = document.getElementById('event-select');
  if (!select) return;
  while (select.options.length > 1) select.remove(1);
  const events = await fetchEvents();
  if (!events.length) {
    const opt       = document.createElement('option');
    opt.disabled    = true;
    opt.textContent = t('tracker.event.empty');
    select.appendChild(opt);
    return;
  }
  _eventsCache = events;
  let defaultSlug = '';
  events.forEach(ev => {
    const opt       = document.createElement('option');
    opt.value       = ev.slug;
    opt.textContent = ev.name;
    select.appendChild(opt);
    if (ev.isDefault) defaultSlug = ev.slug;
  });
  if (defaultSlug && !_currentSlug) {
    select.value = defaultSlug;
    loadEvent(defaultSlug);
  }
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

const initialize = async () => {
  await fetchTrackedPlayers();
  renderVisitorPlayerList();
  await populateEventDropdown();
  wireEvents();

  document.addEventListener('langchange', async () => {
    await populateEventDropdown();
    if (_currentSlug) loadEvent(_currentSlug);
    else renderVisitorPlayerList();
  });
};

initialize();
