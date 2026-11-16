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
      completeFromVault(body);
    } catch {
      setStatus(t('pimp.err.generic'), true);
    } finally {
      btn.disabled = false;
    }
  });

  sortSel.addEventListener('change', () => data && renderCards());
  document.addEventListener('langchange', () => data && render());

  /* ---- Official card vault from the browser ----
     When the server couldn't give a card's printings from the official vault (old API
     running, vault unreachable from the VPS), the page asks the vault itself: its API
     allows any website. Same mapping as api/pimp.js (vaultPrintings). Images are
     displayed from the official image server, nothing is stored. */

  const VAULT = 'https://api.cardvault.fabtcg.com/carddb/api/v1';
  const FIRST_EDITION = { WTR: 'A', ARC: 'F', CRU: 'F', MON: 'F', ELE: 'F', EVR: 'F' };
  const EDITION_NAMES = { A: 'Alpha', F: '1st Edition', U: 'Unlimited' };
  const FINISHES = { regular: ['S', 'Standard'], 'rainbow-foil': ['R', 'Rainbow Foil'], 'cold-foil': ['C', 'Cold Foil'], 'gold-foil': ['G', 'Gold Cold Foil'] };
  const ART_TYPES = { 'extended-art': 'Extended Art', 'full-art': 'Full Art', 'alternate-art': 'Alternate Art' };
  const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const mapVaultPrint = (p) => {
    const face = p.faces?.[0] || {};
    const set = p.print_set?.set_code || '';
    const [foilCode, foiling] = FINISHES[face.finish_type] || FINISHES.regular;
    const editionCode = /^([A-Z]{2}_)?[UR]-/.test(p.print_id) ? 'U' : (FIRST_EDITION[set] || 'N');
    return {
      id: p.print_id, set, setName: p.print_set?.set_name || set,
      group: p.product?.product_group?.group_name || p.product?.product_name || '',
      edition: EDITION_NAMES[editionCode] || '', editionCode, foiling, foilCode,
      artType: face.art_type || 'regular', arts: [], rarity: p.rarity, marvel: /marvel/.test(p.rarity || ''),
      image: face.image?.normal || face.image?.large || null,
      imageLarge: face.image?.large || face.image?.normal || null,
      release: p.product?.release_date || p.product?.product_group?.release_date || null,
    };
  };

  const vaultPrintings = (json) => {
    const all = (json?.results?.[0]?.card_prints || []).filter((p) => p.is_published !== false);
    const enSets = new Set(all.filter((p) => p.print_language === 'en').map((p) => p.print_set?.set_code));
    const langRank = (p) => (p.print_language === 'en' ? 0 : p.print_language === 'fr' ? 1 : 2);
    const prints = all
      .filter((p) => p.print_language === 'en' || !enSets.has(p.print_set?.set_code))
      .sort((a, b) => langRank(a) - langRank(b) || /^R-/.test(a.print_id) - /^R-/.test(b.print_id))
      .map(mapVaultPrint);
    const artTypes = new Set(prints.map((p) => p.artType));
    const seen = new Set();
    const out = [];
    for (const p of prints) {
      if (artTypes.size > 1 && p.artType !== 'regular') p.arts = [ART_TYPES[p.artType] || p.artType];
      delete p.artType;
      const key = `${p.set}|${p.editionCode}|${p.foilCode}|${p.marvel}|${p.arts.join('+')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  };

  const vaultGet = async (q) => { const r = await fetch(`${VAULT}/${q}`); if (!r.ok) throw new Error(r.status); return r.json(); };
  const fetchVaultPrintings = async (name, pitch) => {
    let json = await vaultGet(`card_id/${slug(name)}${pitch ? `-${pitch}` : ''}/`);
    if (!json.results?.length) {
      const found = await vaultGet(`advanced-search/?q=${encodeURIComponent(name)}`);
      const hit = (found.results || []).find((r) => slug(r.printed_name) === slug(name) && (!pitch || Number(r.printed_pitch) === pitch));
      json = hit ? await vaultGet(`card_id/${encodeURIComponent(hit.card_id)}/`) : null;
    }
    return json ? vaultPrintings(json) : [];
  };

  // Fills in, 4 cards at a time, the printings the server didn't get from the vault,
  // then redraws. `result` is the response being shown (ignored if another one replaced it).
  const completeFromVault = async (result) => {
    const todo = result.cards.filter((c) => c.printingsSource !== 'vault');
    if (!todo.length) return;
    let i = 0;
    const worker = async () => {
      while (i < todo.length) {
        const card = todo[i++];
        try {
          const prints = await fetchVaultPrintings(card.name, card.pitch);
          if (prints.length) { card.printings = prints; card.printingsSource = 'vault'; delete card._versions; }
        } catch { /* keep the server's printings */ }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, todo.length) }, worker));
    result._vaultTried = true;
    if (data === result) render();
  };

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
      const have = cards.filter(isOwned).length;
      const left = cards.reduce((n, c) => n + (isOwned(c) || c.priciest == null ? 0 : c.priciest * c.qty), 0);
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
    versions: (a, b) => cmVersions(b).length - cmVersions(a).length,
  };

  const renderCards = () => {
    const cards = data.cards.slice().sort(SORTS[sortSel.value] || SORTS.deck);
    results.replaceChildren(...cards.map(renderCard));
    if (!cards.length) results.replaceChildren(el('p', { class: 'tracker-empty' }, t('pimp.noCards')));
  };

  // Marvels first, then rarer finishes: gold > cold > alt arts > rainbow > plain.
  const blingScore = (p) => (p.marvel ? 100 : 0) + ({ G: 40, C: 30, R: 10, S: 0 }[p.foilCode] || 0) + p.arts.length * 12;
  const isSpecial = (p) => p.marvel || p.foilCode === 'C' || p.foilCode === 'G' || p.arts.length > 0;
  // Finish / art labels of a version, Marvel first
  const versionTags = (p) => [p.marvel ? 'Marvel' : null, p.foilCode !== 'S' ? p.foiling : null, ...p.arts].filter(Boolean);

  const pitchLabel = (p) => ({ 1: t('pimp.pitch.red'), 2: t('pimp.pitch.yellow'), 3: t('pimp.pitch.blue') }[p]);

  // The versions shown are the ones sold on Cardmarket: one per Cardmarket product, each
  // paired with a printing of its set for the image and finish. Cardmarket doesn't say
  // which of its products in a set is the foil / Marvel..., so:
  //  - as many products as printings: paired by price, priciest = rarest (guessed when > 1);
  //  - otherwise (new promo not in the card database yet, promos grouped differently...):
  //    no pairing, the tile says the version is unidentified rather than show a wrong image.
  const CM_IMPORT_DAY = '2022-01-07'; // Cardmarket's Flesh and Blood products before this all show its import date
  const day = (d) => (d ? String(d).slice(0, 10) : '');
  const plusDays = (d, n) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);

  // Pairs a set's Cardmarket products with its prints (same count). Dates split them into
  // periods: a print released after Cardmarket's import is its own period; a product goes
  // to the latest print released at most 45 days after it was listed (Cardmarket lists
  // ahead of release). Within a period, priciest product = rarest print. If the periods
  // don't hold the same number on both sides, price alone decides over the whole set.
  const pairByPrice = (prints, products) => {
    const p = prints.slice().sort((a, b) => blingScore(b) - blingScore(a));
    return products.slice().sort((a, b) => (b.avg7 ?? -1) - (a.avg7 ?? -1)).map((l, i) => [l, p[i]]);
  };
  const pairByPeriod = (prints, products) => {
    const printPeriod = (p) => (day(p.release) > CM_IMPORT_DAY ? day(p.release) : '0');
    const periods = [...new Set(prints.map(printPeriod))].sort();
    const productPeriod = (l) => {
      if (!(day(l.added) > CM_IMPORT_DAY)) return '0';
      const limit = plusDays(day(l.added), 45);
      return periods.filter((d) => d <= limit).pop() || periods[0];
    };
    const pairs = [];
    for (const period of periods) {
      const ps = prints.filter((p) => printPeriod(p) === period);
      const ls = products.filter((l) => productPeriod(l) === period);
      if (ps.length !== ls.length) return pairByPrice(prints, products);
      pairs.push(...pairByPrice(ps, ls));
    }
    return pairs.length === products.length ? pairs : pairByPrice(prints, products);
  };

  const cmVersions = (card) => {
    if (card._versions) return card._versions;
    const byExp = new Map();
    for (const l of card.listings) {
      if (!byExp.has(l.idExpansion)) byExp.set(l.idExpansion, []);
      byExp.get(l.idExpansion).push(l);
    }
    const simple = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const out = [];
    for (const ls of byExp.values()) {
      const first = ls[0];
      // Prints of this Cardmarket expansion: same set code (+ edition), else same name
      // ("Usurp the Shadow Throne" on both sides for a set the open database lacks).
      let inSet = first.set
        ? card.printings.filter((p) => p.set === first.set && (!first.edition || p.editionCode === first.edition))
        : [];
      if (!inSet.length && first.expansion) {
        const exp = simple(first.expansion);
        inSet = card.printings.filter((p) => simple(p.group) === exp || simple(p.setName) === exp);
      }
      if (inSet.length !== ls.length) {
        ls.forEach((l) => out.push({ listing: l, printing: null, guessed: false }));
        continue;
      }
      const guessed = ls.length > 1;
      pairByPeriod(inSet, ls).forEach(([l, p]) => out.push({ listing: l, printing: p, guessed }));
    }
    // Bling first, then price
    out.sort((a, b) => (b.printing ? blingScore(b.printing) : -1) - (a.printing ? blingScore(a.printing) : -1)
      || (b.listing.avg7 ?? -1) - (a.listing.avg7 ?? -1));
    card._versions = out;
    return out;
  };

  // Cards opened by the user, kept across re-renders (sort, language, ticks)
  const expanded = new Set();

  // One line per card (qty, name, versions / alts on Cardmarket, price range, owned tick);
  // clicking it opens the versions and prices underneath. The detail is built on first open.
  const renderCard = (card) => {
    const base = card.printings.find((p) => p.image && p.foilCode === 'S' && !p.arts.length && !p.marvel) || card.printings.find((p) => p.image);
    const versions = cmVersions(card);
    const alts = versions.filter((v) => v.printing && isSpecial(v.printing)).length;
    const marvel = versions.some((v) => v.printing?.marvel);
    const isOpen = expanded.has(card.key);

    const body = el('div', { class: 'pimp-card-body', hidden: isOpen ? null : '' });
    const fillBody = () => { if (!body.childElementCount) body.append(...renderCardDetail(card)); };
    if (isOpen) fillBody();

    const toggle = el('button', { type: 'button', class: 'pimp-row-toggle', 'aria-expanded': String(isOpen) },
      base?.image
        ? el('img', { class: 'pimp-row-thumb', src: base.image, alt: '', loading: 'lazy', width: 36, height: 50, 'data-preview': base.image, 'data-caption': card.name })
        : el('span', { class: 'pimp-row-thumb' }),
      el('span', { class: 'pimp-qty' }, `${card.qty}×`),
      card.pitch ? el('span', { class: `pimp-pitch pimp-pitch-${card.pitch}`, title: pitchLabel(card.pitch), 'aria-label': pitchLabel(card.pitch) }) : null,
      el('span', { class: 'pimp-row-main' },
        el('span', { class: 'pimp-row-name' }, card.name),
        el('span', { class: 'pimp-row-meta' },
          versions.length ? t('pimp.row.versions', { n: versions.length }) : t('pimp.row.notOnCm'),
          alts ? el('span', { class: 'pimp-row-alts' }, t('pimp.row.alts', { n: alts })) : null,
          marvel ? el('span', { class: 'pimp-row-marvel' }, 'Marvel') : null)),
      el('span', { class: 'pimp-price-range' },
        card.cheapest == null ? t('pimp.noPrice')
          : card.cheapest === card.priciest ? money(card.cheapest)
          : `${money(card.cheapest)} → ${money(card.priciest)}`),
      el('span', { class: 'pimp-chevron', 'aria-hidden': 'true' }, '▾'));

    toggle.addEventListener('click', () => {
      const open = body.hidden;
      body.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) { expanded.add(card.key); fillBody(); } else expanded.delete(card.key);
    });

    return el('article', { class: `pimp-card ${user && isOwned(card) ? 'pimp-card-owned' : ''}` },
      el('div', { class: 'pimp-row' }, toggle, user ? ownedBadge(card) : null),
      body);
  };

  // Opened card: links, the Cardmarket versions as tiles, then the price detail table.
  const renderCardDetail = (card) => {
    const versions = cmVersions(card);
    return [
      el('div', { class: 'pimp-links' },
        el('a', { href: card.fabrary, target: '_blank', rel: 'noopener noreferrer' }, 'Fabrary ↗'),
        el('a', { href: cmUrl(card.listings[0]?.name || card.name), target: '_blank', rel: 'noopener noreferrer' }, 'Cardmarket ↗')),
      versions.length
        ? el('div', { class: 'pimp-versions' },
          el('h4', {}, t('pimp.versions', { n: versions.length })),
          el('div', { class: 'pimp-strip' }, versions.map((v) => renderCmVersion(card, v))),
          versions.some((v) => v.guessed && v.printing) ? el('p', { class: 'pimp-muted' }, t('pimp.guessHint')) : null,
          card.printingsSource !== 'vault' && data._vaultTried ? el('p', { class: 'pimp-muted pimp-deck-error' }, t('pimp.noVault')) : null,
          !card.printings.length ? el('p', { class: 'pimp-muted' }, t('pimp.noVersions')) : null)
        : el('p', { class: 'pimp-muted' }, t('pimp.noListing')),
      versions.length ? renderListings(card) : null,
    ];
  };

  // Open / close every card at once (toolbar buttons)
  const setAllExpanded = (open) => {
    if (!data) return;
    expanded.clear();
    if (open) data.cards.forEach((c) => expanded.add(c.key));
    renderCards();
  };
  $('pimp-expand-all').addEventListener('click', () => setAllExpanded(true));
  $('pimp-collapse-all').addEventListener('click', () => setAllExpanded(false));

  /* Owned versions (members): one tick per Cardmarket version, key "cardKey#idProduct".
     Decks saved before kept the bare card key: that still counts as "card owned". */
  const versionKey = (card, l) => `${card.key}#${l.idProduct}`;
  const ownedVersions = (card) => cmVersions(card).filter((v) => owned.has(versionKey(card, v.listing)));
  const isOwned = (card) => owned.has(card.key) || ownedVersions(card).length > 0;

  // Row badge: "✓ Marvel · Cold Foil" for the version(s) owned (empty placeholder otherwise)
  const ownedBadge = (card) => {
    const mine = ownedVersions(card);
    if (!mine.length && !owned.has(card.key)) return el('span', { class: 'pimp-row-owned' });
    const names = mine.map(versionLabel).join(', ') || t('pimp.owned');
    return el('span', { class: 'pimp-row-owned is-owned', title: names }, `✓ ${names}`);
  };

  // After a tick: row badge, card highlight, summary, autosave
  const ownedChanged = (card, article) => {
    article.classList.toggle('pimp-card-owned', isOwned(card));
    article.querySelector('.pimp-row-owned')?.replaceWith(ownedBadge(card));
    renderSummary();
    saveOwnedSoon();
  };

  // Name of a version: "Marvel · Cold Foil", "Rainbow Foil", "Standard"; "Version non identifiée"
  // when it couldn't be matched to a print. Cardmarket's V.1 / V.2 numbers are not shown.
  const versionLabel = (v) => (v.printing
    ? (versionTags(v.printing).join(' · ') || t('pimp.standard'))
    : t('pimp.unknownVersion'));

  // One Cardmarket version: image (hover preview, click to enlarge), 7-day price, set, finish.
  const renderCmVersion = (card, v) => {
    const { listing: l, printing: p } = v;
    const where = l.expansion || t('pimp.otherExpansion');
    const tags = p ? versionTags(p) : [];
    const caption = [where, p?.id, versionLabel(v)].filter(Boolean).join(' · ') + (v.guessed && p ? ' (≈)' : '');
    const setLabel = p ? `${p.set}${p.edition ? ' ' + p.edition.replace('1st Edition', '1st') : ''}` : where;
    // Not identified: the card's regular art, dimmed, no preview; the tile opens Cardmarket,
    // where the listing's own photo shows which version it is.
    const image = p?.image || card.printings.find((x) => x.image && x.foilCode === 'S' && !x.arts.length && !x.marvel)?.image || null;
    const tile = el('button', {
      type: 'button',
      class: `pimp-version ${p && isSpecial(p) ? 'pimp-version-special' : ''} ${p?.marvel ? 'pimp-version-marvel' : ''} ${p ? `pimp-foil-${p.foilCode}` : 'pimp-version-fallback'}`,
      'aria-label': caption,
      'data-preview': p?.image || null,
      'data-caption': caption,
      title: p ? null : t('pimp.unknownTitle'),
      onclick: () => (p?.image
        ? openLightbox(p.imageLarge || p.image, `${card.name} — ${caption}`)
        : window.open(cmUrl(l.name, l.idExpansion), '_blank', 'noopener')),
    },
    image ? el('img', { src: image, alt: '', loading: 'lazy', width: 72, height: 100 }) : el('span', { class: 'pimp-version-noimg' }, '?'),
    el('span', { class: 'pimp-version-price' }, money(l.avg7)),
    el('span', { class: 'pimp-version-set', title: where }, setLabel),
    // Version name on every tile: finish / art tags, "Standard" for a plain print
    el('span', { class: 'pimp-version-tags', title: v.guessed && p ? t('pimp.guessTitle') : null },
      (tags.length ? tags : [versionLabel(v)]).map((x, i) => el('span', {
        class: x === 'Marvel' ? 'pimp-tag-marvel' : (!tags.length ? 'pimp-tag-plain' : null),
      }, i === 0 && v.guessed && p ? `≈ ${x}` : x))));
    if (!user) return tile;

    // Members: "I have it" tick under the tile
    const key = versionKey(card, l);
    const box = el('input', { type: 'checkbox', checked: owned.has(key) ? '' : null, 'aria-label': t('pimp.ownVersion', { name: `${where} · ${versionLabel(v)}` }) });
    const wrap = el('div', { class: `pimp-version-wrap ${owned.has(key) ? 'is-owned' : ''}` },
      tile,
      el('label', { class: 'pimp-version-own', title: t('pimp.ownVersionTitle') }, box, el('span', {}, t('pimp.ownShort'))));
    box.addEventListener('change', () => {
      if (box.checked) owned.add(key); else owned.delete(key);
      owned.delete(card.key); // an old card-level tick gives way to per-version ticks
      wrap.classList.toggle('is-owned', box.checked);
      ownedChanged(card, wrap.closest('.pimp-card'));
    });
    return wrap;
  };

  // Price detail (collapsed): every Cardmarket product with 7-day avg, trend and 30-day avg.
  const renderListings = (card) => {
    const versions = cmVersions(card);
    const byExp = new Map();
    for (const v of versions) {
      if (!byExp.has(v.listing.idExpansion)) byExp.set(v.listing.idExpansion, []);
      byExp.get(v.listing.idExpansion).push(v);
    }
    const minAvg = (vs) => Math.min(...vs.map((v) => v.listing.avg7 ?? Infinity));
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
      groups.map((vs) => {
        // One product in the set: expansion + its finish on one row
        if (vs.length === 1) {
          return el('tbody', {}, el('tr', {},
            el('td', {}, expLink(vs[0].listing), el('span', { class: 'pimp-v' }, versionLabel(vs[0]))),
            priceCells(vs[0].listing)));
        }
        // Several products in one set: one row each, named by its (deduced, ≈) finish, rarest first
        const sorted = vs.slice().sort((a, b) => (b.printing ? blingScore(b.printing) : -1) - (a.printing ? blingScore(a.printing) : -1));
        return el('tbody', { class: 'pimp-group' },
          el('tr', { class: 'pimp-group-head' }, el('td', { colspan: 4 }, expLink(vs[0].listing),
            el('span', { class: 'pimp-group-count' }, t('pimp.group.count', { n: vs.length })))),
          sorted.map((v) => el('tr', { class: 'pimp-group-row' },
            el('td', {}, el('span', { class: `pimp-v ${v.printing?.marvel ? 'pimp-tag-marvel' : ''}` },
              (v.guessed && v.printing ? '≈ ' : '') + versionLabel(v))),
            priceCells(v.listing))));
      }));

    return el('details', { class: 'pimp-listings' },
      el('summary', {}, t('pimp.listings', { n: card.listings.length })),
      el('div', { class: 'pimp-table-wrap' }, table));
  };

  /* ---- Saved decks (Supabase table pimp_decks, row level security: own rows only) ---- */

  const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
  const deckSelect = $('pimp-deck-select');
  const deckName = $('pimp-deck-name');
  // Status of saving, shown both under the deck name and next to the bottom save button
  const deckMsg = (key, vars, isError) => {
    for (const msg of [$('pimp-deck-msg'), $('pimp-save-msg')]) {
      msg.textContent = key ? t(key, vars) : '';
      msg.classList.toggle('pimp-deck-error', !!isError);
    }
  };

  // Only the cards of the current result are kept, so removed cards don't linger.
  const ownedForSave = () => [...owned].filter((k) => !data || data.cards.some((c) => c.key === k.split('#')[0]));

  // Save / load errors: say so plainly when the Supabase table was never created
  const deckError = (error, fallbackKey) => {
    console.error('[pimp] Supabase:', error);
    deckMsg(error?.code === 'PGRST205' || /pimp_decks/.test(error?.message || '') ? 'pimp.decks.errNoTable' : fallbackKey, {}, true);
  };

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
    if (error) { deckError(error, 'pimp.decks.errLoad'); return; }
    decks = rows || [];
    if (currentDeck) currentDeck = decks.find((d) => d.id === currentDeck.id) || null;
    fillDeckSelect();
  };

  const setUser = async (u) => {
    const changed = (u?.id || null) !== (user?.id || null);
    user = u;
    $('pimp-decks').classList.toggle('hidden', !user);
    $('pimp-save-bar').classList.toggle('hidden', !user);
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

  // Saves the current list and its ticks: updates the selected deck, or creates a new one.
  // Used by "Enregistrer" (top) and "Enregistrer mon pimp" (bottom of the list).
  const saveDeck = async () => {
    const decklist = input.value.trim();
    if (!decklist) { deckMsg('pimp.err.empty', {}, true); return; }
    const exportName = decklist.match(/^name:\s*(.+)$/im);
    const name = (deckName.value.trim() || exportName?.[1].trim() || t('pimp.decks.untitled')).slice(0, 80);
    deckName.value = name;
    const row = { name, decklist, owned: ownedForSave() };
    const buttons = [$('pimp-deck-save'), $('pimp-save-bottom')];
    buttons.forEach((b) => { b.disabled = true; });
    clearTimeout(ownedTimer); // this save includes the ticks
    const query = currentDeck
      ? sb.from('pimp_decks').update(row).eq('id', currentDeck.id)
      : sb.from('pimp_decks').insert({ ...row, user_id: user.id });
    const { data: saved, error } = await query.select('id, name, decklist, owned, updated_at').single();
    buttons.forEach((b) => { b.disabled = false; });
    if (error) { deckError(error, 'pimp.decks.errSave'); return; }
    currentDeck = saved;
    await loadDecks();
    deckMsg('pimp.decks.saved', { name });
  };
  $('pimp-deck-save').addEventListener('click', saveDeck);
  $('pimp-save-bottom').addEventListener('click', saveDeck);

  $('pimp-deck-delete').addEventListener('click', async () => {
    if (!currentDeck || !confirm(t('pimp.decks.confirmDelete', { name: currentDeck.name }))) return;
    const { error } = await sb.from('pimp_decks').delete().eq('id', currentDeck.id);
    if (error) { deckError(error, 'pimp.decks.errSave'); return; }
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
      if (error) { deckError(error, 'pimp.decks.errSave'); return; }
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
