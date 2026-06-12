const trackerForm = document.getElementById('tracker-form');
const status = document.getElementById('tracker-status');
const standingsContainer = document.getElementById('standings-container');
const trackedPlayersContainer = document.getElementById('tracked-players');
const visitorPlayersSection = document.getElementById('visitor-player-list');

const storageKey = 'baf-tracked-players';
let trackedPlayers = [];
let lastRows = null;

const loadTrackedPlayers = () => {
  try {
    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed)
      ? parsed.map((name) => name.trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
};

const renderVisitorPlayerList = () => {
  if (!visitorPlayersSection) return;
  if (!trackedPlayers.length) {
    visitorPlayersSection.innerHTML = `<div class="visitor-player-list-card"><p>${t('tracker.noPlayers')}</p></div>`;
    return;
  }

  visitorPlayersSection.innerHTML = `
    <div class="visitor-player-list-card">
      <h3>${t('tracker.trackedTitle')}</h3>
      <ol>
        ${trackedPlayers.map((player) => `<li>${player}</li>`).join('')}
      </ol>
    </div>
  `;
};

const buildApiUrl = (slug, view, round) => {
  return `https://fabtcg.com/coverage/${encodeURIComponent(slug)}/${encodeURIComponent(view)}/${encodeURIComponent(round)}/`;
};

const parseStandings = (data) => {
  if (!data || !Array.isArray(data.standings)) return null;

  return data.standings.map((entry) => ({
    rank: entry.rank ?? '-',
    player: entry.player ?? entry.name ?? t('tracker.unknown'),
    score: entry.score ?? entry.points ?? '-',
    record: entry.record ?? '-',
    hero: entry.hero ?? entry.character ?? t('tracker.unknown'),
    opponent: entry.opponent ?? entry.opponent_name ?? t('tracker.tbd'),
    round: entry.round ?? entry.match_round ?? '-',
  }));
};

const renderStandings = (rows) => {
  if (!standingsContainer) return;
  if (!rows?.length) {
    standingsContainer.innerHTML = `<p>${t('tracker.noStandings')}</p>`;
    return;
  }

  const normalizedTracked = trackedPlayers.map((v) => v.trim().toLowerCase()).filter(Boolean);
  const isWatched = (player) => normalizedTracked.some((name) => player.toLowerCase().includes(name));

  const tableRows = rows
    .map(
      (row) => `<tr class="${isWatched(row.player) ? 'highlighted' : ''}">
      <td>${row.rank}</td>
      <td>${row.player}</td>
      <td>${row.hero}</td>
      <td>${row.opponent}</td>
      <td>${row.score}</td>
      <td>${row.record}</td>
    </tr>`,
    )
    .join('');

  standingsContainer.innerHTML = `
    <table class="standings-table">
      <thead>
        <tr>
          <th>${t('tracker.col.rank')}</th>
          <th>${t('tracker.col.player')}</th>
          <th>${t('tracker.col.hero')}</th>
          <th>${t('tracker.col.opponent')}</th>
          <th>${t('tracker.col.score')}</th>
          <th>${t('tracker.col.record')}</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
};

const setStatus = (message, isError = false) => {
  if (!status) return;
  status.textContent = message;
  status.style.backgroundColor = isError ? 'rgba(248, 113, 113, 0.12)' : 'rgba(187, 222, 251, 0.15)';
  status.style.color = isError ? '#fecaca' : '#f9e6c5';
};

const renderTrackedPlayers = (rows) => {
  if (!trackedPlayersContainer) return;

  const normalizedTracked = trackedPlayers.map((v) => v.trim().toLowerCase()).filter(Boolean);
  const watchedRows = rows.filter((row) =>
    normalizedTracked.some((name) => row.player.toLowerCase().includes(name)),
  );

  if (!watchedRows.length) {
    trackedPlayersContainer.innerHTML = `<p>${t('tracker.noTrackedFound')}</p>`;
    return;
  }

  trackedPlayersContainer.innerHTML = watchedRows
    .map(
      (row) => `
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
      </article>`,
    )
    .join('');
};

const fetchStandings = async (slug, view, round) => {
  const url = buildApiUrl(slug, view, round);
  setStatus(t('tracker.loading'));
  if (standingsContainer) standingsContainer.innerHTML = '';
  lastRows = null;

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`${t('tracker.loadError')} (${response.status})`);

    const data = await response.json();
    const rows = parseStandings(data);
    if (!rows) throw new Error(t('tracker.formatError'));

    lastRows = rows;
    renderStandings(rows);
    renderTrackedPlayers(rows);

    const count = rows.filter((row) =>
      trackedPlayers.some((name) => row.player.toLowerCase().includes(name.toLowerCase())),
    ).length;
    const key = count === 1 ? 'tracker.loaded' : 'tracker.loaded.plural';
    setStatus(t(key, { count }));
  } catch (error) {
    setStatus(`${t('tracker.fetchError')} ${error.message}`, true);
    if (standingsContainer)
      standingsContainer.innerHTML = `<p>${t('tracker.networkError')}</p>`;
  }
};

const initialize = () => {
  trackedPlayers = loadTrackedPlayers();
  renderVisitorPlayerList();

  if (trackerForm) {
    trackerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const slug = document.getElementById('event-slug').value.trim();
      const view = document.getElementById('coverage-view').value.trim();
      const round = document.getElementById('round-number').value.trim();

      if (!slug || !view || !round) {
        setStatus(t('tracker.fillFields'), true);
        return;
      }

      fetchStandings(slug, view, round);
    });
  }

  document.addEventListener('langchange', () => {
    renderVisitorPlayerList();
    if (lastRows) {
      renderStandings(lastRows);
      renderTrackedPlayers(lastRows);
    }
  });
};

initialize();
