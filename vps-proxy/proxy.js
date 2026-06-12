'use strict';
const http  = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;

// Only proxy fabtcg.com — rejects any other target for safety
const ALLOWED_HOST = 'fabtcg.com';

http.createServer((req, res) => {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  let target;
  try {
    const qs = new URL(req.url, 'http://localhost').searchParams;
    target = decodeURIComponent(qs.get('url') || '');
    const t = new URL(target);
    if (t.hostname !== ALLOWED_HOST) throw new Error('disallowed host');
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad request: missing or disallowed URL');
    return;
  }

  const parsed = new URL(target);
  const opts = {
    hostname: parsed.hostname,
    path:     parsed.pathname + parsed.search,
    headers: {
      'Host':            parsed.hostname,
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Referer':         'https://www.google.com/',
    },
  };

  https.get(opts, upstream => {
    res.writeHead(upstream.statusCode, {
      'Content-Type':                upstream.headers['content-type'] || 'text/html',
      'Access-Control-Allow-Origin': '*',
    });
    upstream.pipe(res);
  }).on('error', err => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Upstream error: ' + err.message);
  });

}).listen(PORT, '127.0.0.1', () => {
  console.log(`fabtcg proxy listening on 127.0.0.1:${PORT}`);
});
