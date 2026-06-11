const trackerForm = document.getElementById('tracker-form');
const status = document.getElementById('tracker-status');
const standingsContainer = document.getElementById('standings-container');
const trackedPlayersContainer = document.getElementById('tracked-players');
const visitorPlayersSection = document.getElementById('visitor-player-list');
const adminPanel = document.getElementById('admin-panel');
const adminPlayerInput = document.getElementById('admin-player-input');
const adminAddButton = document.getElementById('admin-add-player');
const adminClearButton = document.getElementById('admin-clear-players');
const adminPlayerList = document.getElementById('admin-player-list');

const storageKey = 'baf-tracked-players';
const isAdmin = new URLSearchParams(window.location.search).get('admin') === '1';
let trackedPlayers = [];

const loadTrackedPlayers = () => {
  try {
    const saved = localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed)
      ? parsed.map((name) => name.trim()).filter(Boolean)
      : [];
  } catch (error) {
    return [];
  }
};

const saveTrackedPlayers = (players) => {
  trackedPlayers = Array.from(new Set(players.map((player) => player.trim()).filter(Boolean)));
  localStorage.setItem(storageKey, JSON.stringify(trackedPlayers));
  renderVisitorPlayerList();
  renderAdminPlayerList();
};

const renderVisitorPlayerList = () => {
  if (!visitorPlayersSection) return;
  if (!trackedPlayers.length) {
    visitorPlayersSection.innerHTML = '<div class="visitor-player-list-card"><p>No tracked players configured yet.</p></div>';
    return;
  }

  visitorPlayersSection.innerHTML = `
    <div class="visitor-player-list-card">
      <h3>Tracked Players</h3>
      <ol>
        ${trackedPlayers.map((player) => `<li>${player}</li>`).join('')}
      </ol>
    </div>
  `;
};

const renderAdminPlayerList = () => {
  if (!adminPanel || !adminPlayerList) return;
  if (!isAdmin) {
    adminPanel.classList.add('hidden');
    return;
  }

  adminPanel.classList.remove('hidden');
  adminPlayerList.innerHTML = trackedPlayers.length
    ? trackedPlayers.map((player) => `
        <li>
          <span>${player}</span>
          <button type="button" data-player="${player}">Remove</button>
        </li>
      `).join('')
    : '<li>No players configured yet.</li>';
};

const addTrackedPlayer = (name) => {
  const cleaned = name.trim();
  if (!cleaned) return;
  if (trackedPlayers.some((player) => player.toLowerCase() === cleaned.toLowerCase())) return;
  saveTrackedPlayers([...trackedPlayers, cleaned]);
};

const removeTrackedPlayer = (name) => {
  saveTrackedPlayers(trackedPlayers.filter((player) => player.toLowerCase() !== name.toLowerCase()));
};

const clearTrackedPlayers = () => {
  saveTrackedPlayers([]);
};

const buildApiUrl = (slug, view, round) => {
  return `https://fabtcg.com/coverage/${encodeURIComponent(slug)}/${encodeURIComponent(view)}/${encodeURIComponent(round)}/`;
};

const parseStandings = (data) => {
  if (!data || !Array.isArray(data.standings)) {
    return null;
  }

  return data.standings.map((entry) => ({
    rank: entry.rank ?? '-',
    player: entry.player ?? entry.name ?? 'Unknown',
    score: entry.score ?? entry.points ?? '-',
    record: entry.record ?? '-',
    hero: entry.hero ?? entry.character ?? 'Unknown',
    opponent: entry.opponent ?? entry.opponent_name ?? 'TBD',
    round: entry.round ?? entry.match_round ?? '-',
  }));
};

const renderStandings = (rows) => {
  if (!standingsContainer) return;
  if (!rows?.length) {
    standingsContainer.innerHTML = '<p>No standings data available for this round.</p>';
    return;
  }

  const normalizedTracked = trackedPlayers.map((value) => value.trim().toLowerCase()).filter(Boolean);
  const highlighted = (player) => normalizedTracked.some((name) => player.toLowerCase().includes(name));

  const tableRows = rows.map((row) => {
    const isWatched = highlighted(row.player);
    return `<tr class="${isWatched ? 'highlighted' : ''}">
      <td>${row.rank}</td>
      <td>${row.player}</td>
      <td>${row.hero}</td>
      <td>${row.opponent}</td>
      <td>${row.score}</td>
      <td>${row.record}</td>
    </tr>`;
  }).join('');

  standingsContainer.innerHTML = `
    <table class="standings-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Hero</th>
          <th>Opponent</th>
          <th>Score</th>
          <th>Record</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
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

  const normalizedTracked = trackedPlayers.map((value) => value.trim().toLowerCase()).filter(Boolean);
  const watchedRows = rows.filter((row) => normalizedTracked.some((name) => row.player.toLowerCase().includes(name)));

  if (!watchedRows.length) {
    trackedPlayersContainer.innerHTML = '<p>No tracked players found in the current standings.</p>';
    return;
  }

  trackedPlayersContainer.innerHTML = watchedRows.map((row) => `
      <article class="player-card">
        <h3>${row.player}</h3>
        <dl>
          <div>
            <dt>Current Rank</dt>
            <dd>${row.rank}</dd>
          </div>
          <div>
            <dt>Hero</dt>
            <dd>${row.hero}</dd>
          </div>
          <div>
            <dt>Opponent</dt>
            <dd>${row.opponent}</dd>
          </div>
          <div>
            <dt>Score</dt>
            <dd>${row.score}</dd>
          </div>
          <div>
            <dt>Record</dt>
            <dd>${row.record}</dd>
          </div>
          <div>
            <dt>Round</dt>
            <dd>${row.round}</dd>
          </div>
        </dl>
      </article>
    `).join('');
};

const fetchStandings = async (slug, view, round) => {
  const url = buildApiUrl(slug, view, round);
  setStatus('Loading standings…');
  if (standingsContainer) standingsContainer.innerHTML = '';

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Unable to load data (${response.status})`);
    }

    const data = await response.json();
    const rows = parseStandings(data);
    if (!rows) {
      throw new Error('Standings format is not supported by the tracker.');
    }

    renderStandings(rows);
    renderTrackedPlayers(rows);
    const highlightCount = rows.filter((row) => trackedPlayers.some((name) => row.player.toLowerCase().includes(name.toLowerCase()))).length;
    setStatus(`Standings loaded. Highlighted ${highlightCount} tracked player${highlightCount === 1 ? '' : 's'}.`);
  } catch (error) {
    setStatus(`Error loading standings: ${error.message}`, true);
    if (standingsContainer) standingsContainer.innerHTML = `<p>Unable to load live standings. Verify the event slug, view, and round, or check network access to the coverage endpoint.</p>`;
  }
};

const initializeAdminEvents = () => {
  if (!isAdmin) return;
  if (adminAddButton) {
    adminAddButton.addEventListener('click', () => {
      if (!adminPlayerInput) return;
      addTrackedPlayer(adminPlayerInput.value);
      adminPlayerInput.value = '';
    });
  }

  if (adminClearButton) {
    adminClearButton.addEventListener('click', () => {
      clearTrackedPlayers();
    });
  }

  if (adminPlayerList) {
    adminPlayerList.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const player = target.dataset.player;
      if (player) {
        removeTrackedPlayer(player);
      }
    });
  }
};

const initialize = () => {
  trackedPlayers = loadTrackedPlayers();
  renderVisitorPlayerList();
  renderAdminPlayerList();
  initializeAdminEvents();

  if (trackerForm) {
    trackerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const slug = document.getElementById('event-slug').value.trim();
      const view = document.getElementById('coverage-view').value.trim();
      const round = document.getElementById('round-number').value.trim();

      if (!slug || !view || !round) {
        setStatus('Please fill in all tracker fields.', true);
        return;
      }

      fetchStandings(slug, view, round);
    });
  }
};

initialize();
