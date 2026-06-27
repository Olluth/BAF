'use strict';

const CREDS_KEY    = 'baf-admin-credentials';
const SESSION_KEY  = 'baf-admin-session';
const ARTICLES_KEY = 'baf-articles';
const PLAYERS_KEY  = 'baf-tracked-players';
const EVENTS_KEY   = 'baf-events';
const ANALYTICS_KEY_STORE = 'baf-analytics-key';

// --- Crypto ---

const supportsWebCrypto = () => typeof crypto !== 'undefined' && crypto?.subtle && typeof crypto.subtle.digest === 'function';
const supportsRandomUUID = () => typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';

const storageAvailable = (type) => {
  try {
    const storage = window[type];
    const key = '__baf_storage_check__';
    storage.setItem(key, key);
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

const getStorage = (type) => {
  if (!storageAvailable(type)) {
    throw new Error(`Le stockage ${type} est désactivé ou bloqué. Activez les cookies/localStorage dans votre navigateur ou utilisez un autre navigateur.`);
  }
  return window[type];
};

const showLoginError = (message) => {
  const errorEl = $('login-error');
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
};

const randomBytes = (length) => {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
};

const randomUUID = () => {
  if (supportsRandomUUID()) return crypto.randomUUID();
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
};

const jsSha256 = (text) => {
  const utf8 = new TextEncoder().encode(text);
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));

  const padded = [...utf8];
  padded.push(0x80);
  const bitLength = utf8.length * 8;
  while ((padded.length % 64) !== 56) padded.push(0x00);
  for (let i = 7; i >= 0; i -= 1) {
    padded.push((bitLength >>> (i * 8)) & 0xff);
  }

  for (let i = 0; i < padded.length; i += 64) {
    const chunk = padded.slice(i, i + 64);
    const w = new Array(64);
    for (let j = 0; j < 16; j += 1) {
      w[j] = (chunk[j * 4] << 24) | (chunk[j * 4 + 1] << 16) | (chunk[j * 4 + 2] << 8) | chunk[j * 4 + 3];
    }
    for (let j = 16; j < 64; j += 1) {
      const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = H;

    for (let j = 0; j < 64; j += 1) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[j] + w[j]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }

  return H.map((h) => h.toString(16).padStart(8, '0')).join('');
};

const sha256 = async (text) => {
  if (supportsWebCrypto()) {
    const encoded = new TextEncoder().encode(text);
    const buffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return jsSha256(text);
};

// Sets default credentials (admin / baf-admin) on first run.
const initCredentials = async () => {
  const storage = getStorage('localStorage');
  if (storage.getItem(CREDS_KEY)) return;
  const hash = await sha256('baf-admin');
  storage.setItem(CREDS_KEY, JSON.stringify({ username: 'admin', passwordHash: hash }));
};

const verifyLogin = async (username, password) => {
  const storage = getStorage('localStorage');
  const raw = storage.getItem(CREDS_KEY);
  if (!raw) {
    throw new Error('Aucun identifiant admin trouvé dans le stockage local. Les paramètres n’ont pas été initialisés.')
  }
  let storedUser;
  let passwordHash;
  try {
    ({ username: storedUser, passwordHash } = JSON.parse(raw));
  } catch (err) {
    throw new Error('Les informations d’identification stockées sont corrompues ou invalides. Réinitialisez le stockage du navigateur.');
  }
  const hash = await sha256(password);
  if (username !== storedUser || hash !== passwordHash) {
    return false;
  }
  return true;
};

// --- Session ---

const isLoggedIn = () => {
  try {
    return !!getStorage('sessionStorage').getItem(SESSION_KEY);
  } catch {
    return false;
  }
};
const createSession = () => getStorage('sessionStorage').setItem(SESSION_KEY, randomUUID());
const destroySession = () => {
  try {
    getStorage('sessionStorage').removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
};

// --- Articles ---

const loadArticles = () => {
  try {
    const raw = localStorage.getItem(ARTICLES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveArticles = (articles) => localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));

const createArticle = ({ title, excerpt, content }) => {
  const articles = loadArticles();
  const article = {
    id: randomUUID(),
    title: title.trim(),
    excerpt: excerpt.trim(),
    content: content.trim(),
    date: new Date().toISOString().split('T')[0],
    published: true,
  };
  saveArticles([article, ...articles]);
};

const updateArticle = (id, { title, excerpt, content }) => {
  const articles = loadArticles();
  const idx = articles.findIndex((a) => a.id === id);
  if (idx === -1) return;
  articles[idx] = { ...articles[idx], title: title.trim(), excerpt: excerpt.trim(), content: content.trim() };
  saveArticles(articles);
};

const deleteArticle = (id) => saveArticles(loadArticles().filter((a) => a.id !== id));

// --- Players ---

const loadPlayers = () => {
  try {
    const raw = localStorage.getItem(PLAYERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((n) => String(n).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const savePlayers = (players) => {
  const deduped = [...new Set(players.map((n) => n.trim()).filter(Boolean))];
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(deduped));
};

const addPlayer = (name) => {
  const players = loadPlayers();
  const cleaned = name.trim();
  if (!cleaned || players.some((p) => p.toLowerCase() === cleaned.toLowerCase())) return;
  savePlayers([...players, cleaned]);
};

const removePlayer = (name) => {
  savePlayers(loadPlayers().filter((p) => p.toLowerCase() !== name.toLowerCase()));
};

// --- Events ---

const loadAdminEvents = () => {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const saveAdminEvents = (events) => localStorage.setItem(EVENTS_KEY, JSON.stringify(events));

const createAdminEvent = ({ name, slug, active }) => {
  const events = loadAdminEvents();
  events.push({ id: randomUUID(), name: name.trim(), slug: slug.trim(), active });
  saveAdminEvents(events);
};

const updateAdminEvent = (id, changes) => {
  saveAdminEvents(loadAdminEvents().map((e) => (e.id === id ? { ...e, ...changes } : e)));
};

const deleteAdminEvent = (id) => saveAdminEvents(loadAdminEvents().filter((e) => e.id !== id));

const syncArticlesToServer = async () => {
  const key = getAnalyticsKey();
  if (!key) return;
  try {
    await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ articles: loadArticles() }),
    });
  } catch {}
};

const syncPlayersToServer = async () => {
  const key = getAnalyticsKey();
  if (!key) return;
  try {
    await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ players: loadPlayers() }),
    });
  } catch {}
};

const syncEventToServer = async (event) => {
  const key = getAnalyticsKey();
  if (!key) return;
  try {
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ slug: event.slug, name: event.name, active: event.active !== false }),
    });
  } catch {}
};

const deleteEventFromServer = async (slug) => {
  const key = getAnalyticsKey();
  if (!key) return;
  try {
    await fetch(`/api/events/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${key}` },
    });
  } catch {}
};

const loadEventsFromServer = async () => {
  try {
    const r = await fetch('/api/events');
    if (!r.ok) return;
    const serverEvents = await r.json();
    if (!Array.isArray(serverEvents)) return;
    if (serverEvents.length === 0) {
      // Server has no events — push all local events up to seed it
      const local = loadAdminEvents();
      for (const ev of local) await syncEventToServer(ev);
      return;
    }
    const local = loadAdminEvents();
    const merged = serverEvents.map(sv => {
      const existing = local.find(l => l.slug === sv.slug);
      const base = existing || { id: randomUUID() };
      return { ...base, slug: sv.slug, name: sv.name, active: sv.active !== false, isDefault: sv.isDefault || false };
    });
    saveAdminEvents(merged);
    renderEventList();
  } catch {}
};

// --- Helpers ---

const escapeHtml = (str) => {
  const el = document.createElement('div');
  el.textContent = str;
  return el.innerHTML;
};

const escapeAttr = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const $ = (id) => document.getElementById(id);

// --- UI State ---

let editingArticleId = null;

const showLogin = () => {
  $('login-page').classList.remove('hidden');
  $('dashboard').classList.add('hidden');
  $('login-username').focus();
};

const renderBookmarklet = () => {
  const wrap = $('bookmarklet-wrap');
  if (!wrap) return;
  const key = getAnalyticsKey();
  if (!key) {
    wrap.innerHTML = `<p class="admin-panel-desc" style="color:rgba(249,230,197,.45)">Configure ta clé API dans l'onglet Analytics d'abord.</p>`;
    return;
  }
  const loader = `javascript:(function(){var s=document.createElement('script');s.src='https://bafbordeaux.fr/js/bookmarklet.js?key=${encodeURIComponent(key)}&t='+Date.now();document.head.appendChild(s)})()`;
  wrap.innerHTML = `<a href="${loader}" class="button button-primary" style="display:inline-block;cursor:grab" draggable="true">🎴 BAF — Mettre à jour les standings</a><p class="admin-panel-desc" style="margin-top:.6rem;font-size:.8rem">Ne clique pas ici — glisse-le dans ta barre de favoris.</p>`;
};

const reconcileArticles = async () => {
  try {
    const res = await fetch('/api/articles');
    if (!res.ok) return;
    const serverArticles = await res.json();
    if (!Array.isArray(serverArticles)) return;
    const localArticles = loadArticles();
    if (serverArticles.length > 0) {
      const serverIds = new Set(serverArticles.map(a => a.id));
      const localOnly = localArticles.filter(a => !serverIds.has(a.id));
      const merged = [...serverArticles, ...localOnly].sort((a, b) => new Date(b.date) - new Date(a.date));
      saveArticles(merged);
      if (localOnly.length > 0) await syncArticlesToServer();
    } else if (localArticles.length > 0) {
      await syncArticlesToServer();
    }
    renderArticleList();
  } catch {}
};

const showDashboard = () => {
  $('login-page').classList.add('hidden');
  $('dashboard').classList.remove('hidden');
  renderArticleList();
  renderPlayerList();
  renderEventList();
  const keyInput = $('analytics-key-input');
  if (keyInput) keyInput.value = getAnalyticsKey();
  renderBookmarklet();
};

const switchTab = (tab) => {
  document.querySelectorAll('.admin-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  $('panel-articles').classList.toggle('hidden', tab !== 'articles');
  $('panel-players').classList.toggle('hidden', tab !== 'players');
  $('panel-events').classList.toggle('hidden', tab !== 'events');
  $('panel-members').classList.toggle('hidden', tab !== 'members');
  $('panel-achievements').classList.toggle('hidden', tab !== 'achievements');
  $('panel-analytics').classList.toggle('hidden', tab !== 'analytics');
  if (tab === 'analytics') loadAnalytics();
  if (tab === 'articles') reconcileArticles();
  if (tab === 'events') loadEventsFromServer();
  if (tab === 'players') syncPlayersToServer();
  if (tab === 'members') loadMembers();
  if (tab === 'achievements') renderAchievementsPanel();
};

// --- Analytics ---

let _analyticsDays = 7;

const getAnalyticsKey = () => { try { return localStorage.getItem(ANALYTICS_KEY_STORE) || ''; } catch { return ''; } };

const setAnalyticsStatus = (msg, isError = false) => {
  const el = $('analytics-status');
  if (!el) return;
  if (!msg) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.className = 'tracker-status' + (isError ? ' tracker-status-error' : '');
  el.textContent = msg;
};

const renderAnalytics = ({ overview, daily, pages }) => {
  $('stat-views').textContent    = overview.views.toLocaleString('fr-FR');
  $('stat-visitors').textContent = overview.visitors.toLocaleString('fr-FR');

  const maxViews = Math.max(...daily.map(d => d.views), 1);
  $('analytics-chart').innerHTML = daily.map(d => `
    <div class="analytics-bar-wrap" title="${d.day} — ${d.views} vues">
      <div class="analytics-bar" style="height:${Math.round((d.views / maxViews) * 100)}%"></div>
      <span class="analytics-bar-label">${d.day.slice(5)}</span>
    </div>`).join('');

  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  $('analytics-pages').innerHTML = pages.map(p => `
    <tr>
      <td>${esc(p.page || '/')}</td>
      <td>${p.views.toLocaleString('fr-FR')}</td>
      <td>${p.visitors.toLocaleString('fr-FR')}</td>
    </tr>`).join('');

  $('analytics-data').classList.remove('hidden');
};

const loadAnalytics = async () => {
  const key = getAnalyticsKey();
  if (!key) { setAnalyticsStatus('Entrez votre clé API ci-dessus pour voir les statistiques.'); return; }
  setAnalyticsStatus('Chargement…');
  $('analytics-data').classList.add('hidden');
  try {
    const r = await fetch(`/api/stats?days=${_analyticsDays}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (r.status === 401) { setAnalyticsStatus('Clé API incorrecte.', true); return; }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    setAnalyticsStatus('');
    renderAnalytics(data);
  } catch (err) {
    setAnalyticsStatus(`Erreur : ${err.message}`, true);
  }
};

// --- Articles UI ---

const renderArticleList = () => {
  const articles = loadArticles();
  const list = $('article-list');
  if (!articles.length) {
    list.innerHTML = `<li class="admin-list-empty">${t('admin.articles.empty')}</li>`;
    return;
  }
  list.innerHTML = articles
    .map(
      (a) => `
    <li class="admin-list-item">
      <div class="admin-list-item-info">
        <span class="admin-list-item-title">${escapeHtml(a.title)}</span>
        <span class="admin-list-item-meta">${escapeHtml(a.date)}</span>
      </div>
      <div class="admin-list-item-actions">
        <button class="button" data-action="edit" data-id="${escapeAttr(a.id)}">${t('admin.articles.edit')}</button>
        <button class="button admin-btn-danger" data-action="delete" data-id="${escapeAttr(a.id)}">${t('admin.articles.delete')}</button>
      </div>
    </li>`,
    )
    .join('');
};

const openArticleForm = (article = null) => {
  editingArticleId = article ? article.id : null;
  const formTitleEl = $('article-form-title');
  formTitleEl.textContent = t(article ? 'admin.articles.form.edit' : 'admin.articles.form.new');
  formTitleEl.dataset.i18n = article ? 'admin.articles.form.edit' : 'admin.articles.form.new';
  $('article-id').value = article ? article.id : '';
  $('article-title').value = article ? article.title : '';
  $('article-excerpt').value = article ? article.excerpt : '';
  $('article-content').value = article ? article.content : '';
  $('article-form-container').classList.remove('hidden');
  $('article-title').focus();
  $('article-form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const closeArticleForm = () => {
  editingArticleId = null;
  $('article-form').reset();
  $('article-form-container').classList.add('hidden');
};

// --- Players UI ---

const renderPlayerList = () => {
  const players = loadPlayers();
  const list = $('player-list');
  if (!players.length) {
    list.innerHTML = `<li class="admin-list-empty">${t('admin.players.empty')}</li>`;
    return;
  }
  list.innerHTML = players
    .map(
      (name) => `
    <li class="admin-list-item">
      <div class="admin-list-item-info">
        <span class="admin-list-item-title">${escapeHtml(name)}</span>
      </div>
      <div class="admin-list-item-actions">
        <button class="button admin-btn-danger" data-action="remove-player" data-name="${escapeAttr(name)}">${t('admin.players.remove')}</button>
      </div>
    </li>`,
    )
    .join('');
};

// --- Events UI ---

let editingEventId = null;

const renderEventList = () => {
  const events = loadAdminEvents();
  const list = $('event-list');
  if (!list) return;
  if (!events.length) {
    list.innerHTML = `<li class="admin-list-empty">${t('admin.events.empty')}</li>`;
    return;
  }
  list.innerHTML = events
    .map(
      (ev) => `
    <li class="admin-list-item">
      <div class="admin-list-item-info">
        <span class="admin-list-item-title">${escapeHtml(ev.name)}</span>
        <span class="admin-list-item-meta">${escapeHtml(ev.slug)}${ev.active === false ? ' · masqué' : ''}</span>
      </div>
      <div class="admin-list-item-actions">
        <button class="button event-default-btn${ev.isDefault ? ' event-default-btn--active' : ''}" data-action="set-default" data-id="${escapeAttr(ev.id)}" data-slug="${escapeAttr(ev.slug)}"${ev.isDefault ? ' disabled' : ''}>${t('admin.events.setDefault')}</button>
        <button class="button" data-action="edit-event" data-id="${escapeAttr(ev.id)}">${t('admin.events.edit')}</button>
        <button class="button admin-btn-danger" data-action="delete-event" data-id="${escapeAttr(ev.id)}">${t('admin.events.delete')}</button>
      </div>
    </li>`,
    )
    .join('');
};

const openEventForm = (event = null) => {
  editingEventId = event ? event.id : null;
  const titleEl = $('event-form-title');
  titleEl.textContent = t(event ? 'admin.events.form.edit' : 'admin.events.form.new');
  titleEl.dataset.i18n = event ? 'admin.events.form.edit' : 'admin.events.form.new';
  $('event-id').value          = event ? event.id   : '';
  $('event-name').value        = event ? event.name : '';
  $('event-slug-input').value  = event ? event.slug : '';
  $('event-active').checked    = event ? event.active !== false : true;
  $('event-form-container').classList.remove('hidden');
  $('event-name').focus();
  $('event-form-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const closeEventForm = () => {
  editingEventId = null;
  $('event-form').reset();
  $('event-form-container').classList.add('hidden');
};

// --- Members ---

const setMembersStatus = (msg, isError = false) => {
  const el = $('members-status');
  if (!el) return;
  if (!msg) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.className = 'tracker-status' + (isError ? ' tracker-status-error' : '');
  el.textContent = msg;
};

const renderMemberList = (members) => {
  const list = $('member-list');
  if (!list) return;
  if (!members.length) {
    list.innerHTML = `<li class="admin-list-empty">Aucun membre inscrit.</li>`;
    return;
  }
  list.innerHTML = members.map(m => {
    const date      = new Date(m.created_at).toLocaleDateString('fr-FR');
    const confirmed = m.email_confirmed_at ? '✓ confirmé' : '⏳ en attente';
    return `
    <li class="admin-list-item">
      <div class="admin-list-item-info">
        <span class="admin-list-item-title">${escapeHtml(m.email)}</span>
        <span class="admin-list-item-meta">${date} · ${confirmed}</span>
      </div>
      <div class="admin-list-item-actions">
        <button class="button admin-btn-danger" data-action="delete-member" data-id="${escapeAttr(m.id)}" data-email="${escapeAttr(m.email)}">Supprimer</button>
      </div>
    </li>`;
  }).join('');
};

const loadMembers = async () => {
  const key = getAnalyticsKey();
  if (!key) { setMembersStatus('Clé API requise (onglet Analytics).', true); return; }
  setMembersStatus('Chargement…');
  try {
    const r = await fetch('/api/members', { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const members = await r.json();
    setMembersStatus('');
    renderMemberList(members);
  } catch (err) {
    setMembersStatus(`Erreur : ${err.message}`, true);
  }
};

// --- Achievements Admin ---

const _ACH_SUPABASE_URL = 'https://jpxmqrrmpeobrnrvvwsr.supabase.co';
const _ACH_SUPABASE_KEY = 'sb_publishable_fWVirSqQi5Zcm5mybNzbOg_SakIPpgl';
let _achSb = null;
const getAchSb = () => {
  if (!_achSb && window.supabase) _achSb = window.supabase.createClient(_ACH_SUPABASE_URL, _ACH_SUPABASE_KEY);
  return _achSb;
};

let _allAchievements = [];
let _selectedMember = null;
let _memberGranted = new Set();
let _memberPending = new Set();

const TIER_ORDER_ADM = ['Silver', 'Gold', 'Diamond'];
const TIER_LABELS_ADM = { Silver: 'Argent', Gold: 'Or', Diamond: 'Diamant' };

const setAchStatus = (msg, isError = false) => {
  const el = $('achievements-status');
  if (!el) return;
  if (!msg) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.className = 'tracker-status' + (isError ? ' tracker-status-error' : '');
  el.textContent = msg;
};

const renderAchievementsPanel = async () => {
  const sb = getAchSb();
  if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();

  if (!session) {
    $('ach-signin-section')?.classList.remove('hidden');
    $('ach-grant-section')?.classList.add('hidden');
    setAchStatus('');
    return;
  }

  const { data: profile } = await sb
    .from('profiles').select('pseudo, is_admin').eq('id', session.user.id).single();

  if (!profile?.is_admin) {
    setAchStatus('Accès refusé — ce compte n\'est pas administrateur.', true);
    $('ach-signin-section')?.classList.remove('hidden');
    $('ach-grant-section')?.classList.add('hidden');
    return;
  }

  const { data: allA } = await sb.from('achievements').select('*').order('category').order('name');
  _allAchievements = allA || [];

  $('ach-signin-section')?.classList.add('hidden');
  $('ach-grant-section')?.classList.remove('hidden');
  setAchStatus('');
};

const searchMemberForGrant = async () => {
  const pseudo = $('ach-member-search')?.value.trim().toLowerCase();
  if (!pseudo) return;
  const sb = getAchSb();

  const { data, error } = await sb
    .from('profiles').select('id, pseudo, title').eq('pseudo', pseudo).single();

  if (error || !data) {
    setAchStatus('Membre introuvable.', true);
    $('ach-member-result')?.classList.add('hidden');
    return;
  }

  setAchStatus('');
  _selectedMember = data;

  const { data: granted } = await sb
    .from('member_achievements').select('achievement_id').eq('member_id', data.id);
  _memberGranted = new Set((granted || []).map(r => r.achievement_id));
  _memberPending  = new Set(_memberGranted);

  renderMemberAchievementGrid();
};

const renderMemberAchievementGrid = () => {
  const result = $('ach-member-result');
  if (!result || !_selectedMember) return;
  result.classList.remove('hidden');

  const grouped = {};
  TIER_ORDER_ADM.forEach(t => { grouped[t] = []; });
  _allAchievements.forEach(a => { if (grouped[a.tier]) grouped[a.tier].push(a); });

  result.innerHTML = `
    <div class="ach-member-header">
      <span class="ach-member-name">${escapeHtml(_selectedMember.pseudo)}</span>
      ${_selectedMember.title ? `<span class="profile-title-badge">${escapeHtml(_selectedMember.title)}</span>` : ''}
      <span id="ach-count-label" style="opacity:.4;font-size:.82rem;margin-left:auto">${_memberPending.size} haut(s) fait(s)</span>
    </div>
    ${TIER_ORDER_ADM.map(tier => `
      <div class="ach-tier-group">
        <div class="ach-tier-badge ach-tier-${tier.toLowerCase()}">${TIER_LABELS_ADM[tier] || tier}</div>
        <div class="ach-checkboxes">
          ${grouped[tier].map(a => `
            <label class="ach-checkbox-row${_memberPending.has(a.id) ? ' ach-granted' : ''}">
              <input type="checkbox" data-achievement-id="${escapeAttr(a.id)}" ${_memberPending.has(a.id) ? 'checked' : ''} />
              <span class="ach-checkbox-name">${escapeHtml(a.name)}</span>
            </label>`).join('')}
        </div>
      </div>`).join('')}
    <div style="display:flex;gap:.75rem;align-items:center;margin-top:1rem">
      <button id="ach-save-btn" class="button button-primary">Sauvegarder les changements</button>
      <span id="ach-save-status" style="font-size:.82rem;opacity:.7"></span>
    </div>`;

  result.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.achievementId;
      if (cb.checked) _memberPending.add(id); else _memberPending.delete(id);
      cb.closest('label').classList.toggle('ach-granted', cb.checked);
      const lbl = $('ach-count-label');
      if (lbl) lbl.textContent = `${_memberPending.size} haut(s) fait(s)`;
    });
  });

  $('ach-save-btn').addEventListener('click', saveAchievementChanges);
};

const saveAchievementChanges = async () => {
  if (!_selectedMember) return;
  const btn = $('ach-save-btn');
  const statusEl = $('ach-save-status');
  btn.disabled = true;
  btn.textContent = 'Enregistrement…';
  if (statusEl) statusEl.textContent = '';

  const toGrant  = [..._memberPending].filter(id => !_memberGranted.has(id));
  const toRevoke = [..._memberGranted].filter(id => !_memberPending.has(id));
  const sb = getAchSb();
  let err = null;

  if (toGrant.length) {
    const { error } = await sb.from('member_achievements').insert(
      toGrant.map(achievement_id => ({ member_id: _selectedMember.id, achievement_id }))
    );
    if (error) err = error;
  }

  if (!err && toRevoke.length) {
    const { error } = await sb.from('member_achievements')
      .delete().eq('member_id', _selectedMember.id).in('achievement_id', toRevoke);
    if (error) err = error;
  }

  if (statusEl) statusEl.textContent = err ? `Erreur : ${err.message}` : 'Sauvegardé !';
  if (!err) _memberGranted = new Set(_memberPending);
  btn.disabled = false;
  btn.textContent = 'Sauvegarder les changements';
};

// --- Event Wiring ---

const wireEvents = () => {
  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('login-username').value.trim();
    const password = $('login-password').value;
    const errorEl = $('login-error');
    const submitBtn = $('login-submit');

    submitBtn.disabled = true;
    submitBtn.textContent = t('admin.login.submitting');
    errorEl.classList.add('hidden');

    try {
      const result = await verifyLogin(username, password);
      if (result === true) {
        createSession();
        showDashboard();
      } else {
        errorEl.textContent = t('admin.login.error');
        errorEl.classList.remove('hidden');
        $('login-password').value = '';
        $('login-password').focus();
      }
    } catch (err) {
      errorEl.textContent = `Erreur de connexion : ${err.message}`;
      errorEl.classList.remove('hidden');
      console.error('Admin login error:', err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = t('admin.login.submit');
    }
  });

  $('logout-btn').addEventListener('click', () => {
    destroySession();
    showLogin();
  });

  document.querySelectorAll('.admin-tab').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  $('new-article-btn').addEventListener('click', () => openArticleForm());
  $('cancel-article-btn').addEventListener('click', closeArticleForm);

  $('article-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      title: $('article-title').value,
      excerpt: $('article-excerpt').value,
      content: $('article-content').value,
    };
    if (editingArticleId) {
      updateArticle(editingArticleId, data);
    } else {
      createArticle(data);
    }
    closeArticleForm();
    renderArticleList();
    await syncArticlesToServer();
  });

  $('article-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'edit') {
      const article = loadArticles().find((a) => a.id === id);
      if (article) openArticleForm(article);
    } else if (action === 'delete') {
      if (confirm(t('admin.articles.confirmDelete'))) {
        deleteArticle(id);
        renderArticleList();
        await syncArticlesToServer();
      }
    }
  });

  $('add-player-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('player-input');
    addPlayer(input.value);
    input.value = '';
    renderPlayerList();
    await syncPlayersToServer();
  });

  $('player-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="remove-player"]');
    if (!btn) return;
    const name = btn.dataset.name;
    if (confirm(t('admin.players.confirmRemove', { name }))) {
      removePlayer(name);
      renderPlayerList();
      await syncPlayersToServer();
    }
  });

  $('member-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="delete-member"]');
    if (!btn) return;
    const { id, email } = btn.dataset;
    if (!confirm(`Supprimer le compte de ${email} ? Cette action est irréversible.`)) return;
    const key = getAnalyticsKey();
    if (!key) return;
    btn.disabled = true;
    try {
      const r = await fetch(`/api/members/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await loadMembers();
    } catch (err) {
      setMembersStatus(`Erreur : ${err.message}`, true);
      btn.disabled = false;
    }
  });

  $('new-event-btn').addEventListener('click', () => openEventForm());
  $('cancel-event-btn').addEventListener('click', closeEventForm);

  $('event-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name:   $('event-name').value,
      slug:   $('event-slug-input').value,
      active: $('event-active').checked,
    };
    if (editingEventId) {
      updateAdminEvent(editingEventId, data);
    } else {
      createAdminEvent(data);
    }
    await syncEventToServer(data);
    closeEventForm();
    renderEventList();
  });

  $('event-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const { action, id, slug } = btn.dataset;
    try {
      if (action === 'set-default') {
        await fetch(`/api/events/${encodeURIComponent(slug)}/set-default`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${getAnalyticsKey()}` },
        });
        const events = loadAdminEvents().map(ev => ({ ...ev, isDefault: ev.id === id }));
        saveAdminEvents(events);
        renderEventList();
      } else if (action === 'edit-event') {
        const ev = loadAdminEvents().find((ev) => ev.id === id);
        if (ev) openEventForm(ev);
      } else if (action === 'delete-event') {
        if (confirm(t('admin.events.confirmDelete'))) {
          const ev = loadAdminEvents().find((ev) => ev.id === id);
          deleteAdminEvent(id);
          if (ev) await deleteEventFromServer(ev.slug);
          renderEventList();
        }
      }
    } catch (err) {
      console.error('[BAF] event-list click error:', action, err);
      alert(`Erreur : ${err.message}`);
    }
  });

  // Proxy configuration
  const proxyInput  = $('proxy-url-input');
  const proxyStatus = $('proxy-status');
  const showProxyStatus = (msg, ok = true) => {
    if (!proxyStatus) return;
    proxyStatus.textContent = msg;
    proxyStatus.className = 'admin-proxy-status' + (ok ? ' admin-proxy-ok' : ' admin-proxy-err');
  };

  if (proxyInput) {
    proxyInput.value = (() => { try { return localStorage.getItem('baf-proxy-url') || ''; } catch { return ''; } })();
  }

  $('proxy-save-btn')?.addEventListener('click', () => {
    const val = proxyInput?.value.trim() || '';
    try {
      if (val) {
        localStorage.setItem('baf-proxy-url', val);
        showProxyStatus(t('admin.proxy.saved'));
      } else {
        localStorage.removeItem('baf-proxy-url');
        showProxyStatus(t('admin.proxy.cleared'));
      }
    } catch (err) {
      showProxyStatus(err.message, false);
    }
  });

  $('proxy-clear-btn')?.addEventListener('click', () => {
    try {
      localStorage.removeItem('baf-proxy-url');
      if (proxyInput) proxyInput.value = '';
      showProxyStatus(t('admin.proxy.cleared'));
    } catch (err) {
      showProxyStatus(err.message, false);
    }
  });

  // Analytics controls
  $('analytics-key-save')?.addEventListener('click', () => {
    const val = $('analytics-key-input')?.value.trim() || '';
    try {
      if (val) localStorage.setItem(ANALYTICS_KEY_STORE, val);
      else localStorage.removeItem(ANALYTICS_KEY_STORE);
      renderBookmarklet();
      loadAnalytics();
    } catch (err) {
      setAnalyticsStatus(err.message, true);
    }
  });

  $('analytics-refresh')?.addEventListener('click', loadAnalytics);

  document.querySelectorAll('.analytics-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.analytics-period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _analyticsDays = parseInt(btn.dataset.days);
      loadAnalytics();
    });
  });

  $('ach-signin-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sb = getAchSb();
    if (!sb) return;
    const email    = $('ach-email')?.value.trim();
    const password = $('ach-password')?.value;
    setAchStatus('Connexion…');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setAchStatus(error.message, true); return; }
    renderAchievementsPanel();
  });

  $('ach-search-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await searchMemberForGrant();
  });

  document.addEventListener('langchange', () => {
    renderArticleList();
    renderPlayerList();
    renderEventList();
  });
};

// --- Initialize ---

const initialize = async () => {
  wireEvents();
  try {
    await initCredentials();
    if (isLoggedIn()) {
      showDashboard();
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin();
    showLoginError(`Impossible de démarrer l’admin : ${err.message}`);
    console.error('Admin initialization error:', err);
  }
};

initialize();
