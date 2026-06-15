'use strict';
const express = require('express');
const cors    = require('cors');
const crypto  = require('crypto');
const db      = require('./db');

const app     = express();
const PORT    = Number(process.env.PORT) || 3001;
const API_KEY = process.env.API_KEY || '';

app.use(express.json({ limit: '4kb' }));
app.use(cors({
  origin: /^https?:\/\/(www\.)?bafbordeaux\.fr(:\d+)?$/,
  methods: ['GET', 'POST'],
}));

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

const requireAuth = (req, res, next) => {
  if (!API_KEY) return res.status(503).json({ error: 'API_KEY not set' });
  if (req.headers['authorization'] !== `Bearer ${API_KEY}`) return res.status(401).json({ error: 'unauthorized' });
  next();
};

app.get('/api/stats', requireAuth, (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
  res.json({
    overview: db.getOverview(days),
    daily:    db.getDaily(days),
    pages:    db.getByPage(days),
  });
});

app.listen(PORT, '127.0.0.1', () => console.log(`BAF API running on :${PORT}`));
