'use strict';
(function () {
  const CACHE_KEY = 'baf-agenda-cache';

  const BIG_TIERS = new Set(['Calling', 'World Championship', 'Battleground', 'WCQ']);
  const MID_TIERS = new Set(['Skirmish', 'Pro Quest', 'Road to National']);

  const esc     = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const today   = () => new Date().toISOString().slice(0, 10);
  const cutoff  = () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); };
  const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString(
    document.documentElement.lang === 'en' ? 'en-GB' : 'fr-FR',
    { day: 'numeric', month: 'long', year: 'numeric' }
  );
  const fmtShort = d => new Date(d + 'T12:00:00').toLocaleDateString(
    document.documentElement.lang === 'en' ? 'en-GB' : 'fr-FR',
    { day: 'numeric', month: 'short' }
  );

  const TIER_CLASS = {
    'Armory':               'agenda-tier-armory',
    'Skirmish':             'agenda-tier-skirmish',
    'Showdown':             'agenda-tier-showdown',
    'Pro Quest':            'agenda-tier-proquest',
    'Road to National':     'agenda-tier-rtn',
    'Battleground':         'agenda-tier-battleground',
    'WCQ':                  'agenda-tier-wcq',
    'Calling':              'agenda-tier-calling',
    'Pro Tour':             'agenda-tier-pt',
    'National Championship':'agenda-tier-national',
    'World Championship':   'agenda-tier-world',
  };

  const fetchAgenda = async () => {
    try {
      const r = await fetch('/api/agenda');
      if (r.ok) {
        const data = await r.json();
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
        return data;
      }
    } catch {}
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  };

  const tierBadge = tier => {
    if (!tier) return '';
    const cls = TIER_CLASS[tier] || 'agenda-tier-other';
    return `<span class="agenda-tier-badge ${cls}">${esc(tier)}</span>`;
  };

  const card = (e, muted) => `
    <div class="agenda-card${muted ? ' agenda-card-past' : ''}">
      ${e.link
        ? `<a href="${esc(e.link)}" target="_blank" rel="noopener noreferrer" class="agenda-card-img-wrap">`
        : '<div class="agenda-card-img-wrap">'}
        ${e.image
          ? `<img src="${esc(e.image)}" alt="${esc(e.name)}" class="agenda-card-img" />`
          : '<div class="agenda-card-img agenda-card-no-img"></div>'}
      ${e.link ? '</a>' : '</div>'}
      <div class="agenda-card-body">
        <div class="agenda-card-meta">
          <span class="agenda-card-date">${fmtDate(e.date)}</span>
          ${tierBadge(e.tier)}
        </div>
        <h3 class="agenda-card-name">${esc(e.name)}</h3>
        ${e.link ? `<a href="${esc(e.link)}" target="_blank" rel="noopener noreferrer" class="button agenda-card-btn">Voir l'événement ↗</a>` : ''}
      </div>
    </div>`;

  /* Featured big-event card on index.html */
  const renderNextEvent = async () => {
    const el = document.getElementById('next-event-card');
    if (!el) return;
    const agenda = await fetchAgenda();
    const t = today();
    const big = agenda.filter(e => e.date >= t && BIG_TIERS.has(e.tier))
                      .sort((a, b) => a.date.localeCompare(b.date));
    if (!big.length) { el.innerHTML = '<p style="opacity:.4;font-style:italic">Aucun grand événement à venir.</p>'; return; }
    const e = big[0];
    el.innerHTML = `
      ${e.link ? `<a href="${esc(e.link)}" target="_blank" rel="noopener noreferrer">` : '<div>'}
        ${e.image ? `<img src="${esc(e.image)}" alt="${esc(e.name)}" class="event-featured-img" />` : ''}
      ${e.link ? '</a>' : '</div>'}
      <div class="event-featured-body">
        <span class="event-label">Prochain événement majeur</span>
        ${tierBadge(e.tier)}
        <h2>${esc(e.name)}</h2>
        <p>${fmtDate(e.date)}</p>
      </div>`;
  };

  /* Mid-tier strip on index.html */
  const renderMidEvents = async () => {
    const el = document.getElementById('next-mid-events');
    if (!el) return;
    const agenda = await fetchAgenda();
    const t = today();
    const mid = agenda.filter(e => e.date >= t && MID_TIERS.has(e.tier))
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .slice(0, 3);
    if (!mid.length) { el.innerHTML = ''; return; }
    el.innerHTML = `
      <div class="mid-events-strip">
        ${mid.map(e => `
          <div class="mid-event-item${e.link ? '' : ''}">
            ${e.link ? `<a href="${esc(e.link)}" target="_blank" rel="noopener noreferrer" class="mid-event-link">` : '<span class="mid-event-link">'}
              ${tierBadge(e.tier)}
              <span class="mid-event-name">${esc(e.name)}</span>
              <span class="mid-event-date">${fmtShort(e.date)}</span>
            ${e.link ? '</a>' : '</span>'}
          </div>`).join('')}
      </div>`;
  };

  /* Full agenda list on events.html */
  const renderAgendaList = async () => {
    const el = document.getElementById('agenda-events-list');
    if (!el) return;
    const agenda = await fetchAgenda();
    const t = today();
    const c = cutoff();
    const upcoming = agenda.filter(e => e.date >= t).sort((a, b) => a.date.localeCompare(b.date));
    const recent   = agenda.filter(e => e.date >= c && e.date < t).sort((a, b) => b.date.localeCompare(a.date));
    if (!upcoming.length && !recent.length) {
      el.innerHTML = '<p style="opacity:.4;font-style:italic">Aucun événement pour le moment.</p>';
      return;
    }
    let html = '<div class="agenda-grid">' + upcoming.map(e => card(e, false)).join('') + '</div>';
    if (recent.length) {
      html += '<div class="agenda-past-heading">Événements récents</div>';
      html += '<div class="agenda-grid">' + recent.map(e => card(e, true)).join('') + '</div>';
    }
    el.innerHTML = html;
  };

  renderNextEvent();
  renderMidEvents();
  renderAgendaList();
  document.addEventListener('langchange', () => { renderNextEvent(); renderMidEvents(); renderAgendaList(); });
})();
