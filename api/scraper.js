'use strict';
/*
 * VPS-side live tournament tracking (admin tab "Suivi live (VPS)").
 * While running, spawns scraper-worker.js for the tracked slug, waits for it to exit,
 * then schedules the next run CYCLE_MS later. Only one tournament at a time.
 * State is saved to <dataDir>/scraper-state.json so tracking resumes after a restart.
 */
const { spawn } = require('child_process');
const fs        = require('fs');
const path      = require('path');

// Delay between the end of one scrape and the start of the next.
const CYCLE_MS = 2 * 60 * 1000;

module.exports = ({ dataDir, workerPath }) => {
  const statePath = path.join(dataDir, 'scraper-state.json');

  let state = {
    running: false,
    slug: '',
    startedAt: null,
    lastRunAt: null,
    lastSuccessAt: null,
    lastError: null,
    lastErrorAt: null,
    consecutiveErrors: 0,
    lastPlayersCount: null,
  };
  let timer = null;       // pending setTimeout for the next cycle
  let inFlight = false;   // true while a worker process is running

  const loadState = () => {
    try { state = { ...state, ...JSON.parse(fs.readFileSync(statePath, 'utf8')) }; } catch {}
  };
  const persist = () => { try { fs.writeFileSync(statePath, JSON.stringify(state, null, 2)); } catch {} };

  // Runs one scrape in a child process; records success/failure, then re-arms the timer.
  // The worker's last output line becomes lastError on failure, shown in the admin panel.
  const runCycle = () => {
    inFlight = true;
    state.lastRunAt = new Date().toISOString();
    persist();

    const child = spawn(process.execPath, [workerPath, state.slug], { env: process.env });
    let output = '';
    child.stdout.on('data', d => { output += d; });
    child.stderr.on('data', d => { output += d; });

    child.on('close', code => {
      inFlight = false;
      if (code === 0) {
        state.lastSuccessAt = new Date().toISOString();
        state.consecutiveErrors = 0;
        state.lastError = null;
        const m = output.match(/(\d+) players/);
        if (m) state.lastPlayersCount = Number(m[1]);
      } else {
        state.consecutiveErrors += 1;
        state.lastError = output.trim().split('\n').pop() || `exit code ${code}`;
        state.lastErrorAt = new Date().toISOString();
      }
      persist();
      if (state.running) timer = setTimeout(runCycle, CYCLE_MS);
    });
  };

  // Starts tracking `slug`. Refused (409) if another tournament is already tracked.
  const start = (slug) => {
    if (state.running && state.slug !== slug) {
      return { ok: false, code: 409, status: { ...state } };
    }
    if (state.running && state.slug === slug) {
      return { ok: true, code: 200, status: { ...state } };
    }
    state = { ...state, running: true, slug, startedAt: new Date().toISOString(), consecutiveErrors: 0, lastError: null };
    persist();
    runCycle();
    return { ok: true, code: 200, status: status() };
  };

  const stop = () => {
    state.running = false;
    if (timer) { clearTimeout(timer); timer = null; }
    persist();
    return { ok: true, code: 200, status: { ...state } };
  };

  // "Scraper maintenant": skips the wait and scrapes immediately (no-op if one is already running).
  const runNow = () => {
    if (!state.running) return { ok: false, code: 409, error: 'not running', status: status() };
    if (inFlight) return { ok: true, code: 200, status: status() };
    if (timer) { clearTimeout(timer); timer = null; }
    runCycle();
    return { ok: true, code: 200, status: status() };
  };

  const status = () => ({ ...state, inFlight });

  // Called once at server start-up: restores saved state and resumes tracking if it was on.
  const resume = () => {
    loadState();
    if (state.running && state.slug) {
      console.log(`Scraper: resuming previous session for "${state.slug}"`);
      runCycle();
    }
  };

  return { start, stop, runNow, status, resume };
};
