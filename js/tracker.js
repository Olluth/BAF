'use strict';
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
