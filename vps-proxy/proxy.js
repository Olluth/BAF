'use strict';
const http       = require('http');
const { URL }    = require('url');
const puppeteer  = require('puppeteer');

const PORT         = process.env.PORT || 3000;
const ALLOWED_HOST = 'fabtcg.com';
const PAGE_TIMEOUT = 20000;

let browser = null;

const getBrowser = async () => {
  if (browser && browser.isConnected()) return browser;
  browser = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.CHROMIUM_PATH ||
      '/opt/fabtcg-proxy/.cache/chrome/linux-148.0.7778.97/chrome-linux64/chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
  return browser;
};

// Warm up at startup
getBrowser().catch(err => console.error('Browser launch failed:', err.message));

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  let target;
  try {
    const qs = new URL(req.url, 'http://localhost').searchParams;
    target = decodeURIComponent(qs.get('url') || '');
    const t = new URL(target);
    if (t.hostname !== ALLOWED_HOST) throw new Error('disallowed');
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad request: missing or disallowed URL');
    return;
  }

  let page;
  try {
    const b = await getBrowser();
    page = await b.newPage();

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    await page.goto(target, { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT });
    const html = await page.content();

    res.writeHead(200, {
      'Content-Type':                'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(html);

  } catch (err) {
    console.error('Page fetch error:', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Upstream error: ' + err.message);
  } finally {
    if (page) page.close().catch(() => {});
  }

}).listen(PORT, '127.0.0.1', () => {
  console.log(`fabtcg proxy (puppeteer) listening on 127.0.0.1:${PORT}`);
});
