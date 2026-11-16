'use strict';
/*
 * Official Flesh and Blood events on events.html (Callings, Pro Tours, World Premieres,
 * World / National Championships, Battle Hardened). Shows the next Calling in Europe as a
 * featured card, then the upcoming events filtered by region (Europe / world) and kind.
 *
 * Source: fabtcg.com's public WordPress API (post type "tournament" = "Organised Plays"),
 * fetched by the visitor's browser (it allows any website; it refuses non-browser clients,
 * so the VPS can't fetch it). The event's own date, venue and registration details only
 * exist in the page text ("Date: April 2-4, 2027", "Venue: ..., France"), read from there.
 * The parsed list is kept in localStorage for CACHE_MS. Filters are remembered too.
 */
(function () {
  const FILTER_KEY = 'baf-lss-filters';
  const CACHE_KEY = 'baf-lss-events';
  const CACHE_MS = 6 * 60 * 60 * 1000;
  // Newest 50 entries: every upcoming event (they are published months ahead), ~140 KB gzipped
  const SOURCE = 'https://fabtcg.com/wp-json/wp/v2/tournament?per_page=50&orderby=date&order=desc&_fields=id,link,title,content,yoast_head_json.og_image';
  const $ = (id) => document.getElementById(id);
  const featuredEl = $('lss-featured');
  const listEl = $('lss-list');
  // The loader is shared (window.bafLss, used by the home page's featured event in
  // agenda.js); the list and filters only exist on events.html.
  const onEventsPage = !!(featuredEl && listEl);

  // Kind -> badge class (reuses the agenda badges) and the filter it belongs to
  const KIND_BADGE = {
    calling: 'agenda-tier-calling', protour: 'agenda-tier-pt', world: 'agenda-tier-world', nationals: 'agenda-tier-national',
    premiere: 'agenda-tier-wcq', battlehardened: 'agenda-tier-battleground', wcq: 'agenda-tier-wcq', other: 'agenda-tier-other',
  };
  const KIND_FILTER = { world: 'championship', nationals: 'championship' };

  let filters = { region: 'europe', kind: 'all' };
  try { filters = { ...filters, ...JSON.parse(localStorage.getItem(FILTER_KEY) || '{}') }; } catch {}
  let events = null;

  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const lang = () => (window.getLang ? getLang() : 'fr');
  const locale = () => (lang() === 'en' ? 'en-GB' : 'fr-FR');
  const day = (iso) => new Date(`${iso}T12:00:00`);
  const todayIso = () => new Date().toISOString().slice(0, 10);

  // "2–4 avril 2027" / "30 oct. – 1 nov. 2026"
  const fmtRange = (start, end) => {
    const f = new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
    return start === end || !f.formatRange ? f.format(day(start)) : f.formatRange(day(start), day(end));
  };
  const fmtDay = (iso) => new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'long', year: 'numeric' }).format(day(iso));
  const countryName = (code) => {
    if (!code) return '';
    try { return new Intl.DisplayNames([locale()], { type: 'region' }).of(code); } catch { return code; }
  };
  const kindLabel = (k) => t(`lss.kind.${k}`);
  const place = (e) => [e.city, countryName(e.country)].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');

  // "dans 137 jours" / "demain" / "en cours"
  const countdown = (e) => {
    const t0 = todayIso();
    if (e.start <= t0 && e.end >= t0) return t('lss.ongoing');
    const days = Math.round((day(e.start) - day(t0)) / 864e5);
    return days === 1 ? t('lss.tomorrow') : t('lss.inDays', { n: days });
  };

  // Registration line: opens later / open (with link) / nothing known
  const registration = (e) => {
    if (e.registrationOpens && e.registrationOpens > todayIso()) {
      return `<span class="lss-reg lss-reg-soon">${esc(t('lss.regOpens', { date: fmtDay(e.registrationOpens) }))}</span>`;
    }
    if (e.registration) return `<span class="lss-reg lss-reg-open">${esc(t('lss.regOpen'))}</span>`;
    return '';
  };

  const links = (e, big) => `
    <div class="lss-links">
      ${e.registration && !(e.registrationOpens > todayIso())
        ? `<a href="${esc(e.registration)}" target="_blank" rel="noopener noreferrer" class="button ${big ? 'button-primary' : ''} agenda-card-btn">${esc(t('lss.register'))} ↗</a>` : ''}
      <a href="${esc(e.link)}" target="_blank" rel="noopener noreferrer" class="button agenda-card-btn">${esc(t('lss.details'))} ↗</a>
    </div>`;

  const badge = (e) => `<span class="agenda-tier-badge ${KIND_BADGE[e.kind] || KIND_BADGE.other}">${esc(kindLabel(e.kind))}</span>`;

  // Next Calling in Europe (or the next European event if no Calling is announced)
  const renderFeatured = () => {
    const eu = events.filter((e) => e.europe);
    const e = eu.find((x) => x.kind === 'calling') || eu[0];
    if (!e) { featuredEl.innerHTML = ''; return; }
    featuredEl.innerHTML = `
      <div class="event-featured-card lss-featured">
        ${e.image ? `<a href="${esc(e.link)}" target="_blank" rel="noopener noreferrer"><img src="${esc(e.image)}" alt="${esc(e.title)}" class="event-featured-img" /></a>` : ''}
        <div class="event-featured-body">
          <span class="event-label">${esc(e.kind === 'calling' ? t('lss.nextCalling') : t('lss.nextEurope'))}</span>
          <h2>${esc(e.title)}</h2>
          <p class="lss-featured-when"><strong>${esc(fmtRange(e.start, e.end))}</strong> · ${esc(place(e))}</p>
          <p class="lss-featured-meta"><span class="lss-countdown">${esc(countdown(e))}</span>${registration(e)}</p>
          ${e.venue ? `<p class="lss-venue">${esc(e.venue)}</p>` : ''}
          ${links(e, true)}
        </div>
      </div>`;
  };

  const card = (e) => `
    <article class="agenda-card lss-card">
      <a href="${esc(e.link)}" target="_blank" rel="noopener noreferrer" class="agenda-card-img-wrap">
        ${e.image ? `<img src="${esc(e.image)}" alt="${esc(e.title)}" class="agenda-card-img" loading="lazy" />` : '<div class="agenda-card-img agenda-card-no-img"></div>'}
      </a>
      <div class="agenda-card-body">
        <div class="agenda-card-meta">
          <span class="agenda-card-date">${esc(fmtRange(e.start, e.end))}</span>
          ${badge(e)}
        </div>
        <h3 class="agenda-card-name">${esc(e.title)}</h3>
        <p class="lss-place">${esc(place(e))} · <span class="lss-countdown">${esc(countdown(e))}</span></p>
        ${registration(e)}
        ${links(e, false)}
      </div>
    </article>`;

  const renderList = () => {
    const list = events.filter((e) => (filters.region === 'world' || e.europe)
      && (filters.kind === 'all' || (KIND_FILTER[e.kind] || e.kind) === filters.kind));
    listEl.innerHTML = list.length
      ? list.map(card).join('')
      : `<p class="lss-empty">${esc(t('lss.empty'))}</p>`;
    // Pressed state of the filter buttons
    document.querySelectorAll('[data-lss-region]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lssRegion === filters.region)));
    document.querySelectorAll('[data-lss-kind]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lssKind === filters.kind)));
  };

  const render = () => {
    if (!events || !onEventsPage) return;
    renderFeatured();
    renderList();
    const src = $('lss-source');
    if (src && events.fetchedAt) src.textContent = t('lss.source', { date: fmtDay(events.fetchedAt.slice(0, 10)) });
  };

  const setFilter = (key, value) => {
    filters[key] = value;
    try { localStorage.setItem(FILTER_KEY, JSON.stringify(filters)); } catch {}
    renderList();
  };
  document.querySelectorAll('[data-lss-region]').forEach((b) => b.addEventListener('click', () => setFilter('region', b.dataset.lssRegion)));
  document.querySelectorAll('[data-lss-kind]').forEach((b) => b.addEventListener('click', () => setFilter('kind', b.dataset.lssKind)));
  document.addEventListener('langchange', render);

  /* ---- Reading fabtcg.com entries ---- */

  const MONTH_RE = 'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthNum = (m) => MONTHS.indexOf(m.toLowerCase().slice(0, 3)) + 1;
  const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // "April 2-4, 2027" / "October 30 - November 1, 2026" / "June 27, 2026" / "May 2 to May 17, 2026"
  // / "2-4 April 2027" -> { start, end } (ISO), or null.
  const parseDates = (s) => {
    if (!s) return null;
    let m = s.match(new RegExp(`(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:-|to)\\s*(?:(${MONTH_RE})\\.?\\s+)?(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(\\d{4})`, 'i'));
    if (m) {
      const y = Number(m[5]);
      const m1 = monthNum(m[1]);
      const m2 = m[3] ? monthNum(m[3]) : m1;
      return { start: iso(m2 < m1 ? y - 1 : y, m1, m[2]), end: iso(y, m2, m[4]) };
    }
    m = s.match(new RegExp(`(\\d{1,2})\\s*(?:-|to)\\s*(\\d{1,2})\\s+(${MONTH_RE}),?\\s*(\\d{4})`, 'i'));
    if (m) return { start: iso(m[4], monthNum(m[3]), m[1]), end: iso(m[4], monthNum(m[3]), m[2]) };
    m = s.match(new RegExp(`(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(\\d{4})`, 'i'));
    if (m) { const d = iso(m[3], monthNum(m[1]), m[2]); return { start: d, end: d }; }
    return null;
  };

  // Country names as written in venues / titles -> ISO code
  const COUNTRIES = {
    France: 'FR', Spain: 'ES', España: 'ES', Germany: 'DE', Deutschland: 'DE', Italy: 'IT', Italia: 'IT', 'United Kingdom': 'GB',
    UK: 'GB', England: 'GB', Scotland: 'GB', Wales: 'GB', Ireland: 'IE', Netherlands: 'NL', Belgium: 'BE', Poland: 'PL',
    Czechia: 'CZ', 'Czech Republic': 'CZ', Denmark: 'DK', Sweden: 'SE', Norway: 'NO', Finland: 'FI', Switzerland: 'CH',
    Austria: 'AT', Portugal: 'PT', Greece: 'GR', Cyprus: 'CY', Cyrpus: 'CY', Hungary: 'HU', Romania: 'RO', Croatia: 'HR',
    Slovenia: 'SI', Slovakia: 'SK', Luxembourg: 'LU', Estonia: 'EE', Latvia: 'LV', Lithuania: 'LT', Bulgaria: 'BG', Serbia: 'RS',
    Iceland: 'IS', Malta: 'MT', 'United States': 'US', USA: 'US', Canada: 'CA', Mexico: 'MX', Brazil: 'BR', Brasil: 'BR',
    Argentina: 'AR', Chile: 'CL', Australia: 'AU', 'New Zealand': 'NZ', Japan: 'JP', China: 'CN', 'South Korea': 'KR', Korea: 'KR',
    Singapore: 'SG', Malaysia: 'MY', Indonesia: 'ID', Thailand: 'TH', Vietnam: 'VN', Philippines: 'PH', 'Hong Kong': 'HK',
    Taiwan: 'TW', India: 'IN', 'South Africa': 'ZA',
  };
  const COUNTRY_NAMES = Object.keys(COUNTRIES).sort((a, b) => b.length - a.length); // "United Kingdom" before "UK"
  const EUROPE = new Set(['FR', 'ES', 'DE', 'IT', 'GB', 'IE', 'NL', 'BE', 'PL', 'CZ', 'DK', 'SE', 'NO', 'FI', 'CH', 'AT', 'PT', 'GR', 'CY',
    'HU', 'RO', 'HR', 'SI', 'SK', 'LU', 'EE', 'LV', 'LT', 'BG', 'RS', 'IS', 'MT']);
  // Venues that don't name their country ("1 Western Gateway, London E16")
  const CITIES = {
    London: 'GB', Edinburgh: 'GB', Wakefield: 'GB', Birmingham: 'GB', Manchester: 'GB', Paris: 'FR', Toulouse: 'FR', Lyon: 'FR',
    Lille: 'FR', Bordeaux: 'FR', Bilbao: 'ES', Barcelona: 'ES', Madrid: 'ES', Hamburg: 'DE', Berlin: 'DE', Essen: 'DE',
    Warsaw: 'PL', Prague: 'CZ', Antwerp: 'BE', Brussels: 'BE', Amsterdam: 'NL', Copenhagen: 'DK', Stockholm: 'SE', Milan: 'IT',
    Rome: 'IT', Lisbon: 'PT', Vienna: 'AT', Bern: 'CH',
  };
  const countryOf = (venue, title) => {
    for (const hay of [venue || '', title]) {
      for (const name of COUNTRY_NAMES) {
        if (new RegExp(`(^|[\\s,(-])${name}([\\s,.)]|$)`).test(hay)) return COUNTRIES[name];
      }
    }
    if (/\b[A-Z]{2}\s\d{5}\b/.test(venue || '')) return 'US'; // "Hartford, CT 06103"
    for (const [city, code] of Object.entries(CITIES)) {
      if (new RegExp(`\\b${city}\\b`, 'i').test(`${venue || ''} ${title}`)) return code;
    }
    return null;
  };

  // Kind of event, from its title. Order matters ("USA Championship / Calling: Detroit" = nationals).
  const KINDS = [
    [/world championship qualifier|\bwcq\b/i, 'wcq'],
    [/world championship/i, 'world'],
    [/pro tour/i, 'protour'],
    [/national championship|usa championship|nationals/i, 'nationals'],
    [/world premiere/i, 'premiere'],
    [/battle hardened/i, 'battlehardened'],
    [/calling/i, 'calling'],
  ];

  // HTML -> plain text, one line per paragraph / list item (the browser decodes entities)
  const toText = (html) => {
    const doc = new DOMParser().parseFromString(
      String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|div|h\d|tr)>/gi, '\n$&'), 'text/html');
    return (doc.body.textContent || '').replace(/[–—]/g, '-').replace(/ /g, ' ')
      .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n');
  };
  const field = (text, labels) => {
    const m = text.match(new RegExp(`(?:^|\\n)\\s*(?:${labels})\\s*:\\s*([^\\n]+)`, 'i'));
    return m ? m[1].trim() : null;
  };

  // One fabtcg.com entry -> event, or null for pages that aren't a dated event
  // (invited players, live streams, standings...).
  const toEvent = (entry) => {
    const title = toText(entry.title?.rendered || '').trim();
    if (/invited players|live stream|pairings|standings|qualified players|tournament structure|test$/i.test(title)) return null;
    const text = toText(entry.content?.rendered || '');
    const dates = parseDates(field(text, 'Dates?|When'));
    if (!dates) return null;
    const venue = field(text, 'Venue|Location');
    const country = countryOf(venue, title);
    const reg = (field(text, 'Registration') || '').split(/\s/)[0];
    return {
      id: entry.id,
      title,
      city: (title.match(/(?:calling|pro tour|world premiere|world championship)\s*:?\s*([^/-]+)$/i) || [])[1]?.trim() || null,
      kind: (KINDS.find(([re]) => re.test(title)) || [null, 'other'])[1],
      start: dates.start,
      end: dates.end,
      venue: venue ? venue.replace(/\s+,/g, ',').slice(0, 200) : null,
      country,
      europe: country ? EUROPE.has(country) : false,
      registration: /^https?:\/\//.test(reg) ? reg : null,
      registrationOpens: parseDates(field(text, 'Registration opens'))?.start || null,
      image: entry.yoast_head_json?.og_image?.[0]?.url || null,
      link: entry.link,
    };
  };

  /* ---- Loading ---- */

  const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; } };

  const show = (cached) => {
    const t0 = todayIso();
    events = cached.events.filter((e) => e.end >= t0);
    events.fetchedAt = cached.fetchedAt;
    render();
  };

  // { fetchedAt, events } — the cached list if fresh, else fabtcg.com (falling back to an
  // older cached list), or null. Fetched once per page.
  let loading = null;
  const load = () => loading || (loading = (async () => {
    const cached = readCache();
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < CACHE_MS) return cached;
    try {
      const r = await fetch(SOURCE);
      if (!r.ok) throw new Error(r.status);
      const entries = await r.json();
      const seen = new Set();
      const list = entries.map(toEvent).filter((e) => e && !seen.has(e.id) && seen.add(e.id))
        .sort((a, b) => a.start.localeCompare(b.start));
      const fresh = { fetchedAt: new Date().toISOString(), events: list };
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(fresh)); } catch {}
      return fresh;
    } catch {
      return cached;
    }
  })());

  // For agenda.js (home page featured event)
  window.bafLss = { load, fmtRange, place, kindLabel };

  if (!onEventsPage) return;
  (async () => {
    const cached = readCache();
    if (cached) show(cached); // something right away, even if a refresh follows
    const data = await load();
    if (data) { if (data !== cached) show(data); return; }
    featuredEl.innerHTML = '';
    listEl.innerHTML = `<p class="lss-empty">${esc(t('lss.unavailable'))}</p>`;
  })();
})();
