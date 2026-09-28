'use strict';
/*
 * Home PC relay for live tournament tracking, controlled from the admin "Suivi live" tab.
 * fabtcg.com blocks server IPs, so the scraping has to run from a home connection:
 * this script polls bafbordeaux.fr for the tournament to track and, while a job is
 * running, keeps a hidden Chrome tab open on its coverage page with js/bookmarklet.js
 * injected (loaded from the live site, so it's always the current version).
 *
 * Usage: double-click scripts/live-agent.bat, or `node scripts/live-agent.js`.
 * The first run asks for the admin API key and saves it in live-agent.config.json
 * (git-ignored). Leave the window open; the PC must not go to sleep during events.
 */
const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const puppeteer = require('puppeteer');

const SITE        = process.env.BAF_SITE || 'https://bafbordeaux.fr';
const CONFIG_FILE = path.join(__dirname, 'live-agent.config.json');
const POLL_MS     = 10 * 1000;  // how often the admin's Start / Stop is picked up
const RETRY_MS    = 60 * 1000;  // wait before re-opening fabtcg.com after a failed load

const log = (msg) => console.log(`[${new Date().toLocaleTimeString('fr-FR')}] ${msg}`);

// Installed Chrome / Edge (Puppeteer's own download isn't needed).
const findBrowser = () => {
  const local = process.env.LOCALAPPDATA || '';
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    local && path.join(local, 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  return candidates.find((p) => p && fs.existsSync(p));
};

const ask = (question) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
});

const api = async (key, method, route, body) => {
  const res = await fetch(SITE + route, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// Reads the saved API key, or asks for it (and checks it) on first run.
const loadKey = async () => {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')).apiKey; } catch {}
  for (;;) {
    const key = await ask('Clé API admin (la même que dans l\'onglet Analytics) : ');
    try {
      await api(key, 'GET', '/api/live');
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ apiKey: key }, null, 2));
      log('Clé enregistrée.');
      return key;
    } catch (e) {
      console.log(`Clé refusée ou site injoignable (${e.message}). Réessaie.`);
    }
  }
};

(async () => {
  const executablePath = findBrowser();
  if (!executablePath) {
    console.log('Chrome ou Edge introuvable. Installe Google Chrome, ou indique son chemin dans CHROME_PATH.');
    process.exit(1);
  }
  const key = await loadKey();

  let browser = null;
  let page = null;
  let pageSlug = '';       // tournament the open tab is tracking ('' = none)
  let startedAt = 0;
  let nextAttemptAt = 0;   // back-off after fabtcg.com refused to load

  const getBrowser = async () => {
    if (browser?.connected) return browser;
    browser = await puppeteer.launch({ headless: true, executablePath, args: ['--disable-blink-features=AutomationControlled'] });
    return browser;
  };

  const stopTracking = async () => {
    if (page) await page.close().catch(() => {});
    page = null;
    if (pageSlug) log(`Suivi arrêté : ${pageSlug}`);
    pageSlug = '';
  };

  const startTracking = async (slug) => {
    await stopTracking();
    if (Date.now() < nextAttemptAt) return;
    log(`Ouverture de fabtcg.com/coverage/${slug}/ …`);
    try {
      const b = await getBrowser();
      page = await b.newPage();
      // Headless Chrome announces itself in the user agent; look like the normal browser.
      await page.setUserAgent((await b.userAgent()).replace('HeadlessChrome', 'Chrome'));
      const res = await page.goto(`https://fabtcg.com/coverage/${slug}/`, { waitUntil: 'networkidle2', timeout: 60000 });
      if (!res || res.status() !== 200) throw new Error(`fabtcg.com a répondu ${res ? res.status() : 'rien'}`);
      await page.addScriptTag({ url: `${SITE}/js/bookmarklet.js?key=${encodeURIComponent(key)}&t=${Date.now()}` });
      pageSlug = slug;
      startedAt = Date.now();
      log(`Suivi lancé : ${slug}`);
    } catch (e) {
      log(`Échec : ${e.message}. Nouvel essai dans ${RETRY_MS / 1000}s.`);
      nextAttemptAt = Date.now() + RETRY_MS;
      await stopTracking();
    }
  };

  const tick = async () => {
    const status = page
      ? await page.evaluate(() => window.__bafTrackerRunning?.getStatus?.() || null).catch(() => null)
      : null;

    let job;
    try {
      job = await api(key, 'POST', '/api/live/agent', {
        slug: pageSlug,
        status: status?.text || (pageSlug ? 'Démarrage…' : 'En attente'),
        lastSuccessAt: status?.lastSuccessAt || null,
        consecutiveErrors: status?.consecutiveErrors || 0,
      });
    } catch (e) {
      log(`bafbordeaux.fr injoignable (${e.message})`);
      return;
    }

    if (!job.running || !job.slug) {
      if (pageSlug) await stopTracking();
      return;
    }
    const stale = Date.now() - startedAt > 60000;
    if (job.slug !== pageSlug) await startTracking(job.slug);
    // Tab crashed / script missing, or fabtcg.com keeps failing (expired Cloudflare check): reopen.
    else if (stale && (!status || status.consecutiveErrors >= 3)) {
      log(status ? `${status.consecutiveErrors} échecs d'affilée, rechargement de la page.` : 'Onglet perdu, réouverture.');
      await startTracking(job.slug);
    }
  };

  log(`Relais BAF prêt. Pilotage depuis ${SITE}/admin.html → Suivi live. (Ctrl+C pour quitter)`);
  for (;;) {
    await tick().catch((e) => log(`Erreur : ${e.message}`));
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
})();
