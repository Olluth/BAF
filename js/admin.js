'use strict';

const CREDS_KEY = 'baf-admin-credentials';
const SESSION_KEY = 'baf-admin-session';
const ARTICLES_KEY = 'baf-articles';
const PLAYERS_KEY = 'baf-tracked-players';
const EVENTS_KEY = 'baf-events';

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

const createAdminEvent = ({ name, slug, view, active }) => {
  const events = loadAdminEvents();
  events.push({ id: randomUUID(), name: name.trim(), slug: slug.trim(), view: (view || 'main').trim(), active });
  saveAdminEvents(events);
};

const updateAdminEvent = (id, changes) => {
  saveAdminEvents(loadAdminEvents().map((e) => (e.id === id ? { ...e, ...changes } : e)));
};

const deleteAdminEvent = (id) => saveAdminEvents(loadAdminEvents().filter((e) => e.id !== id));

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

const showDashboard = () => {
  $('login-page').classList.add('hidden');
  $('dashboard').classList.remove('hidden');
  renderArticleList();
  renderPlayerList();
  renderEventList();
};

const switchTab = (tab) => {
  document.querySelectorAll('.admin-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  $('panel-articles').classList.toggle('hidden', tab !== 'articles');
  $('panel-players').classList.toggle('hidden', tab !== 'players');
  $('panel-events').classList.toggle('hidden', tab !== 'events');
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
        <span class="admin-list-item-meta">${escapeHtml(ev.slug)} · ${escapeHtml(ev.view || 'main')}${ev.active === false ? ' · masqué' : ''}</span>
      </div>
      <div class="admin-list-item-actions">
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
  $('event-view-input').value  = event ? (event.view || 'main') : 'main';
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

  $('article-form').addEventListener('submit', (e) => {
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
  });

  $('article-list').addEventListener('click', (e) => {
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
      }
    }
  });

  $('add-player-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('player-input');
    addPlayer(input.value);
    input.value = '';
    renderPlayerList();
  });

  $('player-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="remove-player"]');
    if (!btn) return;
    const name = btn.dataset.name;
    if (confirm(t('admin.players.confirmRemove', { name }))) {
      removePlayer(name);
      renderPlayerList();
    }
  });

  $('new-event-btn').addEventListener('click', () => openEventForm());
  $('cancel-event-btn').addEventListener('click', closeEventForm);

  $('event-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      name:   $('event-name').value,
      slug:   $('event-slug-input').value,
      view:   $('event-view-input').value || 'main',
      active: $('event-active').checked,
    };
    if (editingEventId) {
      updateAdminEvent(editingEventId, data);
    } else {
      createAdminEvent(data);
    }
    closeEventForm();
    renderEventList();
  });

  $('event-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'edit-event') {
      const ev = loadAdminEvents().find((ev) => ev.id === id);
      if (ev) openEventForm(ev);
    } else if (action === 'delete-event') {
      if (confirm(t('admin.events.confirmDelete'))) {
        deleteAdminEvent(id);
        renderEventList();
      }
    }
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
