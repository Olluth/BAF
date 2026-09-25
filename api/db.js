'use strict';
/*
 * SQLite storage for page-view analytics (<DATA_DIR>/analytics.db).
 * Written by POST /api/track, read by GET /api/stats for the admin Analytics tab.
 * Visitors are counted by a daily-salted IP hash, so no raw IP is stored.
 */
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'analytics.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS pageviews (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    page       TEXT    NOT NULL,
    referrer   TEXT    NOT NULL DEFAULT '',
    ua         TEXT    NOT NULL DEFAULT '',
    ip_hash    TEXT    NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_pv_created ON pageviews(created_at);
  CREATE INDEX IF NOT EXISTS idx_pv_page    ON pageviews(page);
`);

const stmtInsert = db.prepare(
  `INSERT INTO pageviews (page, referrer, ua, ip_hash) VALUES (?, ?, ?, ?)`
);

// Unix timestamp (seconds) of `days` days ago.
const since = (days) => Math.floor(Date.now() / 1000) - days * 86400;

module.exports = {
  track(page, referrer, ua, ipHash) {
    stmtInsert.run(page, referrer, ua, ipHash);
  },

  // Total views and unique visitors over the period.
  getOverview(days) {
    const s = since(days);
    return {
      views:    db.prepare(`SELECT COUNT(*) AS n FROM pageviews WHERE created_at >= ?`).get(s).n,
      visitors: db.prepare(`SELECT COUNT(DISTINCT ip_hash) AS n FROM pageviews WHERE created_at >= ?`).get(s).n,
    };
  },

  // Views and visitors per day, oldest first (bar chart).
  getDaily(days) {
    return db.prepare(`
      SELECT date(created_at, 'unixepoch') AS day,
             COUNT(*) AS views,
             COUNT(DISTINCT ip_hash) AS visitors
      FROM pageviews WHERE created_at >= ?
      GROUP BY day ORDER BY day ASC
    `).all(since(days));
  },

  // Top 20 pages by views.
  getByPage(days) {
    return db.prepare(`
      SELECT page,
             COUNT(*) AS views,
             COUNT(DISTINCT ip_hash) AS visitors
      FROM pageviews WHERE created_at >= ?
      GROUP BY page ORDER BY views DESC LIMIT 20
    `).all(since(days));
  },
};
