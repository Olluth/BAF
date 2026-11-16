'use strict';
/*
 * Pimp My Deck (pimp.html): sends the pasted / uploaded decklist to POST /api/pimp
 * (api/pimp.js) and shows, per card, every printing (image, set, foiling, art) and
 * every Cardmarket listing with its 7-day average price, plus deck totals.
 * The last decklist is kept in localStorage so a reload doesn't lose it.
 * Signed-in members can also save decklists in Supabase (table pimp_decks, see
 * vps-setup/supabase-pimp-decks.sql) and tick the cards they already own in a pimp version.
 */
(function () {
  const STORE_KEY = 'baf-pimp-decklist';
  const SUPABASE_URL = 'https://jpxmqrrmpeobrnrvvwsr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_fWVirSqQi5Zcm5mybNzbOg_SakIPpgl';
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
  let data = null;            // last /api/pimp response
  let user = null;            // signed-in Supabase user, or null
  let decks = [];             // the member's saved decks
  let currentDeck = null;     // saved deck being viewed (null = unsaved list)
  let owned = new Set();      // card keys ticked "I have the pimp version"

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
      // A Fabrary export starts with "Name: ...": use it as the default deck name
      const nameInput = $('pimp-deck-name');
      const exportName = decklist.match(/^name:\s*(.+)$/im);
      if (!nameInput.value.trim() && exportName) nameInput.value = exportName[1].trim().slice(0, 80);
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

    // Owned progress, for members: cards ticked, and what the unticked ones would cost in bling
    let ownedTile = null;
    if (user) {
      const have = cards.filter((c) => owned.has(c.key)).length;
      const left = cards.reduce((n, c) => n + (owned.has(c.key) || c.priciest == null ? 0 : c.priciest * c.qty), 0);
      ownedTile = tile(t('pimp.sum.owned'), `${have} / ${cards.length}`, t('pimp.sum.ownedLeft', { amount: money(left) }), 'pimp-tile-owned');
    }

    $('pimp-summary').replaceChildren(
      tile(t('pimp.sum.cards'), String(count), t('pimp.sum.distinct', { n: cards.length })),
      tile(t('pimp.sum.budget'), money(sum('cheapest')), t('pimp.sum.budgetSub')),
      tile(t('pimp.sum.bling'), money(sum('priciest')), t('pimp.sum.blingSub'), 'pimp-tile-bling'),
      ownedTile,
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
        el('a', { href: cmUrl(card.listings[0]?.name || card.name), target: '_blank', rel: 'noopener noreferrer' }, 'Cardmarket ↗'),
        user ? renderOwnedToggle(card) : null),
    );

    const versions = printings.length
      ? el('div', { class: 'pimp-versions' },
        el('h4', {}, t('pimp.versions', { n: printings.length })),
        el('div', { class: 'pimp-strip' }, printings.map((p) => renderPrinting(card, p))))
      : el('p', { class: 'pimp-muted' }, t('pimp.noVersions'));

    return el('article', { class: `pimp-card ${user && owned.has(card.key) ? 'pimp-card-owned' : ''}` },
      base?.image ? el('img', { class: 'pimp-card-thumb', src: base.image, alt: card.name, loading: 'lazy', width: 100, height: 140 }) : el('div', { class: 'pimp-card-thumb' }),
      el('div', { class: 'pimp-card-body' }, head, versions, renderListings(card)));
  };

  // "I have the pimp version" checkbox (members only). Saved with the deck if it is saved.
  const renderOwnedToggle = (card) => {
    const box = el('input', { type: 'checkbox', checked: owned.has(card.key) ? '' : null });
    box.addEventListener('change', () => {
      if (box.checked) owned.add(card.key); else owned.delete(card.key);
      box.closest('.pimp-card').classList.toggle('pimp-card-owned', box.checked);
      renderSummary();
      saveOwnedSoon();
    });
    return el('label', { class: 'pimp-owned' }, box, el('span', {}, t('pimp.owned')));
  };

  const renderPrinting = (card, p) => {
    const special = p.foilCode === 'C' || p.foilCode === 'G' || p.arts.length > 0;
    const caption = [p.setName, p.edition, p.foiling, ...p.arts].filter(Boolean).join(' · ');
    const tags = [p.foilCode !== 'S' ? p.foiling : null, ...p.arts].filter(Boolean);
    return el('button', {
      type: 'button',
      class: `pimp-version ${special ? 'pimp-version-special' : ''} pimp-foil-${p.foilCode}`,
      'aria-label': caption,
      'data-preview': p.image,
      'data-caption': `${p.id} · ${caption}`,
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
        'data-preview': p.image,
        'data-caption': `${p.id} · ${[p.setName, p.edition, label].filter(Boolean).join(' · ')}`,
        onclick: () => openLightbox(p.image, `${card.name} — ${p.id} · ${[p.setName, p.edition, label].filter(Boolean).join(' · ')}`),
      },
      p.image ? el('img', { src: p.image, alt: '', loading: 'lazy', width: 30, height: 42 }) : null,
      el('span', {}, el('strong', {}, p.id), ` ${label}`)));
  };

  /* ---- Saved decks (Supabase table pimp_decks, row level security: own rows only) ---- */

  const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
  const deckSelect = $('pimp-deck-select');
  const deckName = $('pimp-deck-name');
  const deckMsg = (key, vars, isError) => {
    const msg = $('pimp-deck-msg');
    msg.textContent = key ? t(key, vars) : '';
    msg.classList.toggle('pimp-deck-error', !!isError);
  };

  // Only the cards of the current result are kept, so removed cards don't linger.
  const ownedForSave = () => [...owned].filter((k) => !data || data.cards.some((c) => c.key === k));

  const fillDeckSelect = () => {
    const first = deckSelect.options[0];
    deckSelect.replaceChildren(first, ...decks.map((d) => el('option', { value: d.id }, d.name)));
    deckSelect.value = currentDeck ? currentDeck.id : '';
    $('pimp-deck-delete').classList.toggle('hidden', !currentDeck);
  };

  const loadDecks = async () => {
    const { data: rows, error } = await sb.from('pimp_decks')
      .select('id, name, decklist, owned, updated_at')
      .order('updated_at', { ascending: false });
    if (error) { deckMsg('pimp.decks.errLoad', {}, true); return; }
    decks = rows || [];
    if (currentDeck) currentDeck = decks.find((d) => d.id === currentDeck.id) || null;
    fillDeckSelect();
  };

  const setUser = async (u) => {
    const changed = (u?.id || null) !== (user?.id || null);
    user = u;
    $('pimp-decks').classList.toggle('hidden', !user);
    $('pimp-login-hint').classList.toggle('hidden', !!user);
    if (!changed) return;
    decks = [];
    currentDeck = null;
    owned = new Set();
    if (user) await loadDecks(); else fillDeckSelect();
    if (data) render(); // show / hide the checkboxes and the owned tile
  };

  // Picking a saved deck loads its list and ticks, then analyzes it.
  deckSelect.addEventListener('change', () => {
    currentDeck = decks.find((d) => d.id === deckSelect.value) || null;
    deckMsg('');
    $('pimp-deck-delete').classList.toggle('hidden', !currentDeck);
    if (!currentDeck) { owned = new Set(); deckName.value = ''; if (data) render(); return; }
    owned = new Set(Array.isArray(currentDeck.owned) ? currentDeck.owned : []);
    deckName.value = currentDeck.name;
    input.value = currentDeck.decklist;
    form.requestSubmit();
  });

  // Saves the current list: updates the selected deck, or creates a new one.
  $('pimp-deck-save').addEventListener('click', async () => {
    const decklist = input.value.trim();
    if (!decklist) { deckMsg('pimp.err.empty', {}, true); return; }
    const exportName = decklist.match(/^name:\s*(.+)$/im);
    const name = (deckName.value.trim() || exportName?.[1].trim() || t('pimp.decks.untitled')).slice(0, 80);
    deckName.value = name;
    const row = { name, decklist, owned: ownedForSave() };
    const btn = $('pimp-deck-save');
    btn.disabled = true;
    const query = currentDeck
      ? sb.from('pimp_decks').update(row).eq('id', currentDeck.id)
      : sb.from('pimp_decks').insert({ ...row, user_id: user.id });
    const { data: saved, error } = await query.select('id, name, decklist, owned, updated_at').single();
    btn.disabled = false;
    if (error) { deckMsg('pimp.decks.errSave', {}, true); return; }
    currentDeck = saved;
    await loadDecks();
    deckMsg('pimp.decks.saved', { name });
  });

  $('pimp-deck-delete').addEventListener('click', async () => {
    if (!currentDeck || !confirm(t('pimp.decks.confirmDelete', { name: currentDeck.name }))) return;
    const { error } = await sb.from('pimp_decks').delete().eq('id', currentDeck.id);
    if (error) { deckMsg('pimp.decks.errSave', {}, true); return; }
    const name = currentDeck.name;
    currentDeck = null;
    owned = new Set();
    deckName.value = '';
    await loadDecks();
    deckMsg('pimp.decks.deleted', { name });
    if (data) render();
  });

  // Ticks are saved by themselves on a saved deck (grouped, 0.8 s after the last click).
  let ownedTimer = null;
  const saveOwnedSoon = () => {
    if (!currentDeck) { deckMsg('pimp.decks.saveToKeep'); return; }
    clearTimeout(ownedTimer);
    ownedTimer = setTimeout(async () => {
      const list = ownedForSave();
      const { error } = await sb.from('pimp_decks').update({ owned: list }).eq('id', currentDeck.id);
      if (error) { deckMsg('pimp.decks.errSave', {}, true); return; }
      currentDeck.owned = list;
      deckMsg('pimp.decks.ownedSaved');
    }, 800);
  };

  if (sb) {
    sb.auth.getSession().then(({ data: s }) => setUser(s.session?.user || null));
    sb.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
  } else {
    $('pimp-login-hint').classList.remove('hidden');
  }

  /* ---- Hover preview (mouse only; touch keeps tap-to-enlarge) ----
     The image is loaded straight from the card image CDN, nothing is stored by the site. */

  const preview = el('div', { class: 'pimp-hover', 'aria-hidden': 'true' },
    el('img', { alt: '' }), el('span', {}));
  document.body.append(preview);
  const previewImg = preview.querySelector('img');
  const previewCap = preview.querySelector('span');
  let previewFor = null;

  // Next to the cursor, flipped left / up when it would leave the window.
  const placePreview = (x, y) => {
    const w = preview.offsetWidth;
    const h = preview.offsetHeight;
    const gap = 18;
    const left = x + gap + w > innerWidth ? Math.max(8, x - gap - w) : x + gap;
    const top = Math.min(Math.max(8, y - h / 2), innerHeight - h - 8);
    preview.style.transform = `translate(${left}px, ${top}px)`;
  };

  results.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const target = e.target.closest('[data-preview]');
    if (!target || target === previewFor) return;
    previewFor = target;
    previewImg.src = target.dataset.preview;
    previewCap.textContent = target.dataset.caption || '';
    preview.classList.add('show');
    placePreview(e.clientX, e.clientY);
  });
  results.addEventListener('pointermove', (e) => {
    if (previewFor) placePreview(e.clientX, e.clientY);
  });
  results.addEventListener('pointerout', (e) => {
    if (!previewFor || previewFor.contains(e.relatedTarget)) return;
    previewFor = null;
    preview.classList.remove('show');
  });
  // Hide while scrolling or when the lightbox opens
  const hidePreview = () => { previewFor = null; preview.classList.remove('show'); };
  addEventListener('scroll', hidePreview, { passive: true });
  results.addEventListener('click', hidePreview);

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
