'use strict';
(function () {
  const esc     = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const today   = () => new Date().toISOString().slice(0, 10);
  const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString(
    document.documentElement.lang === 'en' ? 'en-GB' : 'fr-FR',
    { day: 'numeric', month: 'long', year: 'numeric' }
  );

  const fetchAgenda = async () => {
    try { const r = await fetch('/api/agenda'); return r.ok ? r.json() : []; }
    catch { return []; }
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
        <span class="agenda-card-date">${fmtDate(e.date)}</span>
        <h3 class="agenda-card-name">${esc(e.name)}</h3>
        ${e.link ? `<a href="${esc(e.link)}" target="_blank" rel="noopener noreferrer" class="button agenda-card-btn">Voir l'événement ↗</a>` : ''}
      </div>
    </div>`;

  /* Next event featured card on index.html */
  const renderNextEvent = async () => {
    const el = document.getElementById('next-event-card');
    if (!el) return;
    const agenda   = await fetchAgenda();
    const upcoming = agenda.filter(e => e.date >= today()).sort((a, b) => a.date.localeCompare(b.date));
    if (!upcoming.length) {
      el.innerHTML = '<p style="opacity:.4;font-style:italic">Aucun événement à venir.</p>';
      return;
    }
    const e = upcoming[0];
    el.innerHTML = `
      ${e.link ? `<a href="${esc(e.link)}" target="_blank" rel="noopener noreferrer">` : '<div>'}
        ${e.image ? `<img src="${esc(e.image)}" alt="${esc(e.name)}" class="event-featured-img" />` : ''}
      ${e.link ? '</a>' : '</div>'}
      <div class="event-featured-body">
        <span class="event-label">Prochain événement</span>
        <h2>${esc(e.name)}</h2>
        <p>${fmtDate(e.date)}</p>
      </div>`;
  };

  /* Full agenda list on events.html */
  const renderAgendaList = async () => {
    const el = document.getElementById('agenda-events-list');
    if (!el) return;
    const agenda   = await fetchAgenda();
    const t        = today();
    const upcoming = agenda.filter(e => e.date >= t).sort((a, b) => a.date.localeCompare(b.date));
    const past     = agenda.filter(e => e.date <  t).sort((a, b) => b.date.localeCompare(a.date));

    if (!upcoming.length && !past.length) {
      el.innerHTML = '<p style="opacity:.4;font-style:italic">Aucun événement pour le moment.</p>';
      return;
    }

    let html = '<div class="agenda-grid">' + upcoming.map(e => card(e, false)).join('') + '</div>';
    if (past.length) {
      html += '<div class="agenda-past-heading">Événements passés</div>';
      html += '<div class="agenda-grid">' + past.map(e => card(e, true)).join('') + '</div>';
    }
    el.innerHTML = html;
  };

  renderNextEvent();
  renderAgendaList();
  document.addEventListener('langchange', () => { renderNextEvent(); renderAgendaList(); });
})();
