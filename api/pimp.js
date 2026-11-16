'use strict';
/*
 * "Pimp My Deck" backend: POST /api/pimp with { decklist } (plain text).
 * For each card of the list it returns every printing (set, foiling, art variation,
 * image) and every Cardmarket listing of the card with its prices (7-day average etc.).
 *
 * Data sources, refreshed every REFRESH_MS and cached in DATA_DIR/pimp/ so a restart
 * doesn't download them again:
 *  - the-fab-cube card database (open data Fabrary is built on): cards and printings.
 *  - Cardmarket's public daily catalog files for Flesh and Blood (game id 16):
 *    singles, sealed products (only used to name expansions) and the price guide.
 *
 * Cardmarket's files have no set names and no link to printings, so:
 *  - an expansion's name comes from its matching card set (by card-name overlap) or,
 *    failing that, from its sealed products ("Monarch - First Booster" -> "Monarch - First");
 *  - several listings of the same card in one expansion are labeled V.1, V.2... like
 *    Cardmarket does; which one is the foil / cold foil / alt art can't be told from the data,
 *    so each listing also carries its card set + edition and the page lists that set's printings.
 */
const fs   = require('fs');
const path = require('path');
const https = require('https');

const CM = 'https://downloads.s3.cardmarket.com/productCatalog';
const SOURCES = {
  cards:    'https://raw.githubusercontent.com/the-fab-cube/flesh-and-blood-cards/develop/json/english/card.json',
  sets:     'https://raw.githubusercontent.com/the-fab-cube/flesh-and-blood-cards/develop/json/english/set.json',
  singles:  `${CM}/productList/products_singles_16.json`,
  sealed:   `${CM}/productList/products_nonsingles_16.json`,
  prices:   `${CM}/priceGuide/price_guide_16.json`,
};
const REFRESH_MS = 12 * 60 * 60 * 1000;
const MAX_DECK_CHARS = 20000;
const MAX_LINES = 200;

const PITCH_NAME = { 1: 'Red', 2: 'Yellow', 3: 'Blue' };
const PITCH_WORDS = { red: 1, r: 1, 1: 1, yellow: 2, y: 2, 2: 2, blue: 3, b: 3, 3: 3 };
const EDITIONS = { A: 'Alpha', F: '1st Edition', U: 'Unlimited' };
const FOILINGS = { S: 'Standard', R: 'Rainbow Foil', C: 'Cold Foil', G: 'Gold Cold Foil' };
const ARTS = { AA: 'Alternate Art', EA: 'Extended Art', FA: 'Full Art', AB: 'Alternate Border', AT: 'Alternate Text', HS: 'HS' };

// "Fyendal’s  Spring-Tunic" -> "fyendal s spring tunic": case, accents, quotes and
// punctuation don't matter when matching what people type against card names.
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Fabrary card URL id: "Fyendal's Spring Tunic" + red -> "fyendals-spring-tunic-red".
const fabraryId = (name, pitch) => norm(name).replace(/ /g, '-') + (PITCH_NAME[pitch] ? `-${PITCH_NAME[pitch].toLowerCase()}` : '');

/* ---- Download + disk cache ---- */

const getText = (url, redirects = 3) => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'baf-pimp-my-deck' } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
      res.resume();
      return resolve(getText(new URL(res.headers.location, url).href, redirects - 1));
    }
    if (res.statusCode !== 200) { res.resume(); return reject(new Error(`${url} -> HTTP ${res.statusCode}`)); }
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    res.on('error', reject);
  }).on('error', reject).setTimeout(60000, function () { this.destroy(new Error(`${url} timed out`)); });
});

/* ---- Index building ---- */

// Builds the in-memory index from the raw files (parsed JSON).
const buildIndex = ({ cards, sets, singles, sealed, prices }) => {
  const setNames = Object.fromEntries(sets.map((s) => [s.id, s.name]));

  // Cards by "normalized name|pitch". Same name+pitch entries (rare) are merged.
  const byKey = new Map();
  const pitchesByName = new Map(); // normalized name -> Set of pitches, to resolve "Snatch" without a color
  const fabSetNames = new Map();   // "SET|edition" -> Set of "name|pitch" keys, to name Cardmarket expansions
  for (const c of cards) {
    const pitch = Number(c.pitch) || 0;
    const n = norm(c.name);
    const key = `${n}|${pitch}`;
    let entry = byKey.get(key);
    if (!entry) {
      entry = { name: c.name, pitch, types: c.types || [], printings: [], seen: new Set() };
      byKey.set(key, entry);
    }
    if (!pitchesByName.has(n)) pitchesByName.set(n, new Set());
    pitchesByName.get(n).add(pitch);
    for (const p of c.printings || []) {
      const fk = `${p.set_id}|${p.edition}`;
      if (!fabSetNames.has(fk)) fabSetNames.set(fk, new Set());
      fabSetNames.get(fk).add(key);
      const arts = (p.art_variations || []).slice().sort();
      // One entry per distinct version (the same version can be listed twice, e.g. reprint promos)
      const dedupe = `${p.id}|${p.edition}|${p.foiling}|${arts.join('+')}`;
      if (entry.seen.has(dedupe)) continue;
      entry.seen.add(dedupe);
      entry.printings.push({
        id: p.id,
        set: p.set_id,
        setName: setNames[p.set_id] || p.set_id,
        edition: EDITIONS[p.edition] || '',
        editionCode: p.edition,
        foiling: FOILINGS[p.foiling] || p.foiling,
        foilCode: p.foiling,
        arts: arts.map((a) => ARTS[a] || a),
        rarity: p.rarity,
        image: p.image_url || null,
      });
    }
  }
  for (const e of byKey.values()) delete e.seen;

  // Names of everything a decklist can contain, for splitting "Equipment: A, B, C"
  // when card names themselves contain commas ("Bravo, Showstopper").
  const commaNames = new Set();
  for (const e of byKey.values()) if (e.name.includes(',')) commaNames.add(norm(e.name));

  // Cardmarket products grouped by card key, and by expansion (for naming).
  const priceById = new Map(prices.map((p) => [p.idProduct, p]));
  const cmByExpansion = new Map();
  const cmByKey = new Map();
  for (const p of singles) {
    // Double-faced cards are listed as "Front // Back"
    const cmName = p.name.split(' // ')[0].trim();
    const m = cmName.match(/^(.*?)\s*\((Red|Yellow|Blue)\)$/i);
    const baseName = m ? m[1] : cmName;
    const n = norm(baseName);
    let key = m ? `${n}|${PITCH_WORDS[m[2].toLowerCase()]}` : `${n}|0`;
    // Cardmarket leaves the color out when a card exists in one color only ("Swing Big")
    const known = pitchesByName.get(n);
    if (!m && !byKey.has(key) && known && known.size === 1) key = `${n}|${[...known][0]}`;
    // Card not in the card database yet (newest set): known from Cardmarket only,
    // so it can still be looked up and priced, just without versions / images.
    if (!byKey.has(key)) {
      const pitch = Number(key.split('|')[1]);
      byKey.set(key, { name: baseName, pitch, types: [], printings: [], cardmarketOnly: true });
      if (!pitchesByName.has(n)) pitchesByName.set(n, new Set());
      pitchesByName.get(n).add(pitch);
      if (baseName.includes(',')) commaNames.add(n);
    }
    if (!cmByExpansion.has(p.idExpansion)) cmByExpansion.set(p.idExpansion, new Set());
    cmByExpansion.get(p.idExpansion).add(key);
    if (!cmByKey.has(key)) cmByKey.set(key, []);
    cmByKey.get(key).push(p);
  }

  // Expansion names, part 1: the card set whose cards best match the expansion's.
  // Kept only when clear-cut: most of the expansion's cards are in the set, the set
  // is mostly covered, and no other set scores the same (Alpha vs Unlimited tie).
  const expansionNames = new Map();
  // Card set (+ edition) of each expansion, looser than naming (a blitz deck maps to the
  // set its cards are numbered in). Used to list the versions behind V.1 / V.2.
  const expansionSets = new Map();
  for (const [idExp, keys] of cmByExpansion) {
    const scores = [];
    for (const [fk, fabKeys] of fabSetNames) {
      let inter = 0;
      for (const k of keys) if (fabKeys.has(k)) inter++;
      if (inter) scores.push({ fk, score: inter / keys.size, cover: inter / fabKeys.size });
    }
    scores.sort((a, b) => b.score - a.score || b.cover - a.cover);
    const [best, second] = scores;
    if (best && best.score >= 0.5) {
      const [set, edition] = best.fk.split('|');
      // Alpha vs Unlimited score the same: the edition is read from the name further down
      const tied = second && second.score === best.score && second.fk.split('|')[0] === set;
      expansionSets.set(idExp, { set, edition: tied ? null : edition });
    }
    if (best && best.score >= 0.5 && best.cover >= 0.3 && !(second && second.score === best.score && second.cover === best.cover)) {
      expansionNames.set(idExp, setNames[best.fk.split('|')[0]] || best.fk);
    }
  }
  // Two expansions matched to one set (History Pack 1 / Black Label): name both from part 2.
  const uses = new Map();
  for (const n of expansionNames.values()) uses.set(n, (uses.get(n) || 0) + 1);
  // Part 2: the expansion's sealed products, minus "Booster Box", "Case (4 ...)" etc.
  const sealedByExp = new Map();
  for (const p of sealed) {
    if (!sealedByExp.has(p.idExpansion)) sealedByExp.set(p.idExpansion, []);
    sealedByExp.get(p.idExpansion).push(p.name);
  }
  for (const [idExp, names] of sealedByExp) {
    if (expansionNames.has(idExp) && uses.get(expansionNames.get(idExp)) === 1) continue;
    const cleaned = names
      .map((n) => n.replace(/\s*(:\s*)?(Case\b.*|Booster Box.*|Booster\b.*|Display of.*|Box Set|Box)$/i, '').replace(/[\s:-]+$/, '').trim())
      .filter(Boolean)
      .sort((a, b) => a.length - b.length);
    if (cleaned[0]) expansionNames.set(idExp, cleaned[0]);
  }
  for (const [idExp, s] of expansionSets) {
    if (s.edition) continue;
    const n = expansionNames.get(idExp) || '';
    s.edition = /alpha/i.test(n) ? 'A' : /first/i.test(n) ? 'F' : /unlimited/i.test(n) ? 'U' : null;
  }

  // Cardmarket listings per card, with prices, V.1/V.2 numbering per expansion.
  const listings = new Map();
  for (const [key, products] of cmByKey) {
    products.sort((a, b) => a.idProduct - b.idProduct);
    const perExp = new Map();
    products.forEach((p) => perExp.set(p.idExpansion, (perExp.get(p.idExpansion) || 0) + 1));
    const counter = new Map();
    listings.set(key, products.map((p) => {
      const n = (counter.get(p.idExpansion) || 0) + 1;
      counter.set(p.idExpansion, n);
      const pr = priceById.get(p.idProduct) || {};
      const es = expansionSets.get(p.idExpansion);
      return {
        idProduct: p.idProduct,
        name: p.name,
        idExpansion: p.idExpansion,
        expansion: expansionNames.get(p.idExpansion) || null,
        set: es?.set || null,          // card-DB set id and edition code (A/F/U/N, null = any)
        edition: es?.edition || null,
        version: perExp.get(p.idExpansion) > 1 ? `V.${n}` : null,
        avg7: pr.avg7 ?? null,
        avg1: pr.avg1 ?? null,
        avg30: pr.avg30 ?? null,
        trend: pr.trend ?? null,
        low: pr.low ?? null,
      };
    }));
  }

  return { byKey, pitchesByName, commaNames, listings, pricesDate: null, builtAt: Date.now() };
};

/* ---- Decklist parsing ---- */

// Lines that are export decoration, not cards.
const SKIP_LINE = /^(name|deck|format|class|talents?|deck build|made with|deck cards|arena cards|main( deck)?|sideboard|inventory|maybe(board)?|notes?|tokens?)\b|^(https?:\/\/|#|\/\/|=+|-+$)/i;
const LIST_KEYS = /^(hero|weapons?|equipments?|equipment)\s*:\s*(.*)$/i;

// "Snatch (red)" / "Snatch (R)" / "Snatch - Red" -> { name: 'Snatch', pitch: 1 }
const splitPitch = (s) => {
  const m = s.match(/^(.*?)\s*(?:\(\s*(red|yellow|blue|r|y|b|1|2|3)\s*\)|\[\s*(red|yellow|blue|r|y|b|1|2|3)\s*\]|\s-\s*(red|yellow|blue))\s*$/i);
  if (!m) return { name: s.trim(), pitch: null };
  return { name: m[1].trim(), pitch: PITCH_WORDS[(m[2] || m[3] || m[4]).toLowerCase()] };
};

// "(3) Snatch (red)", "3x Snatch", "3 Snatch", "Snatch x3" -> { qty: 3, rest: 'Snatch (red)' }
const splitQty = (line) => {
  let m = line.match(/^\(?\s*(\d{1,2})\s*\)?\s*x?\s+(.+)$/i) || line.match(/^x\s*(\d{1,2})\s+(.+)$/i);
  if (m) return { qty: Number(m[1]), rest: m[2] };
  m = line.match(/^(.+?)\s+(?:x\s*(\d{1,2})|\((\d{1,2})\))$/i);
  if (m && !/^(red|yellow|blue|[ryb123])$/i.test(m[3] || '')) return { qty: Number(m[2] || m[3]), rest: m[1] };
  return { qty: 1, rest: line };
};

// Resolves a typed card to an index key, or explains why it can't.
const resolve = (idx, text) => {
  const { name, pitch } = splitPitch(text);
  const n = norm(name);
  const pitches = idx.pitchesByName.get(n);
  if (!pitches) return { error: 'unknown' };
  if (pitch != null) {
    if (pitches.has(pitch)) return { key: `${n}|${pitch}` };
    // Only known without a color (new card Cardmarket lists as "Fallen Herald"): take it
    if (pitches.size === 1 && pitches.has(0)) return { key: `${n}|0` };
    return { error: 'pitch' };
  }
  if (pitches.size === 1) return { key: `${n}|${[...pitches][0]}` };
  return { error: 'ambiguous', options: [...pitches].sort().map((p) => PITCH_NAME[p]).filter(Boolean) };
};

// "A, Bravo, Showstopper, C" -> ["A", "Bravo, Showstopper", "C"] using known comma names.
const splitList = (idx, value) => {
  const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    let taken = false;
    for (let j = Math.min(parts.length, i + 4); j > i + 1; j--) {
      const joined = parts.slice(i, j).join(', ');
      if (idx.commaNames.has(norm(splitPitch(joined).name))) { out.push(joined); i = j - 1; taken = true; break; }
    }
    if (!taken) out.push(parts[i]);
  }
  return out;
};

const parseDecklist = (idx, text) => {
  const entries = new Map(); // key -> qty (in first-seen order)
  const problems = [];
  const add = (raw, qty) => {
    const r = resolve(idx, raw);
    if (r.key) entries.set(r.key, (entries.get(r.key) || 0) + qty);
    else problems.push({ line: raw, reason: r.error, options: r.options });
  };

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, MAX_LINES);
  for (const line of lines) {
    const list = line.match(LIST_KEYS);
    if (list) { splitList(idx, list[2]).forEach((item) => add(item, 1)); continue; }
    const { qty, rest } = splitQty(line);
    // A known card wins over the skip rules ("Deck cards" is not a card, but be safe)
    if (resolve(idx, rest).key) { add(rest, qty); continue; }
    if (SKIP_LINE.test(line) || /^[^:]{1,30}:/.test(line) && !/\d/.test(line.split(':')[0])) continue;
    add(rest, qty);
  }
  return { entries, problems };
};

/* ---- Module state + routes ---- */

module.exports = function mountPimp(app, { dataDir }) {
  const cacheDir = path.join(dataDir, 'pimp');
  fs.mkdirSync(cacheDir, { recursive: true });
  let index = null;
  let loading = null;
  let lastError = null;

  // Raw file from disk if younger than maxAge, else downloaded (and saved).
  // A failed download falls back to an older disk copy.
  const fetchSource = async (name, maxAge) => {
    const file = path.join(cacheDir, `${name}.json`);
    let stat = null;
    try { stat = fs.statSync(file); } catch {}
    if (stat && Date.now() - stat.mtimeMs < maxAge) return JSON.parse(fs.readFileSync(file, 'utf8'));
    try {
      const text = await getText(SOURCES[name]);
      const data = JSON.parse(text);
      fs.writeFileSync(file, text);
      return data;
    } catch (err) {
      if (stat) { console.warn(`[pimp] ${name}: ${err.message}, using cached copy`); return JSON.parse(fs.readFileSync(file, 'utf8')); }
      throw err;
    }
  };

  const load = (maxAge) => {
    if (loading) return loading;
    loading = (async () => {
      const raw = {};
      for (const name of Object.keys(SOURCES)) raw[name] = await fetchSource(name, maxAge);
      const next = buildIndex({
        cards: raw.cards, sets: raw.sets,
        singles: raw.singles.products, sealed: raw.sealed.products, prices: raw.prices.priceGuides,
      });
      next.pricesDate = raw.prices.createdAt || null;
      index = next;
      lastError = null;
      console.log(`[pimp] index ready: ${next.byKey.size} cards, ${next.listings.size} Cardmarket cards, prices ${next.pricesDate}`);
    })().catch((err) => {
      lastError = err.message;
      console.error('[pimp] load failed:', err.message);
    }).finally(() => { loading = null; });
    return loading;
  };

  // Warm up at start (disk copies if fresh), then refresh in the background.
  load(REFRESH_MS);
  setInterval(() => load(REFRESH_MS), 60 * 60 * 1000).unref();

  app.post('/api/pimp', async (req, res) => {
    const text = typeof req.body?.decklist === 'string' ? req.body.decklist : '';
    if (!text.trim()) return res.status(400).json({ error: 'empty' });
    if (text.length > MAX_DECK_CHARS) return res.status(413).json({ error: 'too_long' });
    if (!index) await load(REFRESH_MS);
    if (!index) return res.status(503).json({ error: 'data_unavailable', detail: lastError });

    const { entries, problems } = parseDecklist(index, text);
    const cards = [...entries].map(([key, qty]) => {
      const c = index.byKey.get(key);
      const listings = index.listings.get(key) || [];
      const priced = listings.filter((l) => l.avg7 != null && l.avg7 > 0).map((l) => l.avg7);
      return {
        key, // stable id ("snatch|1"), used by the page to remember owned cards
        qty,
        name: c.name,
        pitch: c.pitch || null,
        types: c.types,
        cardmarketOnly: !!c.cardmarketOnly,
        fabrary: `https://fabrary.net/cards/${fabraryId(c.name, c.pitch)}`,
        printings: c.printings,
        listings,
        cheapest: priced.length ? Math.min(...priced) : null,
        priciest: priced.length ? Math.max(...priced) : null,
      };
    });
    res.json({ pricesDate: index.pricesDate, builtAt: index.builtAt, cards, problems });
  });
};

// Exposed for local testing.
module.exports.buildIndex = buildIndex;
module.exports.parseDecklist = parseDecklist;
