'use strict';
const { spawn } = require('child_process');
const fs        = require('fs');
const path      = require('path');

const CYCLE_MS = 90 * 1000;

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
  let timer = null;

  const loadState = () => {
    try { state = { ...state, ...JSON.parse(fs.readFileSync(statePath, 'utf8')) }; } catch {}
  };
  const persist = () => { try { fs.writeFileSync(statePath, JSON.stringify(state, null, 2)); } catch {} };

  const runCycle = () => {
    state.lastRunAt = new Date().toISOString();
    persist();

    const child = spawn(process.execPath, [workerPath, state.slug], { env: process.env });
    let output = '';
    child.stdout.on('data', d => { output += d; });
    child.stderr.on('data', d => { output += d; });

    child.on('close', code => {
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
    return { ok: true, code: 200, status: { ...state } };
  };

  const stop = () => {
    state.running = false;
    if (timer) { clearTimeout(timer); timer = null; }
    persist();
    return { ok: true, code: 200, status: { ...state } };
  };

  const status = () => ({ ...state });

  const resume = () => {
    loadState();
    if (state.running && state.slug) {
      console.log(`Scraper: resuming previous session for "${state.slug}"`);
      runCycle();
    }
  };

  return { start, stop, status, resume };
};
