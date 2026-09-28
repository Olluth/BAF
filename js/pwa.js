'use strict';
/*
 * Installable apps (PWA): registers sw.js and drives the "Installer l'app" buttons
 * (#pwa-install-btn in the header menu, .pwa-install-btn in the admin).
 * Two apps share the site: "La BAF" (manifest.json) and "BAF Admin" (manifest-admin.json,
 * admin.html only). Android / desktop Chrome: the button opens the browser's install
 * prompt when Chrome offers one. Otherwise it explains how to install by hand (iPhone
 * Share menu, Chrome menu, or "open this in the browser" when inside the other app).
 * Public pages only show the button when installing is possible; the admin always shows it.
 */
(() => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }

  const btns = [...document.querySelectorAll('#pwa-install-btn, .pwa-install-btn')];
  if (!btns.length) return;
  const show = (on) => btns.forEach((b) => b.classList.toggle('hidden', !on));

  const isAdminPage = (document.querySelector('link[rel="manifest"]')?.getAttribute('href') || '').includes('admin');
  const pageApp = isAdminPage ? 'admin' : 'main';

  // Which app is this window? Each app is launched with ?source=pwa on its own start page,
  // and the tab remembers it while navigating (e.g. La BAF app → admin.html).
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let runningApp = null;
  try {
    if (new URLSearchParams(location.search).get('source') === 'pwa') sessionStorage.setItem('baf-pwa-app', pageApp);
    if (isStandalone) runningApp = sessionStorage.getItem('baf-pwa-app') || pageApp;
  } catch {
    if (isStandalone) runningApp = pageApp;
  }
  if (runningApp === pageApp) return; // already inside this app

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

  if (isIos || isAdminPage) show(true);

  btns.forEach((btn) => btn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => {});
      deferredPrompt = null;
      show(false);
      return;
    }
    if (runningApp) {
      alert("Tu es dans l'app La BAF : ouvre bafbordeaux.fr/admin.html dans ton navigateur (Chrome ou Safari), puis touche « Installer l'app admin » depuis là.");
    } else if (isIos) {
      alert(tr('pwa.iosHelp', "Pour installer l'app : touchez le bouton Partager, puis « Sur l'écran d'accueil »."));
    } else {
      alert("Pour installer l'app : ouvre le menu du navigateur (⋮ en haut à droite dans Chrome), puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».");
    }
  }));
})();
