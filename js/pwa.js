'use strict';
/*
 * Installable app (PWA): registers sw.js and drives the "Installer l'app" buttons
 * (#pwa-install-btn in the header menu, .pwa-install-btn in the admin).
 * Android / desktop Chrome: the button opens the browser's install prompt. iPhone Safari has no prompt, so the button shows the
 * "Share → Add to Home Screen" steps instead. Hidden once the app is installed.
 */
(() => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }

  const btns = [...document.querySelectorAll('#pwa-install-btn, .pwa-install-btn')];
  if (!btns.length) return;
  const show = (on) => btns.forEach((b) => b.classList.toggle('hidden', !on));

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (isStandalone) return;

  const tr = (key, fallback) => (typeof t === 'function' ? t(key) : fallback);
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  let deferredPrompt = null;

  // Chrome / Edge / Samsung Internet: keep the prompt for when the button is tapped.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    show(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    show(false);
  });

  if (isIos) show(true);

  btns.forEach((btn) => btn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => {});
      deferredPrompt = null;
      show(false);
      return;
    }
    if (isIos) alert(tr('pwa.iosHelp', "Pour installer l'app : touchez le bouton Partager, puis « Sur l'écran d'accueil »."));
  }));
})();
