'use strict';

const CREDS_KEY = 'baf-admin-credentials';
const SESSION_KEY = 'baf-admin-session';
const ARTICLES_KEY = 'baf-articles';
const PLAYERS_KEY = 'baf-tracked-players';
const EVENTS_KEY = 'baf-events';

// --- Crypto ---

const sha256 = async (text) => {
  const encoded = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// Sets default credentials (admin / baf-admin) on first run.
const initCredentials = async () => {
  if (localStorage.getItem(CREDS_KEY)) return;
  const hash = await sha256('baf-admin');
  localStorage.setItem(CREDS_KEY, JSON.stringify({ username: 'admin', passwordHash: hash }));
};

const verifyLogin = async (username, password) => {
  const raw = localStorage.getItem(CREDS_KEY);
  if (!raw) return false;
  try {
    const { username: storedUser, passwordHash } = JSON.parse(raw);
    const hash = await sha256(password);
    return username === storedUser && hash === passwordHash;
  } catch {
    return false;
  }
};

// --- Session ---

const isLoggedIn = () => !!sessionStorage.getItem(SESSION_KEY);
const createSession = () => sessionStorage.setItem(SESSION_KEY, crypto.randomUUID());
const destroySession = () => sessionStorage.removeItem(SESSION_KEY);

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
    id: crypto.randomUUID(),
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
  events.push({ id: crypto.randomUUID(), name: name.trim(), slug: slug.trim(), view: (view || 'main').trim(), active });
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
      if (await verifyLogin(username, password)) {
        createSession();
        showDashboard();
      } else {
        errorEl.textContent = t('admin.login.error');
        errorEl.classList.remove('hidden');
        $('login-password').value = '';
        $('login-password').focus();
      }
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
  await initCredentials();
  wireEvents();
  if (isLoggedIn()) {
    showDashboard();
  } else {
    showLogin();
  }
};

initialize();
