'use strict';

const SUPABASE_URL = 'https://jpxmqrrmpeobrnrvvwsr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_fWVirSqQi5Zcm5mybNzbOg_SakIPpgl';

const { createClient } = window.supabase;
const _sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);

/* ---- UI helpers ---- */

const setStatus = (id, msg, isError = false) => {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? '#fca5a5' : '#6ee7b7';
  el.classList.remove('hidden');
};

const clearStatus = id => $(id)?.classList.add('hidden');

const showDashboard = (user) => {
  $('auth-container').classList.add('hidden');
  $('member-dashboard').classList.remove('hidden');
  const pseudo = user.user_metadata?.pseudo || user.email;
  $('member-email').textContent = `Bonjour, ${pseudo} !`;
};

const showAuth = () => {
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

/* ---- Sign in (pseudo → look up email → signInWithPassword) ---- */

$('signin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('signin-btn');
  btn.disabled = true;
  btn.textContent = 'Connexion…';
  clearStatus('signin-status');

  const pseudo   = $('signin-pseudo').value.trim();
  const password = $('signin-password').value;

  // Look up email from pseudo
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

  // Check pseudo availability
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
