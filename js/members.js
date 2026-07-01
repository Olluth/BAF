'use strict';

const SUPABASE_URL = 'https://jpxmqrrmpeobrnrvvwsr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fWVirSqQi5Zcm5mybNzbOg_SakIPpgl';

const { createClient } = window.supabase;
const _sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);

/* ---- Hero data ---- */

const CLASS_ORDER = [
  'Assassin', 'Brute', 'Guardian', 'Illusionist', 'Marchand',
  'Mechanologist', 'Nécromancien', 'Ninja', 'Ranger', 'Runeblade', 'Warrior', 'Wizard', 'Autres',
];

const CLASS_COLORS = {
  Assassin:      '#b07ce0',
  Brute:         '#e08a4a',
  Guardian:      '#e0c84a',
  Illusionist:   '#a8d8e8',
  Marchand:      '#e0a84a',
  Mechanologist: '#4ae0d8',
  Nécromancien:  '#7ac44a',
  Ninja:         '#e04a4a',
  Ranger:        '#5ad870',
  Runeblade:     '#c04ae0',
  Warrior:       '#5a90e0',
  Wizard:        '#5ab4f0',
  Autres:        '#888888',
};

const HEROES = [
  // Assassin
  { id: 'arakni_m',    name: 'Arakni, Marionette',           img: 'icon_arakni_m.webp',        class: 'Assassin' },
  { id: 'arakni_sttc', name: 'Arakni, Sow the Seeds',        img: 'icon_arakni_sttc-1.webp',   class: 'Assassin' },
  { id: 'arakni_th',   name: 'Arakni, Thousand Hands',       img: 'icon_arakni_th-1.webp',     class: 'Assassin' },
  { id: 'nuu',         name: "Nu'u",                          img: 'icon_nuu.webp',              class: 'Assassin' },
  { id: 'uzuri',       name: 'Uzuri',                         img: 'icon_uzuri.webp',            class: 'Assassin' },
  // Brute
  { id: 'kayo_ad',     name: 'Kayo, Armed Diplomacy',         img: 'icon_kayo_ad.webp',          class: 'Brute' },
  { id: 'kayo_br',     name: 'Kayo, Berserker Runt',          img: 'icon_kayo_br_resized.png',  class: 'Brute' },
  { id: 'kayo_uc',     name: 'Kayo, Unwanted Cargo',          img: 'icon_kayo_uc-2.webp',       class: 'Brute' },
  { id: 'levia',       name: 'Levia',                         img: 'icon_levia.webp',            class: 'Brute' },
  { id: 'rhinar',      name: 'Rhinar',                        img: 'icon_rhinar_rr-1.webp',     class: 'Brute' },
  { id: 'tuffnut',     name: 'Tuffnut',                       img: 'icon_tuffnut-1.webp',       class: 'Brute' },
  // Guardian
  { id: 'betsy',       name: 'Betsy',                         img: 'icon_betsy.webp',            class: 'Guardian' },
  { id: 'bravo_s',     name: 'Bravo, Showstopper',            img: 'icon_bravo_s.webp',          class: 'Guardian' },
  { id: 'bravo_fs',    name: 'Bravo, Forceful Sovereign',     img: 'icon_bravo_fs.webp',         class: 'Guardian' },
  { id: 'bravo_sots',  name: 'Bravo, Strength of Spoils',     img: 'icon_bravo_sots.webp',       class: 'Guardian' },
  { id: 'brevant',     name: 'Brevant',                       img: 'icon_brevant.webp',          class: 'Guardian' },
  { id: 'jarl',        name: 'Jarl',                          img: 'icon_jarl.webp',             class: 'Guardian' },
  { id: 'lyath',       name: 'Lyath',                         img: 'icon_lyath-2.webp',         class: 'Guardian' },
  { id: 'oldhim',      name: 'Oldhim',                        img: 'icon_oldhim-1.webp',        class: 'Guardian' },
  { id: 'pleiades',    name: 'Pleiades',                      img: 'icon_pleiades-1.webp',      class: 'Guardian' },
  { id: 'terra',       name: 'Terra',                         img: 'icon_terra.webp',            class: 'Guardian' },
  { id: 'valda',       name: 'Valda',                         img: 'icon_valda.webp',            class: 'Guardian' },
  { id: 'victor',      name: 'Victor',                        img: 'icon_victor.webp',           class: 'Guardian' },
  { id: 'yoji',        name: 'Yoji',                          img: 'icon_yoji.webp',             class: 'Guardian' },
  // Illusionist
  { id: 'dromai',      name: 'Dromai',                        img: 'icon_dromai.webp',           class: 'Illusionist' },
  { id: 'enigma',      name: 'Enigma',                        img: 'icon_enigma.webp',           class: 'Illusionist' },
  { id: 'gravybones',  name: 'Gravy Bones',                   img: 'icon_gravybones.webp',       class: 'Illusionist' },
  { id: 'prism_soa',   name: 'Prism, Sculptor of Arc Light',  img: 'icon_prism_soa.webp',       class: 'Illusionist' },
  { id: 'prism_aos',   name: 'Prism, Advent of Thrones',      img: 'icon_prism_aos.webp',       class: 'Illusionist' },
  { id: 'zyggy',       name: 'Zyggy',                         img: 'icon_zyggy-1.webp',         class: 'Illusionist' },
  // Marchand
  { id: 'genis',       name: 'Genis',                         img: 'icon_genis.webp',            class: 'Marchand' },
  { id: 'kavdaen',     name: 'Kavdaen',                       img: 'icon_kavdaen.webp',          class: 'Marchand' },
  // Mechanologist
  { id: 'dash_ie',     name: 'Dash, Inventor Extraordinaire', img: 'icon_dash_ie.webp',          class: 'Mechanologist' },
  { id: 'dash_io',     name: 'Dash, Into Oblivion',           img: 'icon_dash_io.webp',          class: 'Mechanologist' },
  { id: 'datadoll',    name: 'Data Doll',                     img: 'icon_datadoll.webp',         class: 'Mechanologist' },
  { id: 'maxxnitro',   name: 'Maxx Nitro',                    img: 'icon_maxxnitro.webp',        class: 'Mechanologist' },
  { id: 'puffin',      name: 'Puffin',                        img: 'icon_puffin.webp',           class: 'Mechanologist' },
  { id: 'teklovossen', name: 'Teklovossen',                   img: 'icon_teklovossen.webp',      class: 'Mechanologist' },
  // Nécromancien
  { id: 'frankie',     name: 'Frankie',                       img: 'icon_frankie.webp',          class: 'Nécromancien' },
  // Ninja
  { id: 'benji',       name: 'Benji',                         img: 'icon_benji.webp',            class: 'Ninja' },
  { id: 'fai',         name: 'Fai',                           img: 'icon_fai.webp',              class: 'Ninja' },
  { id: 'ira',         name: 'Ira',                           img: 'icon_ira.webp',              class: 'Ninja' },
  { id: 'katsu',       name: 'Katsu',                         img: 'icon_katsu.webp',            class: 'Ninja' },
  { id: 'zen',         name: 'Zen',                           img: 'icon_zen.webp',              class: 'Ninja' },
  // Ranger
  { id: 'azalea',      name: 'Azalea',                        img: 'icon_azalea.webp',           class: 'Ranger' },
  { id: 'lexi',        name: 'Lexi',                          img: 'icon_lexi.webp',             class: 'Ranger' },
  { id: 'marlynn',     name: 'Marlynn',                       img: 'icon_marlynn.webp',          class: 'Ranger' },
  { id: 'riptide',     name: 'Riptide',                       img: 'icon_riptide.webp',          class: 'Ranger' },
  // Runeblade
  { id: 'aurora',      name: 'Aurora',                        img: 'icon_aurora.webp',           class: 'Runeblade' },
  { id: 'aurora_lot',  name: 'Aurora, Legacy of the Tempest', img: 'icon_aurora_lot-2.webp',    class: 'Runeblade' },
  { id: 'briar',       name: 'Briar',                         img: 'icon_briar.webp',            class: 'Runeblade' },
  { id: 'chane',       name: 'Chane',                         img: 'icon_chane.webp',            class: 'Runeblade' },
  { id: 'florian',     name: 'Florian',                       img: 'icon_florian.webp',          class: 'Runeblade' },
  { id: 'viserai',     name: 'Viserai',                       img: 'icon_viserai.webp',          class: 'Runeblade' },
  { id: 'vynnset',     name: 'Vynnset',                       img: 'icon_vynnset.webp',          class: 'Runeblade' },
  // Warrior
  { id: 'boltyn',      name: 'Boltyn',                        img: 'icon_boltyn.webp',           class: 'Warrior' },
  { id: 'cindra',      name: 'Cindra',                        img: 'icon_cindra.webp',           class: 'Ninja' },
  { id: 'dorinthea',   name: 'Dorinthea',                     img: 'icon_dorinthea.webp',        class: 'Warrior' },
  { id: 'fang',        name: 'Fang',                          img: 'icon_fang.webp',             class: 'Warrior' },
  { id: 'hala',        name: 'Hala',                          img: 'icon_hala_pos.webp',         class: 'Warrior' },
  { id: 'kassai_cs',   name: 'Kassai, Cintari Sellsword',     img: 'icon_kassai_cs.webp',       class: 'Warrior' },
  { id: 'kassai_gs',   name: 'Kassai of the Goldsteel',       img: 'icon_kassai_gs.webp',       class: 'Warrior' },
  { id: 'olympia',     name: 'Olympia',                       img: 'icon_olympia.webp',          class: 'Warrior' },
  // Wizard
  { id: 'blaze',       name: 'Blaze',                         img: 'icon_blaze.webp',            class: 'Wizard' },
  { id: 'iyslander',   name: 'Iyslander',                     img: 'icon_iyslander.webp',        class: 'Wizard' },
  { id: 'kano',        name: 'Kano',                          img: 'icon_kano.webp',             class: 'Wizard' },
  { id: 'oscilio',     name: 'Oscilio',                       img: 'icon_oscillio.webp',         class: 'Wizard' },
  { id: 'oscilio_fc',  name: 'Oscilio, Forked Continuum',     img: 'icon_oscilio_fc-1.webp',    class: 'Wizard' },
  { id: 'verdance',    name: 'Verdance',                      img: 'icon_verdance.webp',         class: 'Wizard' },
  // Autres
  { id: 'baalghor',    name: "Baal'Ghor",                     img: 'icon_baalghor_oote.webp',   class: 'Autres' },
  { id: 'emperor',     name: 'Emperor',                       img: 'icon_emperor.webp',          class: 'Autres' },
  { id: 'melody',      name: 'Melody',                        img: 'icon_melody.webp',           class: 'Autres' },
  { id: 'scurv',       name: 'Scurv',                         img: 'icon_scurv.webp',            class: 'Autres' },
  { id: 'shiyana',     name: 'Shiyana',                       img: 'icon_shiyana.webp',          class: 'Autres' },
];

/* ---- UI helpers ---- */

const setStatus = (id, msg, isError = false) => {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? '#fca5a5' : '#6ee7b7';
  el.classList.remove('hidden');
};

const clearStatus = id => $(id)?.classList.add('hidden');

/* ---- Profile ---- */

let _currentUser = null;
let _selectedHeroes = [];
let _cachedAchievements = null;

const TITLES = ['Newcomer', 'Old Timer', 'Judge', 'BAF Staff'];

const loadProfile = async (userId) => {
  const { data } = await _sb
    .from('profiles')
    .select('discord_pseudo, favorite_heroes, title')
    .eq('id', userId)
    .single();
  return {
    discord_pseudo: data?.discord_pseudo || '',
    favorite_heroes: Array.isArray(data?.favorite_heroes) ? data.favorite_heroes : [],
    title: (data?.title || '').replace('Oldtimer', 'Old Timer'),
  };
};

const heroById = id => HEROES.find(h => h.id === id);

const renderProfileDisplay = (profile) => {
  const content = $('member-content');
  const discord = profile.discord_pseudo || '';
  const title   = profile.title || '';
  const heroes  = (profile.favorite_heroes || []).map(heroById).filter(Boolean);

  const heroHTML = heroes.length
    ? heroes.map(h => `
        <div class="profile-hero-display">
          <img src="images/${h.img}" alt="${h.name}" />
          <span>${h.name}</span>
        </div>`).join('')
    : '<span style="opacity:.4;font-style:italic">Aucun héros sélectionné</span>';

  content.innerHTML = `
    <div class="profile-card">
      <div class="profile-header">
        <h3>Mon profil</h3>
        <button id="profile-edit-btn" class="button">Modifier</button>
      </div>
      <div class="profile-field">
        <span class="profile-label">Titre</span>
        ${title
          ? `<span class="profile-title-badge">${title.replace(/</g, '&lt;')}</span>`
          : '<span style="opacity:.4;font-style:italic">Aucun titre</span>'}
      </div>
      <div class="profile-field">
        <span class="profile-label">Discord</span>
        <span class="profile-value">${discord
          ? discord.replace(/</g, '&lt;')
          : '<span style="opacity:.4;font-style:italic">Non renseigné</span>'}</span>
      </div>
      <div class="profile-field">
        <span class="profile-label">Héros favoris</span>
        <div class="profile-heroes">${heroHTML}</div>
      </div>
    </div>`;

  $('profile-edit-btn').addEventListener('click', () => renderProfileEdit(profile));
};

const renderProfileEdit = (profile) => {
  _selectedHeroes = [...(profile.favorite_heroes || [])];
  const content    = $('member-content');
  const discordVal = (profile.discord_pseudo || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const currentTitle = profile.title || '';

  const titleOptions = ['', ...TITLES].map(t =>
    `<option value="${t}"${t === currentTitle ? ' selected' : ''}>${t || '— Aucun titre —'}</option>`
  ).join('');

  content.innerHTML = `
    <div class="profile-card">
      <div class="profile-header">
        <h3>Modifier mon profil</h3>
      </div>
      <div class="profile-field">
        <label class="profile-label" for="edit-title">Titre</label>
        <select id="edit-title" class="profile-input profile-select">${titleOptions}</select>
        <p class="profile-hint">D'autres titres seront disponibles selon vos accomplissements.</p>
      </div>
      <div class="profile-field">
        <label class="profile-label" for="edit-discord">Discord</label>
        <input type="text" id="edit-discord" class="profile-input" placeholder="pseudo#0000" value="${discordVal}" maxlength="64" />
      </div>
      <div class="profile-field">
        <span class="profile-label">Héros favoris <small style="opacity:.5">(max. 3)</small></span>
        <div class="hero-picker" id="hero-picker"></div>
      </div>
      <div class="profile-actions">
        <button id="profile-save-btn" class="button button-primary">Enregistrer</button>
        <button id="profile-cancel-btn" class="button">Annuler</button>
      </div>
      <div id="profile-status" class="admin-login-error hidden"></div>
    </div>`;

  renderHeroPicker();

  $('profile-save-btn').addEventListener('click', saveProfile);
  $('profile-cancel-btn').addEventListener('click', () => renderProfileDisplay(profile));
};

const renderHeroPicker = () => {
  const picker  = $('hero-picker');
  const grouped = {};
  CLASS_ORDER.forEach(c => { grouped[c] = []; });
  HEROES.forEach(h => { if (grouped[h.class]) grouped[h.class].push(h); });

  picker.innerHTML = CLASS_ORDER.map(cls => {
    const list  = grouped[cls];
    const color = CLASS_COLORS[cls] || '#f9e6c5';
    return `<div class="hero-section">
      <div class="hero-section-title" style="--cls-color:${color}">${cls}</div>
      <div class="hero-section-grid">
        ${list.map(h => {
          const sel   = _selectedHeroes.includes(h.id);
          const maxed = !sel && _selectedHeroes.length >= 3;
          return `<div class="hero-card${sel ? ' selected' : ''}${maxed ? ' maxed' : ''}"
            data-id="${h.id}" role="checkbox" aria-checked="${sel}" tabindex="0">
            <img src="images/${h.img}" alt="${h.name}" loading="lazy" />
            <span class="hero-name">${h.name}</span>
            <span class="hero-check" aria-hidden="true">✓</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  picker.querySelectorAll('.hero-card').forEach(card => {
    const toggle = () => {
      const id = card.dataset.id;
      if (_selectedHeroes.includes(id)) {
        _selectedHeroes = _selectedHeroes.filter(x => x !== id);
      } else {
        if (_selectedHeroes.length >= 3) return;
        _selectedHeroes.push(id);
      }
      renderHeroPicker();
    };
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
    });
  });
};

const saveProfile = async () => {
  const btn = $('profile-save-btn');
  btn.disabled = true;
  btn.textContent = 'Enregistrement…';
  clearStatus('profile-status');

  const discord_pseudo  = $('edit-discord').value.trim();
  const favorite_heroes = _selectedHeroes;
  const title           = $('edit-title').value;

  const { error } = await _sb
    .from('profiles')
    .update({ discord_pseudo, favorite_heroes, title })
    .eq('id', _currentUser.id);

  if (error) {
    setStatus('profile-status', error.message, true);
    btn.disabled = false;
    btn.textContent = 'Enregistrer';
    return;
  }

  renderProfileDisplay({ discord_pseudo, favorite_heroes, title });
};

/* ---- Member search ---- */

const renderSearchResults = (members, emptyMsg) => {
  const el = $('search-results');
  if (!members || !members.length) {
    el.innerHTML = `<p class="search-empty">${emptyMsg || 'Aucun résultat.'}</p>`;
    return;
  }
  el.innerHTML = members.map(m => {
    const titleBadge = m.title ? `<span class="profile-title-badge">${m.title.replace('Oldtimer','Old Timer').replace(/</g,'&lt;')}</span>` : '';
    const discord    = m.discord_pseudo
      ? m.discord_pseudo.replace(/</g, '&lt;')
      : '<span style="opacity:.4;font-style:italic">Non renseigné</span>';
    return `<div class="member-search-result">
      <div class="msr-info">
        <span class="msr-pseudo">${(m.pseudo || '').replace(/</g,'&lt;')}</span>
        ${titleBadge}
      </div>
      <div class="msr-discord">
        <span class="msr-discord-label">Discord</span>
        <span class="msr-discord-value">${discord}</span>
      </div>
    </div>`;
  }).join('');
};

const searchByPseudo = async () => {
  const term = $('search-pseudo-input').value.trim();
  if (!term) return;
  $('search-results').innerHTML = '<p style="opacity:.5">Recherche…</p>';
  const { data, error } = await _sb
    .from('profiles')
    .select('pseudo, discord_pseudo, title')
    .ilike('pseudo', `%${term}%`)
    .limit(10);
  if (error) { $('search-results').innerHTML = `<p class="search-empty" style="color:#fca5a5">${error.message}</p>`; return; }
  renderSearchResults(data, 'Aucun membre trouvé.');
};

const searchByHero = async (heroId) => {
  if (!heroId) return;
  $('search-results').innerHTML = '<p style="opacity:.5">Recherche…</p>';
  const { data, error } = await _sb
    .from('profiles')
    .select('pseudo, discord_pseudo, title')
    .filter('favorite_heroes', 'cs', JSON.stringify([heroId]))
    .limit(20);
  if (error) { $('search-results').innerHTML = `<p class="search-empty" style="color:#fca5a5">${error.message}</p>`; return; }
  const hero = heroById(heroId);
  renderSearchResults(data, `Aucun membre avec ${hero ? hero.name : heroId} comme héros favori.`);
};

const searchByTitle = async (titleVal) => {
  if (!titleVal) return;
  $('search-results').innerHTML = '<p style="opacity:.5">Recherche…</p>';

  const { data: current, error } = await _sb
    .from('profiles')
    .select('id, pseudo, discord_pseudo, title')
    .eq('title', titleVal)
    .order('pseudo')
    .limit(50);
  if (error) { $('search-results').innerHTML = `<p class="search-empty" style="color:#fca5a5">${error.message}</p>`; return; }

  let allMembers = current || [];
  const currentIds = new Set(allMembers.map(m => m.id));

  const { data: matchingAch } = await _sb
    .from('achievements')
    .select('id')
    .ilike('name', `%${titleVal}%`);

  if (matchingAch && matchingAch.length > 0) {
    const achIds = matchingAch.map(a => a.id);
    const { data: memberAch } = await _sb
      .from('member_achievements')
      .select('member_id')
      .in('achievement_id', achIds);

    if (memberAch && memberAch.length > 0) {
      const extraIds = [...new Set(memberAch.map(r => r.member_id))].filter(id => !currentIds.has(id));
      if (extraIds.length > 0) {
        const { data: extraProfiles } = await _sb
          .from('profiles')
          .select('id, pseudo, discord_pseudo, title')
          .in('id', extraIds)
          .order('pseudo');
        allMembers = [...allMembers, ...(extraProfiles || [])].sort((a, b) =>
          (a.pseudo || '').localeCompare(b.pseudo || '')
        );
      }
    }
  }

  renderSearchResults(allMembers, `Aucun membre avec le titre « ${titleVal} ».`);
};

const makeCsd = (wrapperId, panelId, onSelect) => {
  const wrap  = $(wrapperId);
  const panel = $(panelId);
  if (!wrap || !panel) return;

  const trigger = wrap.querySelector('.csd-trigger');
  const label   = wrap.querySelector('.csd-label');
  const arrow   = wrap.querySelector('.csd-arrow');
  const search  = wrap.querySelector('.csd-search');
  const list    = wrap.querySelector('.csd-list');

  const open = () => {
    panel.classList.remove('hidden');
    arrow.style.transform = 'rotate(180deg)';
    search?.focus();
  };
  const close = () => {
    panel.classList.add('hidden');
    arrow.style.transform = '';
    if (search) search.value = '';
    list?.querySelectorAll('.csd-opt, .csd-group').forEach(el => (el.style.display = ''));
  };

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.contains('hidden') ? open() : close();
  });

  search?.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    list.querySelectorAll('.csd-opt').forEach(opt => {
      opt.style.display = opt.dataset.name.toLowerCase().includes(q) ? '' : 'none';
    });
    list.querySelectorAll('.csd-group').forEach(grp => {
      const any = [...grp.querySelectorAll('.csd-opt')].some(o => o.style.display !== 'none');
      grp.style.display = any ? '' : 'none';
    });
  });

  list?.addEventListener('mousedown', e => {
    const opt = e.target.closest('.csd-opt');
    if (!opt) return;
    e.preventDefault();
    list.querySelectorAll('.csd-opt').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    label.textContent = opt.dataset.name;
    close();
    onSelect(opt.dataset.value, opt.dataset.name);
  });

  document.addEventListener('click', () => close(), { capture: false });
};

const buildHeroDropdownHTML = () => {
  const grouped = {};
  CLASS_ORDER.forEach(c => { grouped[c] = []; });
  HEROES.forEach(h => { if (grouped[h.class]) grouped[h.class].push(h); });
  return CLASS_ORDER.map(cls => {
    const list = grouped[cls];
    if (!list.length) return '';
    return `<div class="csd-group">
      <div class="csd-group-label">${cls}</div>
      ${list.map(h => `<div class="csd-opt" data-value="${h.id}" data-name="${h.name.replace(/"/g, '&quot;')}">
        <img src="images/${h.img}" alt="" loading="lazy" />
        <span>${h.name}</span>
      </div>`).join('')}
    </div>`;
  }).join('');
};

const buildTitleDropdownHTML = () =>
  TITLES.map(t => `<div class="csd-opt" data-value="${t}" data-name="${t}">${t}</div>`).join('');

const renderSearchSection = () => {
  $('member-search').innerHTML = `
    <div class="search-section">
      <h3 class="search-title">Rechercher un membre</h3>
      <div class="search-tabs">
        <button class="search-tab active" data-mode="pseudo">Par pseudo</button>
        <button class="search-tab" data-mode="hero">Par héros</button>
        <button class="search-tab" data-mode="title">Par titre</button>
      </div>
      <div id="search-pseudo-mode" class="search-form">
        <input type="text" id="search-pseudo-input" class="profile-input" placeholder="Pseudo…" maxlength="64" />
        <button id="search-pseudo-btn" class="button button-primary">Chercher</button>
      </div>
      <div id="search-hero-mode" class="search-form hidden">
        <div class="csd-wrap" id="hero-csd-wrap">
          <button class="csd-trigger profile-input" type="button">
            <span class="csd-label">— Choisir un héros —</span>
            <span class="csd-arrow">▾</span>
          </button>
          <div class="csd-panel hidden" id="hero-csd-panel">
            <div class="csd-search-wrap">
              <input class="csd-search" type="text" placeholder="Filtrer…" autocomplete="off" />
            </div>
            <div class="csd-list">${buildHeroDropdownHTML()}</div>
          </div>
        </div>
      </div>
      <div id="search-title-mode" class="search-form hidden">
        <div class="csd-wrap" id="title-csd-wrap">
          <button class="csd-trigger profile-input" type="button">
            <span class="csd-label">— Choisir un titre —</span>
            <span class="csd-arrow">▾</span>
          </button>
          <div class="csd-panel hidden" id="title-csd-panel">
            <div class="csd-list">${buildTitleDropdownHTML()}</div>
          </div>
        </div>
      </div>
      <div id="search-results" class="search-results"></div>
    </div>`;

  document.querySelectorAll('.search-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.mode;
      $('search-pseudo-mode').classList.toggle('hidden', mode !== 'pseudo');
      $('search-hero-mode').classList.toggle('hidden', mode !== 'hero');
      $('search-title-mode').classList.toggle('hidden', mode !== 'title');
      $('search-results').innerHTML = '';
    });
  });

  $('search-pseudo-btn').addEventListener('click', searchByPseudo);
  $('search-pseudo-input').addEventListener('keydown', e => { if (e.key === 'Enter') searchByPseudo(); });

  makeCsd('hero-csd-wrap',  'hero-csd-panel',  (id)  => searchByHero(id));
  makeCsd('title-csd-wrap', 'title-csd-panel', (val) => searchByTitle(val));
};

/* ---- Achievements ---- */

const TIER_ORDER = ['Silver', 'Gold', 'Diamond'];
const TIER_LABELS = { Silver: 'Argent', Gold: 'Or', Diamond: 'Diamant' };

const loadAllAchievements = async () => {
  const { data, error } = await _sb.from('achievements').select('*').order('category').order('name');
  if (error) console.error('achievements load error:', error.message);
  return data || [];
};

const loadMemberAchievements = async (userId) => {
  const { data } = await _sb
    .from('member_achievements')
    .select('achievement_id')
    .eq('member_id', userId);
  return (data || []).map(r => r.achievement_id);
};

const renderAchievementsSection = (all, unlockedIds) => {
  const container = $('member-achievements');
  if (!container) return;
  const unlocked = new Set(unlockedIds);
  const grouped = {};
  TIER_ORDER.forEach(t => { grouped[t] = []; });
  all.forEach(a => { if (grouped[a.tier]) grouped[a.tier].push(a); });

  if (!all.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="achievements-section">
      <div class="achievements-header">
        <h3 class="search-title">Hauts faits</h3>
        <span class="achievements-progress">${unlocked.size} / ${all.length}</span>
      </div>
      ${TIER_ORDER.map(tier => {
        const list = grouped[tier];
        if (!list.length) return '';
        return `
          <div class="achievements-tier">
            <div class="ach-tier-badge ach-tier-${tier.toLowerCase()}">${TIER_LABELS[tier] || tier}</div>
            <div class="achievements-grid">
              ${list.map(a => {
                const done = unlocked.has(a.id);
                return `<div class="achievement-card${done ? ' achievement-unlocked' : ''}">
                  <div class="achievement-status">${done ? '✓' : '○'}</div>
                  <div class="achievement-body">
                    <span class="achievement-name">${a.name.replace(/</g,'&lt;')}</span>
                    <span class="achievement-desc">${a.description.replace(/</g,'&lt;')}</span>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>`;
      }).join('')}
    </div>`;
};

/* ---- Auth UI ---- */

const showDashboard = async (user) => {
  _currentUser = user;
  $('auth-container').classList.add('hidden');
  $('member-dashboard').classList.remove('hidden');
  const pseudo = user.user_metadata?.pseudo || user.email;
  const pseudoCap = pseudo.charAt(0).toUpperCase() + pseudo.slice(1);
  $('member-email').textContent = `Bonjour, ${pseudoCap} !`;
  const [profile, allAchievements, memberAchievements] = await Promise.all([
    loadProfile(user.id),
    _cachedAchievements ? Promise.resolve(_cachedAchievements) : loadAllAchievements(),
    loadMemberAchievements(user.id),
  ]);
  _cachedAchievements = allAchievements;
  renderProfileDisplay(profile);
  renderSearchSection();
  renderAchievementsSection(allAchievements, memberAchievements);
};

const showAuth = async () => {
  _currentUser = null;
  $('auth-container').classList.remove('hidden');
  $('member-dashboard').classList.add('hidden');
  const all = _cachedAchievements || await loadAllAchievements();
  _cachedAchievements = all;
  renderAchievementsSection(all, []);
};

/* ---- Tab switching ---- */

document.querySelectorAll('.admin-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    $('signin-panel').classList.toggle('hidden', tab !== 'signin');
    $('signup-panel').classList.toggle('hidden', tab !== 'signup');
  });
});

/* ---- Sign in ---- */

$('signin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('signin-btn');
  btn.disabled = true;
  btn.textContent = 'Connexion…';
  clearStatus('signin-status');

  const pseudo   = $('signin-pseudo').value.trim().toLowerCase();
  const password = $('signin-password').value;

  const { data: profile, error: lookupError } = await _sb
    .from('profiles')
    .select('email')
    .eq('pseudo', pseudo)
    .single();

  if (lookupError || !profile) {
    setStatus('signin-status', 'Pseudo introuvable.', true);
    btn.disabled = false;
    btn.textContent = 'Se connecter';
    return;
  }

  const { error } = await _sb.auth.signInWithPassword({ email: profile.email, password });

  if (error) {
    setStatus('signin-status', error.message, true);
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
});

/* ---- Sign up ---- */

$('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('signup-btn');
  btn.disabled = true;
  btn.textContent = 'Création…';
  clearStatus('signup-status');

  const pseudo   = $('signup-pseudo').value.trim().toLowerCase();
  const email    = $('signup-email').value.trim();
  const password = $('signup-password').value;

  const { data: existing } = await _sb.from('profiles').select('id').eq('pseudo', pseudo).single();
  if (existing) {
    setStatus('signup-status', 'Ce pseudo est déjà pris.', true);
    btn.disabled = false;
    btn.textContent = 'Créer mon compte';
    return;
  }

  const { error } = await _sb.auth.signUp({
    email,
    password,
    options: {
      data: { pseudo },
      emailRedirectTo: `${location.origin}/members.html`,
    },
  });

  if (error) {
    setStatus('signup-status', error.message, true);
  } else {
    setStatus('signup-status', 'Vérifiez votre email pour confirmer votre inscription.');
    $('signup-form').reset();
  }
  btn.disabled = false;
  btn.textContent = 'Créer mon compte';
});

/* ---- Sign out ---- */

$('signout-btn').addEventListener('click', async () => {
  await _sb.auth.signOut();
});

/* ---- Auth state ---- */

_sb.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    showDashboard(session.user);
  } else {
    showAuth();
  }
});
