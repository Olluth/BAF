@echo off
rem Home PC relay for BAF live tracking (see live-agent.js). Keep this window open.
title Relais BAF - Suivi live
cd /d "%~dp0"
if not exist node_modules\puppeteer (
  echo Installation des dependances, une seule fois...
  set PUPPETEER_SKIP_DOWNLOAD=1
  call npm install --no-audit --no-fund
)
node live-agent.js
pause
