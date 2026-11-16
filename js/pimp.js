'use strict';
/*
 * Pimp My Deck (pimp.html): sends the pasted / uploaded decklist to POST /api/pimp
 * (api/pimp.js) and shows, per card, every printing (image, set, foiling, art) and
 * every Cardmarket listing with its 7-day average price, plus deck totals.
 * The last decklist is kept in localStorage so a reload doesn't lose it.
 */
(function () {
  const STORE_KEY = 'baf-pimp-decklist';
  const EXAMPLE = [
    'Hero: Dorinthea Ironsong',
    'Weapons: Dawnblade',
    "Equipment: Fyendal's Spring Tunic, Nullrune Hood, Courage of Bladehold",
    '',
    '(3) Snatch (red)',
    '(3) Sink Below (red)',
    '(2) Enlightened Strike',
    '(1) Command and Conquer',
    '(3) Steelblade Supremacy',
    '(3) Ironsong Response (red)',
    "(3) Warrior's Valor (red)",
  ].join('\n');

  const $ = (id) => document.getElementById(id);
  const form = $('pimp-form');
  const input = $('pimp-input');
  const status = $('pimp-status');
  const output = $('pimp-output');
  const results = $('pimp-results');
  const sortSel = $('pimp-sort');
  let data = null;

  const lang = () => (window.getLang ? getLang() : 'fr');
  const money = (v) => (v == null ? '—' : new Intl.NumberFormat(lang() === 'fr' ? 'fr-FR' : 'en-GB', { style: 'currency', currency: 'EUR' }).format(v));

  // Element helper: el('a', { href, class: 'x' }, child, 'text', ...)
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of children.flat()) if (c != null && c !== false) node.append(c);
    return node;
  };

  // Cardmarket has no stable product URL in its open data: search the card, filtered on the expansion.
  const cmUrl = (name, idExpansion) => {
    const q = new URLSearchParams({ searchString: name });
    if (idExpansion) q.set('idExpansion', idExpansion);
    return `https://www.cardmarket.com/${lang() === 'fr' ? 'fr' : 'en'}/FleshAndBlood/Products/Search?${q}`;
  };

  const setStatus = (msg, isError) => {
    status.textContent = msg || '';
    status.classList.toggle('hidden', !msg);
    status.classList.toggle('pimp-status-error', !!isError);
  };

  try { input.value = localStorage.getItem(STORE_KEY) || ''; } catch {}

  /* ---- Input ---- */

  $('pimp-example').addEventListener('click', () => { input.value = EXAMPLE; input.focus(); });

  $('pimp-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 100000) { setStatus(t('pimp.err.tooLong'), true); return; }
    input.value = await file.text();
    e.target.value = '';
    form.requestSubmit();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const decklist = input.value.trim();
    if (!decklist) { setStatus(t('pimp.err.empty'), true); input.focus(); return; }
    try { localStorage.setItem(STORE_KEY, decklist); } catch {}

    const btn = $('pimp-submit');
    btn.disabled = true;
    setStatus(t('pimp.loading'));
    try {
      const res = await fetch('/api/pimp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decklist }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const key = `pimp.err.${body.error}`;
        const msg = t(key);
        setStatus(msg === key ? t('pimp.err.generic') : msg, true);
        return;
      }
      data = body;
      setStatus('');
      render();
      output.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      setStatus(t('pimp.err.generic'), true);
    } finally {
      btn.disabled = false;
    }
  });

  sortSel.addEventListener('change', () => data && renderCards());
  document.addEventListener('langchange', () => data && render());

  /* ---- Rendering ---- */

  const render = () => {
    output.classList.remove('hidden');
    renderSummary();
    renderProblems();
    renderCards();
  };

  const renderSummary = () => {
    const cards = data.cards;
    const count = cards.reduce((n, c) => n + c.qty, 0);
    const unpriced = cards.filter((c) => c.cheapest == null).length;
    const sum = (f) => cards.reduce((n, c) => n + (c[f] == null ? 0 : c[f] * c.qty), 0);
    const date = data.pricesDate ? new Date(data.pricesDate).toLocaleDateString(lang() === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    const tile = (label, value, sub, cls) => el('div', { class: `pimp-tile ${cls || ''}` },
      el('span', { class: 'pimp-tile-label' }, label),
      el('strong', { class: 'pimp-tile-value' }, value),
      sub ? el('span', { class: 'pimp-tile-sub' }, sub) : null);

    $('pimp-summary').replaceChildren(
      tile(t('pimp.sum.cards'), String(count), t('pimp.sum.distinct', { n: cards.length })),
      tile(t('pimp.sum.budget'), money(sum('cheapest')), t('pimp.sum.budgetSub')),
      tile(t('pimp.sum.bling'), money(sum('priciest')), t('pimp.sum.blingSub'), 'pimp-tile-bling'),
      tile(t('pimp.sum.date'), date, unpriced ? t('pimp.sum.unpriced', { n: unpriced }) : t('pimp.sum.avg7')),
    );
  };

  const renderProblems = () => {
    const box = $('pimp-problems');
    const list = data.problems || [];
    box.classList.toggle('hidden', !list.length);
    if (!list.length) return box.replaceChildren();
    box.replaceChildren(
      el('strong', {}, t('pimp.problems.title', { n: list.length })),
      el('ul', {}, list.map((p) => el('li', {},
        el('code', {}, p.line), ' — ',
        p.reason === 'ambiguous' ? t('pimp.problems.ambiguous', { options: p.options.join(' / ') })
          : p.reason === 'pitch' ? t('pimp.problems.pitch')
          : t('pimp.problems.unknown')))),
    );
  };

  const SORTS = {
    deck: () => 0,
    bling: (a, b) => (b.priciest ?? -1) - (a.priciest ?? -1),
    cheap: (a, b) => (b.cheapest ?? -1) - (a.cheapest ?? -1),
    versions: (a, b) => b.printings.length - a.printings.length,
  };

  const renderCards = () => {
    const cards = data.cards.slice().sort(SORTS[sortSel.value] || SORTS.deck);
    results.replaceChildren(...cards.map(renderCard));
    if (!cards.length) results.replaceChildren(el('p', { class: 'tracker-empty' }, t('pimp.noCards')));
  };

  // Rarer finishes first so the bling is what you see: gold > cold > alt arts > rainbow > plain.
  const blingScore = (p) => ({ G: 40, C: 30, R: 10, S: 0 }[p.foilCode] || 0) + p.arts.length * 12;

  const pitchLabel = (p) => ({ 1: t('pimp.pitch.red'), 2: t('pimp.pitch.yellow'), 3: t('pimp.pitch.blue') }[p]);

  const renderCard = (card) => {
    const printings = card.printings.slice().sort((a, b) => blingScore(b) - blingScore(a));
    const base = card.printings.find((p) => p.image && p.foilCode === 'S' && !p.arts.length) || card.printings.find((p) => p.image);

    const head = el('div', { class: 'pimp-card-head' },
      el('span', { class: 'pimp-qty' }, `${card.qty}×`),
      card.pitch ? el('span', { class: `pimp-pitch pimp-pitch-${card.pitch}`, title: pitchLabel(card.pitch), 'aria-label': pitchLabel(card.pitch) }) : null,
      el('h3', {}, card.name),
      el('span', { class: 'pimp-price-range' },
        card.cheapest == null ? t('pimp.noPrice')
          : card.cheapest === card.priciest ? money(card.cheapest)
          : `${money(card.cheapest)} → ${money(card.priciest)}`),
      el('div', { class: 'pimp-links' },
        el('a', { href: card.fabrary, target: '_blank', rel: 'noopener noreferrer' }, 'Fabrary ↗'),
        el('a', { href: cmUrl(card.listings[0]?.name || card.name), target: '_blank', rel: 'noopener noreferrer' }, 'Cardmarket ↗')),
    );

    const versions = el('div', { class: 'pimp-versions' },
      el('h4', {}, t('pimp.versions', { n: printings.length })),
      el('div', { class: 'pimp-strip' }, printings.map((p) => renderPrinting(card, p))));

    return el('article', { class: 'pimp-card' },
      base?.image ? el('img', { class: 'pimp-card-thumb', src: base.image, alt: card.name, loading: 'lazy', width: 100, height: 140 }) : el('div', { class: 'pimp-card-thumb' }),
      el('div', { class: 'pimp-card-body' }, head, versions, renderListings(card)));
  };

  const renderPrinting = (card, p) => {
    const special = p.foilCode === 'C' || p.foilCode === 'G' || p.arts.length > 0;
    const caption = [p.setName, p.edition, p.foiling, ...p.arts].filter(Boolean).join(' · ');
    const tags = [p.foilCode !== 'S' ? p.foiling : null, ...p.arts].filter(Boolean);
    return el('button', {
      type: 'button',
      class: `pimp-version ${special ? 'pimp-version-special' : ''} pimp-foil-${p.foilCode}`,
      title: caption,
      onclick: () => openLightbox(p.image, `${card.name} — ${p.id} · ${caption}`),
      disabled: !p.image,
    },
    p.image ? el('img', { src: p.image, alt: caption, loading: 'lazy', width: 72, height: 100 }) : el('span', { class: 'pimp-version-noimg' }, '?'),
    el('span', { class: 'pimp-version-set' }, `${p.set}${p.edition ? ' ' + p.edition.replace('1st Edition', '1st') : ''}`),
    tags.length ? el('span', { class: 'pimp-version-tags' }, tags.map((x) => el('span', {}, x))) : null);
  };

  const renderListings = (card) => {
    if (!card.listings.length) return el('p', { class: 'pimp-muted' }, t('pimp.noListing'));
    // One group per expansion, cheapest first (by its cheapest listing), unpriced last
    const byExp = new Map();
    for (const l of card.listings) {
      if (!byExp.has(l.idExpansion)) byExp.set(l.idExpansion, []);
      byExp.get(l.idExpansion).push(l);
    }
    const minAvg = (ls) => Math.min(...ls.map((l) => l.avg7 ?? Infinity));
    const groups = [...byExp.values()].sort((a, b) => minAvg(a) - minAvg(b));

    const priceCells = (l) => [
      el('td', { class: 'num pimp-avg7' }, money(l.avg7)),
      el('td', { class: 'num pimp-col-extra' }, money(l.trend)),
      el('td', { class: 'num pimp-col-extra' }, money(l.avg30)),
    ];
    const expLink = (l) => el('a', { href: cmUrl(l.name, l.idExpansion), target: '_blank', rel: 'noopener noreferrer' },
      l.expansion || t('pimp.otherExpansion'));

    const table = el('table', { class: 'pimp-table' },
      el('thead', {}, el('tr', {},
        el('th', {}, t('pimp.col.expansion')),
        el('th', { class: 'num' }, t('pimp.col.avg7')),
        el('th', { class: 'num pimp-col-extra' }, t('pimp.col.trend')),
        el('th', { class: 'num pimp-col-extra' }, t('pimp.col.avg30')))),
      groups.map((ls) => {
        if (ls.length === 1) return el('tbody', {}, el('tr', {}, el('td', {}, expLink(ls[0])), priceCells(ls[0])));
        // Several Cardmarket products in one set: their V.1/V.2 rows, then the versions
        // printed in that set, so you can tell what each one may be.
        const first = ls[0];
        const inSet = first.set
          ? card.printings.filter((p) => p.set === first.set && (!first.edition || p.editionCode === first.edition))
          : [];
        return el('tbody', { class: 'pimp-group' },
          el('tr', { class: 'pimp-group-head' }, el('td', { colspan: 4 }, expLink(first),
            el('span', { class: 'pimp-group-count' }, t('pimp.group.count', { n: ls.length })))),
          ls.map((l) => el('tr', { class: 'pimp-group-row' },
            el('td', {}, el('span', { class: 'pimp-v' }, l.version)), priceCells(l))),
          el('tr', { class: 'pimp-group-versions' }, el('td', { colspan: 4 },
            inSet.length
              ? el('div', {},
                el('span', { class: 'pimp-group-label' }, t('pimp.group.inSet')),
                el('ul', { class: 'pimp-setversions' }, inSet.map((p) => renderSetVersion(card, p))))
              : el('span', { class: 'pimp-muted' }, t('pimp.group.unknown')))));
      }));

    return el('details', { class: 'pimp-listings', open: groups.length <= 6 ? '' : null },
      el('summary', {}, t('pimp.listings', { n: card.listings.length })),
      el('div', { class: 'pimp-table-wrap' }, table),
      groups.some((g) => g.length > 1) ? el('p', { class: 'pimp-muted pimp-v-hint' }, t('pimp.versionHint')) : null);
  };

  // One line of a set's version list: small image (opens the lightbox) + finish / art labels.
  const renderSetVersion = (card, p) => {
    const label = [p.foiling, ...p.arts].join(' · ');
    const special = p.foilCode === 'C' || p.foilCode === 'G' || p.arts.length > 0;
    return el('li', { class: special ? 'pimp-setversion-special' : null },
      el('button', {
        type: 'button',
        class: 'pimp-setversion',
        disabled: !p.image,
        onclick: () => openLightbox(p.image, `${card.name} — ${p.id} · ${[p.setName, p.edition, label].filter(Boolean).join(' · ')}`),
      },
      p.image ? el('img', { src: p.image, alt: '', loading: 'lazy', width: 30, height: 42 }) : null,
      el('span', {}, el('strong', {}, p.id), ` ${label}`)));
  };

  /* ---- Lightbox ---- */

  const lightbox = $('pimp-lightbox');
  const openLightbox = (src, caption) => {
    if (!src) return;
    $('pimp-lightbox-img').src = src;
    $('pimp-lightbox-img').alt = caption;
    $('pimp-lightbox-caption').textContent = caption;
    if (lightbox.showModal) lightbox.showModal(); else window.open(src, '_blank', 'noopener');
  };
  // Click on the backdrop closes it
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });
})();
