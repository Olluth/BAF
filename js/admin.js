'use strict';

const CREDS_KEY = 'baf-admin-credentials';
const SESSION_KEY = 'baf-admin-session';
const ARTICLES_KEY = 'baf-articles';
const PLAYERS_KEY = 'baf-tracked-players';

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
};

const switchTab = (tab) => {
  document.querySelectorAll('.admin-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  $('panel-articles').classList.toggle('hidden', tab !== 'articles');
  $('panel-players').classList.toggle('hidden', tab !== 'players');
};

// --- Articles UI ---

const renderArticleList = () => {
  const articles = loadArticles();
  const list = $('article-list');
  if (!articles.length) {
    list.innerHTML = '<li class="admin-list-empty">No articles yet. Click "+ New Article" to create one.</li>';
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
        <button class="button" data-action="edit" data-id="${escapeAttr(a.id)}">Edit</button>
        <button class="button admin-btn-danger" data-action="delete" data-id="${escapeAttr(a.id)}">Delete</button>
      </div>
    </li>`,
    )
    .join('');
};

const openArticleForm = (article = null) => {
  editingArticleId = article ? article.id : null;
  $('article-form-title').textContent = article ? 'Edit Article' : 'New Article';
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
    list.innerHTML = '<li class="admin-list-empty">No tracked players yet. Add one above.</li>';
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
        <button class="button admin-btn-danger" data-action="remove-player" data-name="${escapeAttr(name)}">Remove</button>
      </div>
    </li>`,
    )
    .join('');
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
    submitBtn.textContent = 'Signing in…';
    errorEl.classList.add('hidden');

    try {
      if (await verifyLogin(username, password)) {
        createSession();
        showDashboard();
      } else {
        errorEl.textContent = 'Invalid username or password.';
        errorEl.classList.remove('hidden');
        $('login-password').value = '';
        $('login-password').focus();
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign in';
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
      if (confirm('Permanently delete this article?')) {
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
    if (confirm(`Remove "${name}" from the tracked player list?`)) {
      removePlayer(name);
      renderPlayerList();
    }
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
