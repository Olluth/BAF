'use strict';
/*
 * Page-view analytics beacon. Sends the current path and referrer to
 * POST /api/track (stored in api/data/analytics.db, shown in the admin Analytics tab).
 * Obvious bots are skipped; sendBeacon is used so the hit survives page navigation.
 */
(function () {
  if (/bot|crawler|spider|headless|python|curl|wget/i.test(navigator.userAgent)) return;
  const page    = location.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';
  const payload = JSON.stringify({ page, referrer: document.referrer || '' });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    }
  } catch (_) {}
})();
