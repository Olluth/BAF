'use strict';
const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');
const db      = require('./db');

const app          = express();
const PORT         = Number(process.env.PORT) || 3001;
const API_KEY              = process.env.API_KEY || '';
const SUPABASE_URL         = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const DATA_DIR      = process.env.DATA_DIR || path.join(__dirname, 'data');
const STANDINGS_DIR = path.join(DATA_DIR, 'standings');
const EVENTS_FILE    = path.join(DATA_DIR, 'events.json');
const PLAYERS_FILE   = path.join(DATA_DIR, 'players.json');
const ARTICLES_FILE  = path.join(DATA_DIR, 'articles.json');
fs.mkdirSync(STANDINGS_DIR, { recursive: true });

app.use(express.json({ limit: '2mb' }));

const requireAuth = (req, res, next) => {
  if (!API_KEY) return res.status(503).json({ error: 'API_KEY not set' });
  if (req.headers['authorization'] !== `Bearer ${API_KEY}`) return res.status(401).json({ error: 'unauthorized' });
  next();
};

const validSlug = (s) => typeof s === 'string' && /^[a-z0-9-]+$/.test(s) && s.length < 80;

const loadEventsData = () => {
  try {
    if (!fs.existsSync(EVENTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
  } catch { return []; }
};
const saveEventsData = (events) => fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));

const loadPlayersData = () => {
  try {
    if (!fs.existsSync(PLAYERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8'));
  } catch { return []; }
};
const savePlayersData = (players) => fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2));

const loadArticlesData = () => {
  try {
    if (!fs.existsSync(ARTICLES_FILE)) return [];
    return JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf8'));
  } catch { return []; }
};
const saveArticlesData = (articles) => fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2));

/* ---- Analytics ---- */

app.post('/api/track', (req, res) => {
  const { page, referrer } = req.body || {};
  if (!page || typeof page !== 'string') return res.status(400).json({ error: 'page required' });
  const ip     = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || '';
  const salt   = new Date().toISOString().slice(0, 10);
  const ipHash = crypto.createHash('sha256').update(ip + salt).digest('hex').slice(0, 16);
  const ua     = String(req.headers['user-agent'] || '').slice(0, 256);
  db.track(page.slice(0, 200), String(referrer || '').slice(0, 400), ua, ipHash);
  res.json({ ok: true });
});

app.get('/api/stats', requireAuth, (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
  res.json({ overview: db.getOverview(days), daily: db.getDaily(days), pages: db.getByPage(days) });
});

/* ---- Standings ---- */

// Open CORS for standings POST (bookmarklet runs from fabtcg.com origin)
const openCors = cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
});

app.options('/api/standings', openCors);

app.post('/api/standings', openCors, requireAuth, (req, res) => {
  const { slug, standings, liveMatches, liveRoundName, droppedPlayers, lastUpdated } = req.body || {};
  if (!validSlug(slug) || !Array.isArray(standings)) return res.status(400).json({ error: 'invalid data' });
  const file = path.join(STANDINGS_DIR, `${slug}.json`);
  fs.writeFileSync(file, JSON.stringify({
    slug,
    lastUpdated:   lastUpdated || new Date().toISOString(),
    standings,
    liveMatches:   liveMatches   || {},
    liveRoundName: liveRoundName || '',
    droppedPlayers: droppedPlayers || [],
  }, null, 2));
  console.log(`Standings saved: ${slug} (${standings.length} players)`);

  // Auto-register event on first upload so visitors can find it
  const events = loadEventsData();
  if (!events.find(e => e.slug === slug)) {
    const autoName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    events.unshift({ slug, name: autoName, active: true });
    saveEventsData(events);
    console.log(`Auto-registered event: ${slug}`);
  }

  res.json({ ok: true, players: standings.length });
});

app.get('/api/standings/:slug', (req, res) => {
  const { slug } = req.params;
  if (!validSlug(slug)) return res.status(400).json({ error: 'invalid slug' });
  const file = path.join(STANDINGS_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'not found' });
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(file);
});

/* ---- Players ---- */

app.get('/api/players', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(loadPlayersData());
});

app.post('/api/players', requireAuth, (req, res) => {
  const { players } = req.body || {};
  if (!Array.isArray(players)) return res.status(400).json({ error: 'invalid data' });
  const cleaned = players.map(p => String(p).trim()).filter(Boolean);
  savePlayersData(cleaned);
  res.json({ ok: true, count: cleaned.length });
});

/* ---- Members ---- */

const supabaseAdminHeaders = () => ({
  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  'apikey': SUPABASE_SERVICE_KEY,
});

app.get('/api/members', requireAuth, async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'Supabase not configured' });
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, { headers: supabaseAdminHeaders() });
    if (!r.ok) throw new Error(`Supabase ${r.status}`);
    const data = await r.json();
    res.json(data.users || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/members/:id', requireAuth, async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'Supabase not configured' });
  const { id } = req.params;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: supabaseAdminHeaders() });
    if (!r.ok) throw new Error(`Supabase ${r.status}`);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/* ---- Recent members (public, bypasses RLS) ---- */

app.get('/api/recent-members', async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.json([]);
  res.setHeader('Cache-Control', 'no-store');
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=50`, { headers: supabaseAdminHeaders() });
    if (!r.ok) return res.json([]);
    const data = await r.json();
    const users = (data.users || [])
      .filter(u => u.user_metadata?.pseudo)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 15)
      .map(u => ({ pseudo: u.user_metadata.pseudo, created_at: u.created_at }));
    res.json(users);
  } catch { res.json([]); }
});

/* ---- Articles ---- */

app.get('/api/articles', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(loadArticlesData().filter(a => a.published));
});

app.post('/api/articles', requireAuth, (req, res) => {
  const { articles } = req.body || {};
  if (!Array.isArray(articles)) return res.status(400).json({ error: 'invalid data' });
  saveArticlesData(articles);
  res.json({ ok: true, count: articles.length });
});

/* ---- Events ---- */

app.get('/api/events', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(loadEventsData());
});

app.post('/api/events', requireAuth, (req, res) => {
  const { slug, name, active } = req.body || {};
  if (!validSlug(slug) || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'invalid data' });
  }
  const events = loadEventsData();
  const idx = events.findIndex(e => e.slug === slug);
  const entry = { slug, name: name.trim(), active: active !== false };
  if (idx >= 0) events[idx] = entry;
  else events.unshift(entry);
  saveEventsData(events);
  res.json({ ok: true });
});

app.post('/api/events/:slug/set-default', requireAuth, (req, res) => {
  const { slug } = req.params;
  if (!validSlug(slug)) return res.status(400).json({ error: 'invalid slug' });
  const events = loadEventsData();
  if (!events.find(e => e.slug === slug)) return res.status(404).json({ error: 'not found' });
  saveEventsData(events.map(e => ({ ...e, isDefault: e.slug === slug })));
  res.json({ ok: true });
});

app.delete('/api/events/:slug', requireAuth, (req, res) => {
  const { slug } = req.params;
  if (!validSlug(slug)) return res.status(400).json({ error: 'invalid slug' });
  saveEventsData(loadEventsData().filter(e => e.slug !== slug));
  res.json({ ok: true });
});

app.listen(PORT, '127.0.0.1', () => console.log(`BAF API running on :${PORT}`));
