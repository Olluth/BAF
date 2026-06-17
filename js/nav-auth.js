'use strict';
(function () {
  const SUPABASE_URL = 'https://jpxmqrrmpeobrnrvvwsr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_fWVirSqQi5Zcm5mybNzbOg_SakIPpgl';

  const { createClient } = window.supabase;
  const _sb = createClient(SUPABASE_URL, SUPABASE_KEY);

  const updateNav = (user) => {
    const memberLink = document.getElementById('nav-member-link');
    const signinLink = document.getElementById('nav-signin-link');
    const signoutBtn = document.getElementById('nav-signout-btn');
    if (!memberLink || !signinLink || !signoutBtn) return;
    if (user) {
      memberLink.classList.remove('hidden');
      signinLink.classList.add('hidden');
      signoutBtn.classList.remove('hidden');
    } else {
      memberLink.classList.add('hidden');
      signinLink.classList.remove('hidden');
      signoutBtn.classList.add('hidden');
    }
  };

  document.getElementById('nav-signout-btn')?.addEventListener('click', async () => {
    await _sb.auth.signOut();
  });

  _sb.auth.onAuthStateChange((_event, session) => {
    updateNav(session?.user || null);
  });
})();
