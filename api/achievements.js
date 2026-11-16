'use strict';
/*
 * Automatic achievements from tracked tournament results.
 *
 * Members link their account to a followed player on members.html (profiles.player_name,
 * linked right away unless another account already has that player: then 'pending' until an
 * admin decides, see vps-setup/supabase-player-links.sql). For linked members, the server
 * reads the standings of the tracked "Tier 3" events (Calling, Battle Hardened, Pro Tour,
 * National and World Championships) and grants:
 *   <Class> Master (Silver)  : 10 match wins with that class
 *   <Class> Expert (Gold)    : reached Day 2 with that class
 *   <Class> Legend (Diamond) : Top 8 with that class
 *   Le Voyageur              : played 5 Callings
 *   Omega Chad               : won a Calling or a Pro Tour
 *   Le Polyvalent            : Master in 2 classes
 * The class comes from the hero played (the-fab-cube card database cached by pimp.js, then
 * the site's hero list in js/members.js for heroes too recent for it).
 * Day 2 = rounds after the cut (player count drops by a third or more in one round);
 * Top 8 = the round with exactly 8 players.
 *
 * Runs 5 min after each standings upload, every 6 h, right after a member links their
 * player (POST /api/achievements/sync from members.html) and on demand from the admin page.
 * What it granted is remembered in DATA_DIR/auto-achievements.json: if an admin removes an
 * achievement, it isn't granted again.
 */
const fs = require('fs');
const path = require('path');

const TIER3 = /calling|battle[-\s]?hardened|pro[-\s]?tour|national|world[-\s]?championship/i;
const NOT_TIER3 = /premiere|skirmish|pro[-\s]?quest|\bpq\b|road[-\s]?to|\brtn\b|qualifier|\bwcq\b/i;
// Card types -> class name used by the achievements table
const CLASSES = {
  Assassin: 'Assassin', Brute: 'Brute', Guardian: 'Guardian', Illusionist: 'Illusionist', Merchant: 'Marchand',
  Mechanologist: 'Mechanologist', Necromancer: 'Nécromancien', Ninja: 'Ninja', Ranger: 'Ranger',
  Runeblade: 'Runeblade', Warrior: 'Warrior', Wizard: 'Wizard',
};
const MASTER_WINS = 10;
const VOYAGEUR_CALLINGS = 5;
const RUN_EVERY_MS = 6 * 60 * 60 * 1000;
const AFTER_UPLOAD_MS = 5 * 60 * 1000;

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const roundNum = (r) => Number((String(r).match(/round\s+(\d+)/i) || [])[1]) || null;

const eventKind = (e) => {
  const s = `${e.slug} ${e.name || ''}`;
  if (/pro[-\s]?tour/i.test(s)) return 'protour';
  if (/world[-\s]?championship/i.test(s)) return 'world';
  if (/national/i.test(s)) return 'nationals';
  if (/battle[-\s]?hardened/i.test(s)) return 'battlehardened';
  if (/calling/i.test(s)) return 'calling';
  return null;
};

// Cut / Top 8 / final round numbers of an event, from how many players played each round.
const analyzeRounds = (standings) => {
  const counts = new Map();
  for (const p of standings) for (const h of p.history || []) {
    const n = roundNum(h.round);
    if (n) counts.set(n, (counts.get(n) || 0) + 1);
  }
  const nums = [...counts.keys()].sort((a, b) => a - b);
  const top8 = nums.find((n) => counts.get(n) === 8 && (counts.get(n - 1) || 0) > 8) || null;
  const cut = nums.find((n) => (!top8 || n < top8) && (counts.get(n - 1) || 0) >= 16 && counts.get(n) <= counts.get(n - 1) * 0.65) || null;
  const final = top8 && counts.get(top8 + 2) === 2 ? top8 + 2 : null;
  return { cut, top8, final };
};

module.exports = function mountAchievements(app, { dataDir, standingsDir, eventsFile, requireAuth, supabaseUrl, serviceKey }) {
  const ledgerFile = path.join(dataDir, 'auto-achievements.json');
  const reportFile = path.join(dataDir, 'auto-achievements-report.json');
  const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } };

  /* ---- Supabase (service key: bypasses row level security) ---- */
  const sb = async (pathq, opts = {}) => {
    if (!supabaseUrl || !serviceKey) throw new Error('Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY)');
    const res = await fetch(`${supabaseUrl}/rest/v1/${pathq}`, {
      ...opts,
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : null;
  };

  /* ---- Hero -> classes, from the card database pimp.js keeps in DATA_DIR/pimp ---- */
  let heroClasses = null;
  const classesOf = (hero) => {
    if (!heroClasses) {
      heroClasses = new Map();
      const cards = readJson(path.join(dataDir, 'pimp', 'cards.json'), []);
      for (const c of cards) {
        if (!(c.types || []).includes('Hero')) continue;
        const cls = (c.types || []).map((t) => CLASSES[t]).filter(Boolean);
        for (const key of [norm(c.name), norm(c.name.split(',')[0])]) {
          if (!heroClasses.has(key)) heroClasses.set(key, new Set());
          cls.forEach((x) => heroClasses.get(key).add(x));
        }
      }
      // Heroes too recent for the card database (Malice): the site's own hero list in
      // js/members.js ({ name: '...', ..., class: '...' }) fills the gaps.
      try {
        const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'members.js'), 'utf8');
        for (const m of src.matchAll(/name:\s*(['"])(.*?)\1[^}\n]*class:\s*'([^']+)'/g)) {
          const cls = m[3];
          if (!Object.values(CLASSES).includes(cls)) continue;
          for (const key of [norm(m[2]), norm(m[2].split(',')[0])]) {
            if (!heroClasses.has(key)) heroClasses.set(key, new Set([cls]));
          }
        }
      } catch { /* hero list not found: card database only */ }
      if (!heroClasses.size) heroClasses = null; // nothing loaded yet: retry next time
    }
    if (!heroClasses || !hero || hero === 'N/A') return [];
    return [...(heroClasses.get(norm(hero)) || heroClasses.get(norm(String(hero).split(',')[0])) || [])];
  };

  /* ---- Results of every tracked Tier 3 event, per player ---- */
  // -> Map(normalized player name -> [{ slug, name, kind, hero, classes, wins, day2, top8, won }])
  const collectResults = () => {
    const events = readJson(eventsFile, []);
    const byPlayer = new Map();
    for (const e of events) {
      if (!TIER3.test(`${e.slug} ${e.name || ''}`) || NOT_TIER3.test(`${e.slug} ${e.name || ''}`)) continue;
      const data = readJson(path.join(standingsDir, `${e.slug}.json`), null);
      if (!data?.standings?.length) continue;
      const { cut, top8, final } = analyzeRounds(data.standings);
      for (const p of data.standings) {
        const rounds = (p.history || []).map((h) => ({ n: roundNum(h.round), result: h.result }));
        const entry = {
          slug: e.slug,
          name: e.name || e.slug,
          kind: eventKind(e),
          hero: p.hero || null,
          classes: classesOf(p.hero),
          wins: rounds.filter((r) => r.result === 'win').length,
          losses: rounds.filter((r) => r.result === 'loss').length,
          draws: rounds.filter((r) => r.result === 'draw').length,
          // A Top 8 counts as Day 2 too (some events show no clear cut, e.g. Nationals)
          day2: (!!cut && rounds.some((r) => r.n >= cut)) || (!!top8 && rounds.some((r) => r.n >= top8)),
          top8: !!top8 && rounds.some((r) => r.n >= top8),
          won: !!final && rounds.some((r) => r.n === final && r.result === 'win'),
        };
        const key = norm(p.name);
        if (!byPlayer.has(key)) byPlayer.set(key, []);
        byPlayer.get(key).push(entry);
      }
    }
    return byPlayer;
  };

  // Totals for one player: per class wins / day 2 / top 8, per kind of event (Calling, Pro Tour,
  // Nationals...: played, match record, Day 2s, Top 8s, titles), Callings played, Calling / PT won.
  const summarize = (entries) => {
    const perClass = {};
    const perKind = {};
    for (const e of entries) {
      for (const c of e.classes) {
        const s = (perClass[c] ||= { wins: 0, day2: false, top8: false });
        s.wins += e.wins;
        s.day2 ||= e.day2;
        s.top8 ||= e.top8;
      }
      const k = (perKind[e.kind || 'other'] ||= { played: 0, wins: 0, losses: 0, draws: 0, day2: 0, top8: 0, won: 0 });
      k.played += 1;
      k.wins += e.wins;
      k.losses += e.losses;
      k.draws += e.draws;
      k.day2 += e.day2 ? 1 : 0;
      k.top8 += e.top8 ? 1 : 0;
      k.won += e.won ? 1 : 0;
    }
    return {
      events: entries.map(({ slug, name, kind, hero, wins, losses, draws, day2, top8, won }) => ({ slug, name, kind, hero, wins, losses, draws, day2, top8, won })),
      perClass,
      perKind,
      callings: entries.filter((e) => e.kind === 'calling').length,
      bigWin: entries.some((e) => e.won && (e.kind === 'calling' || e.kind === 'protour')),
    };
  };

  // Achievement ids a player's summary earns, given the achievements table.
  const earnedIds = (sum, achievements) => {
    const ids = new Set();
    const classAch = (cls, tier) => achievements.find((a) => a.category === 'class' && a.class === cls && a.tier === tier);
    let masters = 0;
    for (const [cls, s] of Object.entries(sum.perClass)) {
      if (s.wins >= MASTER_WINS) { const a = classAch(cls, 'Silver'); if (a) { ids.add(a.id); masters++; } }
      if (s.day2) { const a = classAch(cls, 'Gold'); if (a) ids.add(a.id); }
      if (s.top8) { const a = classAch(cls, 'Diamond'); if (a) ids.add(a.id); }
    }
    const byName = (n) => achievements.find((a) => norm(a.name) === norm(n));
    if (sum.callings >= VOYAGEUR_CALLINGS && byName('Le Voyageur')) ids.add(byName('Le Voyageur').id);
    if (sum.bigWin && byName('Omega Chad')) ids.add(byName('Omega Chad').id);
    if (masters >= 2 && byName('Le Polyvalent')) ids.add(byName('Le Polyvalent').id);
    return ids;
  };

  /* ---- Run ---- */
  let running = null;
  const run = () => running || (running = (async () => {
    const [achievements, members, grants] = await Promise.all([
      sb('achievements?select=id,name,tier,category,class'),
      sb('profiles?select=id,pseudo,player_name,player_status&player_status=eq.approved'),
      sb('member_achievements?select=member_id,achievement_id'),
    ]);
    const has = new Set(grants.map((g) => `${g.member_id}|${g.achievement_id}`));
    const ledger = readJson(ledgerFile, {});
    const results = collectResults();
    const report = { ranAt: new Date().toISOString(), members: [], granted: [] };
    const toInsert = [];

    for (const m of members) {
      const sum = summarize(results.get(norm(m.player_name)) || []);
      const earned = earnedIds(sum, achievements);
      const fresh = [...earned].filter((id) => !has.has(`${m.id}|${id}`) && !ledger[`${m.id}|${id}`]);
      fresh.forEach((id) => toInsert.push({ member_id: m.id, achievement_id: id }));
      report.members.push({ id: m.id, pseudo: m.pseudo, player: m.player_name, summary: sum, earned: [...earned], grantedNow: fresh });
    }
    if (toInsert.length) {
      await sb('member_achievements', { method: 'POST', body: JSON.stringify(toInsert), headers: { Prefer: 'return=minimal' } });
      const now = new Date().toISOString();
      for (const g of toInsert) ledger[`${g.member_id}|${g.achievement_id}`] = now;
      fs.writeFileSync(ledgerFile, JSON.stringify(ledger, null, 1));
    }
    const names = Object.fromEntries(achievements.map((a) => [a.id, a.name]));
    report.granted = toInsert.map((g) => ({ ...g, pseudo: members.find((m) => m.id === g.member_id)?.pseudo, achievement: names[g.achievement_id] }));
    fs.writeFileSync(reportFile, JSON.stringify(report));
    console.log(`[achievements] ${members.length} linked members, ${toInsert.length} granted`);
    return report;
  })().finally(() => { running = null; }));

  let uploadTimer = null;
  const afterUpload = () => {
    clearTimeout(uploadTimer);
    uploadTimer = setTimeout(() => run().catch((err) => console.error('[achievements]', err.message)), AFTER_UPLOAD_MS);
  };
  if (supabaseUrl && serviceKey) {
    setInterval(() => run().catch((err) => console.error('[achievements]', err.message)), RUN_EVERY_MS).unref();
  }

  /* ---- Routes ---- */

  // Public: tracked results of one player (they're public standings anyway), for members.html.
  app.get('/api/player-stats', (req, res) => {
    const name = String(req.query.name || '').slice(0, 100);
    if (!name.trim()) return res.status(400).json({ error: 'name required' });
    res.setHeader('Cache-Control', 'no-store');
    res.json(summarize(collectResults().get(norm(name)) || []));
  });

  // Admin: members who chose a followed player (pending first).
  app.get('/api/player-links', requireAuth, async (req, res) => {
    try {
      const rows = await sb('profiles?select=id,pseudo,player_name,player_status&player_name=not.is.null&order=player_status.desc');
      res.json(rows);
    } catch (err) { res.status(502).json({ error: err.message }); }
  });

  // Admin: approve or reject a link. { id, action: 'approve' | 'reject' }
  app.post('/api/player-links', requireAuth, async (req, res) => {
    const { id, action } = req.body || {};
    if (!/^[0-9a-f-]{36}$/i.test(String(id)) || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'invalid' });
    try {
      if (action === 'approve') {
        const [row] = await sb(`profiles?select=player_name&id=eq.${id}`);
        if (!row?.player_name) return res.status(404).json({ error: 'no player' });
        const taken = await sb(`profiles?select=id,pseudo&player_status=eq.approved&player_name=ilike.${encodeURIComponent(row.player_name)}&id=neq.${id}`);
        if (taken.length) return res.status(409).json({ error: `déjà lié à ${taken[0].pseudo || 'un autre compte'}` });
        await sb(`profiles?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ player_status: 'approved' }), headers: { Prefer: 'return=minimal' } });
        // Grant what this player already earned (after any run in progress)
        Promise.resolve(running).catch(() => {}).finally(() => run().catch((err) => console.error('[achievements]', err.message)));
      } else {
        await sb(`profiles?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ player_name: null, player_status: null }), headers: { Prefer: 'return=minimal' } });
      }
      res.json({ ok: true });
    } catch (err) { res.status(502).json({ error: err.message }); }
  });

  // Public: called by members.html right after a member links their player, so their
  // achievements arrive now instead of at the next 6-hourly run. At most one run per 30 s;
  // returns only a count (the report names other members).
  let lastSync = 0;
  let queuedSync = null;
  app.post('/api/achievements/sync', async (req, res) => {
    if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: 'not configured' });
    const wait = 30000 - (Date.now() - lastSync);
    if (wait > 0) {
      // Too soon after the last one: one run queued for when the 30 s are up
      queuedSync ||= setTimeout(() => { queuedSync = null; lastSync = Date.now(); run().catch((err) => console.error('[achievements]', err.message)); }, wait);
      return res.json({ ok: true, queued: true });
    }
    lastSync = Date.now();
    try { const report = await run(); res.json({ ok: true, granted: report.granted.length }); } catch (err) { res.status(502).json({ error: 'failed' }); }
  });

  // Admin: run now / last report.
  app.post('/api/achievements/run', requireAuth, async (req, res) => {
    try { res.json(await run()); } catch (err) { res.status(502).json({ error: err.message }); }
  });
  app.get('/api/achievements/report', requireAuth, (req, res) => {
    res.json(readJson(reportFile, null));
  });

  return { afterUpload };
};

module.exports.analyzeRounds = analyzeRounds;
