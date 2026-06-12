'use strict';

const STORAGE_KEY = 'baf-tracked-players';
const EVENTS_KEY  = 'baf-events';

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

const renderVisitorPlayerList = () => {
  const container = document.getElementById('visitor-player-list');
  if (!container) return;
  const players = loadTrackedPlayers();
  if (!players.length) {
    container.innerHTML = `<div class="visitor-player-list-card"><p>${t('tracker.noPlayers')}</p></div>`;
    return;
  }
  container.innerHTML = `
    <div class="visitor-player-list-card">
      <h3>${t('tracker.trackedTitle')}</h3>
      <ol>${players.map((p) => `<li>${p}</li>`).join('')}</ol>
    </div>`;
};

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
    opt.value = ev.slug;
    opt.textContent = ev.name;
    select.appendChild(opt);
  });
};

const loadEvent = (slug) => {
  const url = `https://fabtcg.com/coverage/${encodeURIComponent(slug)}/`;
  const iframe = document.getElementById('coverage-iframe');
  const container = document.getElementById('coverage-container');
  const link = document.getElementById('coverage-external-link');

  if (iframe) iframe.src = url;
  if (link) link.href = url;
  if (container) container.classList.remove('hidden');
};

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
    renderVisitorPlayerList();
    populateEventDropdown();
  });
};

initialize();
