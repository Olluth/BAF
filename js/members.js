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
  $('member-email').textContent = user.email;
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

/* ---- Sign in ---- */

$('signin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('signin-btn');
  btn.disabled = true;
  btn.textContent = 'Connexion…';
  clearStatus('signin-status');

  const { error } = await _sb.auth.signInWithPassword({
    email:    $('signin-email').value.trim(),
    password: $('signin-password').value,
  });

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

  const { error } = await _sb.auth.signUp({
    email:    $('signup-email').value.trim(),
    password: $('signup-password').value,
    options:  { emailRedirectTo: `${location.origin}/members.html` },
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
