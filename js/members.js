'use strict';

const SUPABASE_URL = 'https://jpxmqrrmpeobrnrvvwsr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fWVirSqQi5Zcm5mybNzbOg_SakIPpgl';

const { createClient } = window.supabase;
const _sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);

/* ---- Hero data ---- */

const HEROES = [
  { id: 'arakni_m',    name: 'Arakni, Marionette',            img: 'icon_arakni_m.webp' },
  { id: 'arakni_sttc', name: 'Arakni, Sow the Seeds',         img: 'icon_arakni_sttc-1.webp' },
  { id: 'arakni_th',   name: 'Arakni, Thousand Hands',        img: 'icon_arakni_th-1.webp' },
  { id: 'aurora',      name: 'Aurora',                         img: 'icon_aurora.webp' },
  { id: 'aurora_lot',  name: 'Aurora, Legacy of Tempest',      img: 'icon_aurora_lot-2.webp' },
  { id: 'azalea',      name: 'Azalea',                         img: 'icon_azalea.webp' },
  { id: 'baalghor',    name: "Baal'Ghor",                      img: 'icon_baalghor_oote.webp' },
  { id: 'benji',       name: 'Benji',                          img: 'icon_benji.webp' },
  { id: 'betsy',       name: 'Betsy',                          img: 'icon_betsy.webp' },
  { id: 'blaze',       name: 'Blaze',                          img: 'icon_blaze.webp' },
  { id: 'boltyn',      name: 'Boltyn',                         img: 'icon_boltyn.webp' },
  { id: 'bravo_s',     name: 'Bravo, Showstopper',             img: 'icon_bravo_s.webp' },
  { id: 'bravo_fs',    name: 'Bravo, Forceful Sovereign',      img: 'icon_bravo_fs.webp' },
  { id: 'bravo_sots',  name: 'Bravo, Strength of Spoils',      img: 'icon_bravo_sots.webp' },
  { id: 'brevant',     name: 'Brevant',                        img: 'icon_brevant.webp' },
  { id: 'briar',       name: 'Briar',                          img: 'icon_briar.webp' },
  { id: 'chane',       name: 'Chane',                          img: 'icon_chane.webp' },
  { id: 'cindra',      name: 'Cindra',                         img: 'icon_cindra.webp' },
  { id: 'dash_ie',     name: 'Dash, Inventor Extraordinaire',  img: 'icon_dash_ie.webp' },
  { id: 'dash_io',     name: 'Dash, Into Oblivion',            img: 'icon_dash_io.webp' },
  { id: 'datadoll',    name: 'Data Doll',                      img: 'icon_datadoll.webp' },
  { id: 'dorinthea',   name: 'Dorinthea',                      img: 'icon_dorinthea.webp' },
  { id: 'dromai',      name: 'Dromai',                         img: 'icon_dromai.webp' },
  { id: 'emperor',     name: 'Emperor',                        img: 'icon_emperor.webp' },
  { id: 'enigma',      name: 'Enigma',                         img: 'icon_enigma.webp' },
  { id: 'fai',         name: 'Fai',                            img: 'icon_fai.webp' },
  { id: 'fang',        name: 'Fang',                           img: 'icon_fang.webp' },
  { id: 'florian',     name: 'Florian',                        img: 'icon_florian.webp' },
  { id: 'frankie',     name: 'Frankie',                        img: 'icon_frankie.webp' },
  { id: 'genis',       name: 'Genis',                          img: 'icon_genis.webp' },
  { id: 'gravybones',  name: 'Gravy Bones',                    img: 'icon_gravybones.webp' },
  { id: 'hala',        name: 'Hala',                           img: 'icon_hala_pos.webp' },
  { id: 'ira',         name: 'Ira',                            img: 'icon_ira.webp' },
  { id: 'iyslander',   name: 'Iyslander',                      img: 'icon_iyslander.webp' },
  { id: 'jarl',        name: 'Jarl',                           img: 'icon_jarl.webp' },
  { id: 'kano',        name: 'Kano',                           img: 'icon_kano.webp' },
  { id: 'kassai_cs',   name: 'Kassai, Cintari Sellsword',      img: 'icon_kassai_cs.webp' },
  { id: 'kassai_gs',   name: 'Kassai of Goldsteel',            img: 'icon_kassai_gs.webp' },
  { id: 'katsu',       name: 'Katsu',                          img: 'icon_katsu.webp' },
  { id: 'kavdaen',     name: 'Kavdaen',                        img: 'icon_kavdaen.webp' },
  { id: 'kayo_ad',     name: 'Kayo, Armed Diplomacy',          img: 'icon_kayo_ad.webp' },
  { id: 'kayo_br',     name: 'Kayo, Berserker Runt',           img: 'icon_kayo_br_resized.png' },
  { id: 'kayo_uc',     name: 'Kayo, Unwanted Cargo',           img: 'icon_kayo_uc-2.webp' },
  { id: 'levia',       name: 'Levia',                          img: 'icon_levia.webp' },
  { id: 'lexi',        name: 'Lexi',                           img: 'icon_lexi.webp' },
  { id: 'lyath',       name: 'Lyath',                          img: 'icon_lyath-2.webp' },
  { id: 'marlynn',     name: 'Marlynn',                        img: 'icon_marlynn.webp' },
  { id: 'maxxnitro',   name: 'Maxx Nitro',                     img: 'icon_maxxnitro.webp' },
  { id: 'melody',      name: 'Melody',                         img: 'icon_melody.webp' },
  { id: 'nuu',         name: 'Nuu',                            img: 'icon_nuu.webp' },
  { id: 'oldhim',      name: 'Oldhim',                         img: 'icon_oldhim-1.webp' },
  { id: 'olympia',     name: 'Olympia',                        img: 'icon_olympia.webp' },
  { id: 'oscilio',     name: 'Oscilio',                        img: 'icon_oscillio.webp' },
  { id: 'oscilio_fc',  name: 'Oscilio, Forked Continuum',      img: 'icon_oscilio_fc-1.webp' },
  { id: 'pleiades',    name: 'Pleiades',                       img: 'icon_pleiades-1.webp' },
  { id: 'prism_soa',   name: 'Prism, Sculptor of Arc Light',   img: 'icon_prism_soa.webp' },
  { id: 'prism_aos',   name: 'Prism, Advent of Thrones',       img: 'icon_prism_aos.webp' },
  { id: 'puffin',      name: 'Puffin',                         img: 'icon_puffin.webp' },
  { id: 'rhinar',      name: 'Rhinar',                         img: 'icon_rhinar_rr-1.webp' },
  { id: 'riptide',     name: 'Riptide',                        img: 'icon_riptide.webp' },
  { id: 'scurv',       name: 'Scurv',                          img: 'icon_scurv.webp' },
  { id: 'shiyana',     name: 'Shiyana',                        img: 'icon_shiyana.webp' },
  { id: 'teklovossen', name: 'Teklovossen',                    img: 'icon_teklovossen.webp' },
  { id: 'terra',       name: 'Terra',                          img: 'icon_terra.webp' },
  { id: 'tuffnut',     name: 'Tuffnut',                        img: 'icon_tuffnut-1.webp' },
  { id: 'uzuri',       name: 'Uzuri',                          img: 'icon_uzuri.webp' },
  { id: 'valda',       name: 'Valda',                          img: 'icon_valda.webp' },
  { id: 'verdance',    name: 'Verdance',                       img: 'icon_verdance.webp' },
  { id: 'victor',      name: 'Victor',                         img: 'icon_victor.webp' },
  { id: 'viserai',     name: 'Viserai',                        img: 'icon_viserai.webp' },
  { id: 'vynnset',     name: 'Vynnset',                        img: 'icon_vynnset.webp' },
  { id: 'yoji',        name: 'Yoji',                           img: 'icon_yoji.webp' },
  { id: 'zen',         name: 'Zen',                            img: 'icon_zen.webp' },
  { id: 'zyggy',       name: 'Zyggy',                          img: 'icon_zyggy-1.webp' },
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
  const heroes = (profile.favorite_heroes || []).map(heroById).filter(Boolean);

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
  const content = $('member-content');
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

  $('profile-save-btn').addEventListener('click', () => saveProfile());
  $('profile-cancel-btn').addEventListener('click', () => renderProfileDisplay(profile));
};

const renderHeroPicker = () => {
  const picker = $('hero-picker');
  picker.innerHTML = HEROES.map(h => {
    const sel   = _selectedHeroes.includes(h.id);
    const maxed = !sel && _selectedHeroes.length >= 3;
    return `<div class="hero-card${sel ? ' selected' : ''}${maxed ? ' maxed' : ''}"
      data-id="${h.id}" role="checkbox" aria-checked="${sel}" tabindex="0">
      <img src="images/${h.img}" alt="${h.name}" loading="lazy" />
      <span class="hero-name">${h.name}</span>
      <span class="hero-check" aria-hidden="true">✓</span>
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

  const discord_pseudo   = $('edit-discord').value.trim();
  const favorite_heroes  = _selectedHeroes;

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
