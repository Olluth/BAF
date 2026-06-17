'use strict';

const SUPABASE_URL = 'https://jpxmqrrmpeobrnrvvwsr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fWVirSqQi5Zcm5mybNzbOg_SakIPpgl';

const { createClient } = window.supabase;
const _sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);

/* ---- Hero data ---- */

const CLASS_ORDER = [
  'Assassin', 'Brute', 'Guardian', 'Illusionist', 'Marchand',
  'Mechanologist', 'Ninja', 'Ranger', 'Runeblade', 'Warrior', 'Wizard', 'Autres',
];

const CLASS_COLORS = {
  Assassin:      '#b07ce0',
  Brute:         '#e08a4a',
  Guardian:      '#e0c84a',
  Illusionist:   '#a8d8e8',
  Marchand:      '#e0a84a',
  Mechanologist: '#4ae0d8',
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
  { id: 'marlynn',     name: 'Marlynn',                       img: 'icon_marlynn.webp',          class: 'Ranger' },
  { id: 'uzuri',       name: 'Uzuri',                         img: 'icon_uzuri.webp',            class: 'Assassin' },
  // Brute
  { id: 'gravybones',  name: 'Gravy Bones',                   img: 'icon_gravybones.webp',       class: 'Brute' },
  { id: 'kayo_ad',     name: 'Kayo, Armed Diplomacy',         img: 'icon_kayo_ad.webp',          class: 'Brute' },
  { id: 'kayo_br',     name: 'Kayo, Berserker Runt',          img: 'icon_kayo_br_resized.png',  class: 'Brute' },
  { id: 'kayo_uc',     name: 'Kayo, Unwanted Cargo',          img: 'icon_kayo_uc-2.webp',       class: 'Brute' },
  { id: 'levia',       name: 'Levia',                         img: 'icon_levia.webp',            class: 'Brute' },
  { id: 'puffin',      name: 'Puffin',                        img: 'icon_puffin.webp',           class: 'Brute' },
  { id: 'rhinar',      name: 'Rhinar',                        img: 'icon_rhinar_rr-1.webp',     class: 'Brute' },
  { id: 'scurv',       name: 'Scurv',                         img: 'icon_scurv.webp',            class: 'Brute' },
  { id: 'tuffnut',     name: 'Tuffnut',                       img: 'icon_tuffnut-1.webp',       class: 'Brute' },
  // Guardian
  { id: 'bravo_s',     name: 'Bravo, Showstopper',            img: 'icon_bravo_s.webp',          class: 'Guardian' },
  { id: 'bravo_fs',    name: 'Bravo, Forceful Sovereign',     img: 'icon_bravo_fs.webp',         class: 'Guardian' },
  { id: 'bravo_sots',  name: 'Bravo, Strength of Spoils',     img: 'icon_bravo_sots.webp',       class: 'Guardian' },
  { id: 'brevant',     name: 'Brevant',                       img: 'icon_brevant.webp',          class: 'Guardian' },
  { id: 'florian',     name: 'Florian',                       img: 'icon_florian.webp',          class: 'Guardian' },
  { id: 'hala',        name: 'Hala',                          img: 'icon_hala_pos.webp',         class: 'Guardian' },
  { id: 'oldhim',      name: 'Oldhim',                        img: 'icon_oldhim-1.webp',        class: 'Guardian' },
  { id: 'terra',       name: 'Terra',                         img: 'icon_terra.webp',            class: 'Guardian' },
  { id: 'valda',       name: 'Valda',                         img: 'icon_valda.webp',            class: 'Guardian' },
  { id: 'verdance',    name: 'Verdance',                      img: 'icon_verdance.webp',         class: 'Wizard' },
  // Illusionist
  { id: 'dromai',      name: 'Dromai',                        img: 'icon_dromai.webp',           class: 'Illusionist' },
  { id: 'enigma',      name: 'Enigma',                        img: 'icon_enigma.webp',           class: 'Illusionist' },
  { id: 'lyath',       name: 'Lyath',                         img: 'icon_lyath-2.webp',         class: 'Illusionist' },
  { id: 'melody',      name: 'Melody',                        img: 'icon_melody.webp',           class: 'Illusionist' },
  { id: 'pleiades',    name: 'Pleiades',                      img: 'icon_pleiades-1.webp',      class: 'Guardian' },
  { id: 'prism_soa',   name: 'Prism, Sculptor of Arc Light',  img: 'icon_prism_soa.webp',       class: 'Illusionist' },
  { id: 'prism_aos',   name: 'Prism, Advent of Thrones',      img: 'icon_prism_aos.webp',       class: 'Illusionist' },
  // Marchand
  { id: 'genis',       name: 'Genis',                         img: 'icon_genis.webp',            class: 'Marchand' },
  { id: 'kavdaen',     name: 'Kavdaen',                       img: 'icon_kavdaen.webp',          class: 'Marchand' },
  // Mechanologist
  { id: 'dash_ie',     name: 'Dash, Inventor Extraordinaire', img: 'icon_dash_ie.webp',          class: 'Mechanologist' },
  { id: 'dash_io',     name: 'Dash, Into Oblivion',           img: 'icon_dash_io.webp',          class: 'Mechanologist' },
  { id: 'datadoll',    name: 'Data Doll',                     img: 'icon_datadoll.webp',         class: 'Mechanologist' },
  { id: 'frankie',     name: 'Frankie',                       img: 'icon_frankie.webp',          class: 'Mechanologist' },
  { id: 'maxxnitro',   name: 'Maxx Nitro',                    img: 'icon_maxxnitro.webp',        class: 'Mechanologist' },
  { id: 'riptide',     name: 'Riptide',                       img: 'icon_riptide.webp',          class: 'Ranger' },
  { id: 'teklovossen', name: 'Teklovossen',                   img: 'icon_teklovossen.webp',      class: 'Mechanologist' },
  { id: 'zyggy',       name: 'Zyggy',                         img: 'icon_zyggy-1.webp',         class: 'Mechanologist' },
  // Ninja
  { id: 'benji',       name: 'Benji',                         img: 'icon_benji.webp',            class: 'Ninja' },
  { id: 'fai',         name: 'Fai',                           img: 'icon_fai.webp',              class: 'Ninja' },
  { id: 'fang',        name: 'Fang',                          img: 'icon_fang.webp',             class: 'Ninja' },
  { id: 'katsu',       name: 'Katsu',                         img: 'icon_katsu.webp',            class: 'Ninja' },
  { id: 'nuu',         name: 'Nuu',                           img: 'icon_nuu.webp',              class: 'Ninja' },
  { id: 'yoji',        name: 'Yoji',                          img: 'icon_yoji.webp',             class: 'Guardian' },
  { id: 'zen',         name: 'Zen',                           img: 'icon_zen.webp',              class: 'Ninja' },
  // Ranger
  { id: 'azalea',      name: 'Azalea',                        img: 'icon_azalea.webp',           class: 'Ranger' },
  { id: 'betsy',       name: 'Betsy',                         img: 'icon_betsy.webp',            class: 'Guardian' },
  { id: 'lexi',        name: 'Lexi',                          img: 'icon_lexi.webp',             class: 'Ranger' },
  // Runeblade
  { id: 'briar',       name: 'Briar',                         img: 'icon_briar.webp',            class: 'Runeblade' },
  { id: 'chane',       name: 'Chane',                         img: 'icon_chane.webp',            class: 'Runeblade' },
  { id: 'viserai',     name: 'Viserai',                       img: 'icon_viserai.webp',          class: 'Runeblade' },
  { id: 'vynnset',     name: 'Vynnset',                       img: 'icon_vynnset.webp',          class: 'Runeblade' },
  // Warrior
  { id: 'blaze',       name: 'Blaze',                         img: 'icon_blaze.webp',            class: 'Wizard' },
  { id: 'boltyn',      name: 'Boltyn',                        img: 'icon_boltyn.webp',           class: 'Warrior' },
  { id: 'cindra',      name: 'Cindra',                        img: 'icon_cindra.webp',           class: 'Warrior' },
  { id: 'dorinthea',   name: 'Dorinthea',                     img: 'icon_dorinthea.webp',        class: 'Warrior' },
  { id: 'emperor',     name: 'Emperor',                       img: 'icon_emperor.webp',          class: 'Warrior' },
  { id: 'ira',         name: 'Ira',                           img: 'icon_ira.webp',              class: 'Warrior' },
  { id: 'jarl',        name: 'Jarl',                          img: 'icon_jarl.webp',             class: 'Warrior' },
  { id: 'kassai_cs',   name: 'Kassai, Cintari Sellsword',     img: 'icon_kassai_cs.webp',       class: 'Warrior' },
  { id: 'kassai_gs',   name: 'Kassai of Goldsteel',           img: 'icon_kassai_gs.webp',       class: 'Warrior' },
  { id: 'olympia',     name: 'Olympia',                       img: 'icon_olympia.webp',          class: 'Warrior' },
  { id: 'shiyana',     name: 'Shiyana',                       img: 'icon_shiyana.webp',          class: 'Warrior' },
  { id: 'victor',      name: 'Victor',                        img: 'icon_victor.webp',           class: 'Guardian' },
  // Autres
  { id: 'baalghor',    name: "Baal'Ghor",                     img: 'icon_baalghor_oote.webp',   class: 'Autres' },
  // Wizard
  { id: 'aurora',      name: 'Aurora',                        img: 'icon_aurora.webp',           class: 'Wizard' },
  { id: 'aurora_lot',  name: 'Aurora, Legacy of Tempest',     img: 'icon_aurora_lot-2.webp',    class: 'Wizard' },
  { id: 'iyslander',   name: 'Iyslander',                     img: 'icon_iyslander.webp',        class: 'Wizard' },
  { id: 'kano',        name: 'Kano',                          img: 'icon_kano.webp',             class: 'Wizard' },
  { id: 'oscilio',     name: 'Oscilio',                       img: 'icon_oscillio.webp',         class: 'Wizard' },
  { id: 'oscilio_fc',  name: 'Oscilio, Forked Continuum',     img: 'icon_oscilio_fc-1.webp',    class: 'Wizard' },
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

const loadProfile = async (userId) => {
  const { data } = await _sb
    .from('profiles')
    .select('discord_pseudo, favorite_heroes')
    .eq('id', userId)
    .single();
  return {
    discord_pseudo: data?.discord_pseudo || '',
    favorite_heroes: Array.isArray(data?.favorite_heroes) ? data.favorite_heroes : [],
  };
};

const heroById = id => HEROES.find(h => h.id === id);

const renderProfileDisplay = (profile) => {
  const content = $('member-content');
  const discord = profile.discord_pseudo || '';
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
  const content   = $('member-content');
  const discordVal = (profile.discord_pseudo || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  content.innerHTML = `
    <div class="profile-card">
      <div class="profile-header">
        <h3>Modifier mon profil</h3>
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

  const { error } = await _sb
    .from('profiles')
    .update({ discord_pseudo, favorite_heroes })
    .eq('id', _currentUser.id);

  if (error) {
    setStatus('profile-status', error.message, true);
    btn.disabled = false;
    btn.textContent = 'Enregistrer';
    return;
  }

  renderProfileDisplay({ discord_pseudo, favorite_heroes });
};

/* ---- Auth UI ---- */

const showDashboard = async (user) => {
  _currentUser = user;
  $('auth-container').classList.add('hidden');
  $('member-dashboard').classList.remove('hidden');
  const pseudo = user.user_metadata?.pseudo || user.email;
  $('member-email').textContent = `Bonjour, ${pseudo} !`;
  const profile = await loadProfile(user.id);
  renderProfileDisplay(profile);
};

const showAuth = () => {
  _currentUser = null;
  $('auth-container').classList.remove('hidden');
  $('member-dashboard').classList.add('hidden');
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

  const pseudo   = $('signin-pseudo').value.trim();
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

  const pseudo   = $('signup-pseudo').value.trim();
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
