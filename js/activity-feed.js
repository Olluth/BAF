'use strict';
(function () {
  const SUPABASE_URL = 'https://jpxmqrrmpeobrnrvvwsr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_fWVirSqQi5Zcm5mybNzbOg_SakIPpgl';
  const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const timeAgo = (dateStr) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    const tr = window.t || ((k, v) => k);
    if (diff < 60)      return tr('feed.time.now');
    if (diff < 3600)    return tr('feed.time.minutes', { n: Math.floor(diff / 60) });
    if (diff < 86400)   return tr('feed.time.hours',   { n: Math.floor(diff / 3600) });
    if (diff < 2592000) return tr('feed.time.days',    { n: Math.floor(diff / 86400) });
    const lang = window.getLang ? window.getLang() : 'fr';
    return new Date(dateStr).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' });
  };

  const TIER_CLASS = { Silver: 'ach-tier-silver', Gold: 'ach-tier-gold', Diamond: 'ach-tier-diamond' };
  const TIER_LABELS = { fr: { Silver: 'Argent', Gold: 'Or', Diamond: 'Diamant' }, en: { Silver: 'Silver', Gold: 'Gold', Diamond: 'Diamond' } };

  let _cachedItems = [];

  const renderFeed = () => {
    const container = document.getElementById('activity-feed');
    if (!container) return;
    const tr = window.t || ((k) => k);

    if (!_cachedItems.length) {
      container.innerHTML = `<p class="feed-empty">${tr('feed.empty')}</p>`;
      return;
    }

    const lang = window.getLang ? window.getLang() : 'fr';
    const tierLabels = TIER_LABELS[lang] || TIER_LABELS.fr;

    container.innerHTML = _cachedItems.map(item => {
      if (item.type === 'member') {
        return `<div class="feed-item">
          <span class="feed-badge feed-badge-new">${tr('feed.badge.member')}</span>
          <span class="feed-text"><strong>${esc(item.pseudo)}</strong> ${tr('feed.member.joined')}</span>
          <span class="feed-time">${timeAgo(item.date)}</span>
        </div>`;
      }
      if (item.type === 'article') {
        return `<div class="feed-item">
          <span class="feed-badge feed-badge-article">${tr('feed.badge.article')}</span>
          <span class="feed-text"><strong>${esc(item.title)}</strong> ${tr('feed.article.published')}</span>
          <span class="feed-time">${timeAgo(item.date)}</span>
        </div>`;
      }
      const tierClass = TIER_CLASS[item.tier] || 'ach-tier-silver';
      const tierLabel = tierLabels[item.tier] || item.tier;
      return `<div class="feed-item">
        <span class="feed-badge ach-tier-badge ${tierClass}">${tierLabel}</span>
        <span class="feed-text"><strong>${esc(item.pseudo)}</strong> ${tr('feed.achievement.unlocked')} <strong>${esc(item.name)}</strong></span>
        <span class="feed-time">${timeAgo(item.date)}</span>
      </div>`;
    }).join('');
  };

  const loadFeed = async () => {
    const [membersData, achRes] = await Promise.all([
      fetch('/api/recent-members').then(r => r.ok ? r.json() : []).catch(() => []),
      _sb.from('member_achievements')
        .select('granted_at, profiles!member_id(pseudo), achievements!achievement_id(name, tier)')
        .order('granted_at', { ascending: false })
        .limit(15),
    ]);

    const items = [];

    (Array.isArray(membersData) ? membersData : []).forEach(m => {
      if (!m.pseudo) return;
      items.push({ date: m.created_at, type: 'member', pseudo: m.pseudo });
    });

    (achRes.data || []).forEach(a => {
      const pseudo = a.profiles?.pseudo;
      const name   = a.achievements?.name;
      const tier   = a.achievements?.tier || 'Silver';
      if (!pseudo || !name) return;
      items.push({ date: a.granted_at, type: 'achievement', pseudo, name, tier });
    });

    try {
      const artRes = await fetch('/api/articles');
      if (artRes.ok) {
        const articles = await artRes.json();
        (Array.isArray(articles) ? articles : []).forEach(a => {
          if (!a.title || !a.date) return;
          items.push({ date: a.date, type: 'article', title: a.title });
        });
      }
    } catch {}

    const members  = items.filter(i => i.type === 'member').sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
    const articles = items.filter(i => i.type === 'article').sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 2);
    const others   = items.filter(i => i.type !== 'member' && i.type !== 'article').sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
    _cachedItems = [...members, ...articles, ...others].sort((a, b) => new Date(b.date) - new Date(a.date));

    renderFeed();
  };

  loadFeed();
  document.addEventListener('langchange', renderFeed);
})();
