'use strict';

const LANG_KEY = 'baf-lang';
const DEFAULT_LANG = 'fr';

const translations = {
  fr: {
    // Page titles
    'page.title.index': 'BAF TCG Association',
    'page.title.about': 'La BAF | BAF TCG',
    'page.title.events': 'Événements | BAF TCG',
    'page.title.news': 'Actualités | BAF TCG',
    'page.title.contact': 'Contact | BAF TCG',
    'page.title.resources': 'Ressources | BAF TCG',
    'page.title.tournament': 'Suivi de tournoi | BAF TCG',
    'page.title.admin': 'Admin | BAF TCG',

    // Navigation
    'nav.about': "L'Asso",
    'nav.events': 'Événements',
    'nav.news': 'Actualités',
    'nav.resources': 'Ressources',
    'nav.contact': 'Contact',
    'nav.tracker': 'Suivi de tournoi',

    // Hero
    'hero.eyebrow': 'Communauté Flesh and Blood',
    'hero.desc': 'Accompagner les joueurs, organiser des événements et célébrer la compétition Flesh and Blood.',
    'hero.cta': 'Voir le suivi de tournoi',
    'hero.card.title': 'Rejoindre la communauté',
    'hero.card.desc': 'Connectez-vous avec les joueurs locaux, suivez les classements en direct et restez informé des tournois à venir.',

    // About
    'about.eyebrow': 'Association',
    'about.title': 'La BAF',
    'about.desc': "BAF est une association communautaire dédiée aux joueurs et passionnés de Flesh and Blood. Nous organisons des événements réguliers — des Armories hebdomadaires aux grands tournois nationaux — et fédérons une communauté de joueurs compétitifs et amateurs.",
    'about.join.title': 'Rejoindre la BAF',
    'about.join.desc': "Participez à nos événements hebdomadaires ou contactez-nous pour en savoir plus sur l'adhésion à l'association.",
    'about.join.cta': 'Nous contacter',

    // Events
    'events.eyebrow': 'Événements',
    'events.title': 'Événements',
    'events.next': 'Prochain grand événement',
    'events.weekly': 'Rendez-vous hebdomadaires',
    'events.card1.title': 'France National',
    'events.card1.desc': '26–28 juin 2026 · Partenaire : Uchronies Games.',
    'events.card2.title': 'Armory du mardi',
    'events.card2.desc': 'Chaque mardi à 19h30 — Decaféine',
    'events.card3.title': 'Armory du jeudi',
    'events.card3.desc': 'Chaque jeudi à 19h30 — Artefact',
    'events.card4.title': 'Jeu libre SAGE',
    'events.card4.desc': 'Chaque vendredi à 19h30 — Artefact',

    // News
    'news.eyebrow': 'Actualités',
    'news.title': 'Dernières actualités',
    'news.item1.title': 'Classements en direct disponibles',
    'news.item1.desc': 'Suivez nos membres pendant les tournois avec le flux de classements en direct. Mettez en avant vos joueurs préférés et restez informé.',
    'news.item2.title': 'Nouveaux avantages membres',
    'news.item2.desc': "Les membres bénéficient désormais de sessions de construction de deck exclusives, de cartes promo et de réductions sur les inscriptions aux tournois.",

    // Contact
    'contact.eyebrow': 'Contact',
    'contact.title': 'Nous contacter',
    'contact.desc': "Pour rejoindre BAF, organiser un événement ou poser vos questions sur l'adhésion, envoyez-nous un message ou contactez-nous sur les réseaux sociaux.",
    'contact.instagram.label': 'Instagram :',
    'contact.discord.label': 'Discord :',
    'contact.venue.label': 'Lieu :',
    'contact.venue.value': 'Central Game Club, Centre-ville',
    'contact.form.name.label': 'Nom',
    'contact.form.name.placeholder': 'Votre nom',
    'contact.form.email.label': 'Email',
    'contact.form.email.placeholder': 'vous@exemple.com',
    'contact.form.message.label': 'Message',
    'contact.form.message.placeholder': 'Comment pouvons-nous vous aider ?',
    'contact.form.submit': 'Envoyer',
    'contact.form.success': 'Merci ! Votre message a bien été reçu. Nous vous répondrons rapidement.',

    // Resources
    'resources.eyebrow': 'Liens utiles',
    'resources.title': 'Ressources',
    'resources.desc': 'Retrouvez ici les liens essentiels pour les joueurs de Flesh and Blood.',
    'resources.official.title': 'Site officiel Flesh and Blood',
    'resources.official.desc': 'Actualités, lore, règles et calendrier des tournois officiels.',
    'resources.rules.title': 'Règles et politiques',
    'resources.rules.desc': 'Règles complètes, FAQ et documents de politique de tournoi.',
    'resources.cards.title': 'Base de données des cartes',
    'resources.cards.desc': 'Recherchez, filtrez et explorez toutes les cartes Flesh and Blood.',
    'resources.events.title': 'Calendrier des événements',
    'resources.events.desc': 'Tournois officiels, Armories et événements organisés par la communauté.',

    // Footer
    'footer.index': '© 2026 BAF TCG Association. Construit pour la communauté.',
    'footer.tournament': '© 2026 BAF TCG Association. Suivi en direct pour les membres.',

    // Tournament tracker — static HTML
    'tracker.eyebrow': 'Suivi',
    'tracker.title': 'Classements en direct',
    'tracker.desc': 'Sélectionnez un événement pour charger les classements. Cliquez sur un joueur pour voir son historique de rondes.',
    'tracker.event.label': 'Événement',
    'tracker.event.placeholder': 'Sélectionner un événement…',
    'tracker.event.empty': 'Aucun événement configuré.',
    'tracker.noEvents': 'Aucun événement configuré pour le moment. Revenez bientôt !',

    // Tournament tracker — JS strings
    'tracker.round.detecting': 'Détection du round en cours…',
    'tracker.noPlayers': 'Aucun joueur suivi configuré pour le moment.',
    'tracker.trackedTitle': 'Joueurs suivis',
    'tracker.noStandings': 'Aucune donnée de classement disponible pour ce round.',
    'tracker.col.rank': 'Rang',
    'tracker.col.player': 'Joueur',
    'tracker.col.hero': 'Héros',
    'tracker.col.opponent': 'Adversaire',
    'tracker.col.score': 'Score',
    'tracker.col.record': 'Bilan',
    'tracker.loading': 'Chargement des classements…',
    'tracker.loadError': 'Impossible de charger les données',
    'tracker.formatError': "Le format des classements n'est pas pris en charge par le tracker.",
    'tracker.loaded': '{count} joueur suivi mis en avant.',
    'tracker.loaded.plural': '{count} joueurs suivis mis en avant.',
    'tracker.fetchError': 'Erreur lors du chargement des classements :',
    'tracker.networkError': "Impossible de charger les classements en direct. Vérifiez le slug de l'événement, la vue et le round, ou vérifiez l'accès réseau au point de couverture.",
    'tracker.viewFallback': 'Vue alternative utilisée: {view}',
    'tracker.fillFields': 'Veuillez remplir tous les champs du tracker.',
    'tracker.noTrackedFound': 'Aucun joueur suivi trouvé dans les classements actuels.',
    'tracker.card.rank': 'Rang actuel',
    'tracker.card.hero': 'Héros',
    'tracker.card.opponent': 'Adversaire',
    'tracker.card.score': 'Score',
    'tracker.card.record': 'Bilan',
    'tracker.card.round': 'Round',
    'tracker.unknown': 'Inconnu',
    'tracker.tbd': 'À définir',
    'tracker.coverage.heading': 'Couverture en direct',
    'tracker.coverage.external': 'Ouvrir ↗',
    'tracker.col.result': 'Résultat',
    'tracker.col.liveRound': 'Ronde en cours',
    'tracker.result.win': 'Victoire',
    'tracker.result.loss': 'Défaite',
    'tracker.result.draw': 'Nul',
    'tracker.result.ongoing': 'En cours',
    'tracker.openCoverage': 'Voir sur fabtcg.com ↗',
    'tracker.roundsLoaded': '{done}/{total} rondes chargées…',
    'tracker.vs': 'vs',
    'tracker.updated': 'Mis à jour il y a {min}m',
    'tracker.dropped': 'Abandon',

    // Activity feed
    'feed.badge.member': 'Membre',
    'feed.badge.article': 'Article',
    'feed.member.joined': 'a rejoint la BAF !',
    'feed.article.published': 'a été publié',
    'feed.achievement.unlocked': 'a obtenu',
    'feed.empty': 'Aucune activité récente.',
    'feed.time.now': 'à l\'instant',
    'feed.time.minutes': 'il y a {n} min',
    'feed.time.hours': 'il y a {n} h',
    'feed.time.days': 'il y a {n} j',

    // Admin — login
    'admin.login.username': "Nom d'utilisateur",
    'admin.login.password': 'Mot de passe',
    'admin.login.submit': 'Se connecter',
    'admin.login.submitting': 'Connexion en cours…',
    'admin.login.error': "Nom d'utilisateur ou mot de passe incorrect.",

    // Admin — dashboard header
    'admin.viewsite': 'Voir le site',
    'admin.logout': 'Déconnexion',

    // Admin — tabs
    'admin.tab.articles': 'Articles',
    'admin.tab.players': 'Joueurs suivis',
    'admin.tab.events': 'Événements',
    'admin.tab.members': 'Membres',
    'admin.tab.achievements': 'Hauts faits',
    'admin.tab.analytics': 'Analytics',

    // Admin — events panel
    'admin.events.title': 'Événements suivis',
    'admin.events.desc': "Les événements listés ici apparaissent dans le sélecteur de la page de suivi.",
    'admin.events.new': '+ Nouvel événement',
    'admin.events.empty': "Aucun événement configuré. Cliquez sur « + Nouvel événement » pour en ajouter un.",
    'admin.events.form.new': 'Nouvel événement',
    'admin.events.form.edit': "Modifier l'événement",
    'admin.events.name.label': 'Nom affiché',
    'admin.events.name.placeholder': 'Ex : Championnats de France 2026',
    'admin.events.slug.label': "Slug de l'événement",
    'admin.events.slug.placeholder': 'national-championship-2026-france',
    'admin.events.view.label': 'Vue de couverture',
    'admin.events.active.label': 'Afficher dans le sélecteur',
    'admin.events.setDefault': '★ Défaut',
    'admin.events.edit': 'Modifier',
    'admin.events.delete': 'Supprimer',
    'admin.events.confirmDelete': 'Supprimer définitivement cet événement ?',
    'admin.events.save': 'Enregistrer',
    'admin.events.cancel': 'Annuler',

    // Admin — proxy config
    'admin.proxy.label': 'Proxy CORS personnalisé (optionnel)',
    'admin.proxy.desc': "Si tous les proxies publics échouent, entrez l'URL de votre propre proxy ici.",
    'admin.proxy.placeholder': 'https://…/?url=',
    'admin.proxy.save': 'Enregistrer',
    'admin.proxy.clear': 'Effacer',
    'admin.proxy.saved': 'Proxy enregistré.',
    'admin.proxy.cleared': 'Proxy effacé.',

    // Admin — articles panel
    'admin.articles.title': 'Articles',
    'admin.articles.new': '+ Nouvel article',
    'admin.articles.empty': 'Aucun article pour le moment. Cliquez sur « + Nouvel article » pour en créer un.',
    'admin.articles.form.new': 'Nouvel article',
    'admin.articles.form.edit': "Modifier l'article",
    'admin.form.title.label': 'Titre',
    'admin.form.title.placeholder': "Titre de l'article",
    'admin.form.excerpt.label': 'Extrait',
    'admin.form.excerpt.placeholder': "Courte description affichée sur la page d'accueil (facultatif)",
    'admin.form.content.label': 'Contenu',
    'admin.form.content.placeholder': "Contenu complet de l'article",
    'admin.form.save': 'Enregistrer',
    'admin.form.cancel': 'Annuler',
    'admin.articles.edit': 'Modifier',
    'admin.articles.delete': 'Supprimer',
    'admin.articles.confirmDelete': 'Supprimer définitivement cet article ?',

    // Admin — players panel
    'admin.players.title': 'Joueurs suivis',
    'admin.players.desc': 'Les joueurs listés ici sont mis en avant sur la page de suivi de tournoi.',
    'admin.players.placeholder': 'Nom du joueur',
    'admin.players.add': 'Ajouter',
    'admin.players.empty': 'Aucun joueur suivi pour le moment. Ajoutez-en un ci-dessus.',
    'admin.players.remove': 'Retirer',
    'admin.players.confirmRemove': '« {name} » sera retiré de la liste des joueurs suivis. Confirmer ?',
    'admin.members.title': 'Membres',
    'admin.achievements.title': 'Hauts faits',
    'admin.analytics.title': 'Analytics',
  },

  en: {
    // Page titles
    'page.title.index': 'BAF TCG Association',
    'page.title.about': 'La BAF | BAF TCG',
    'page.title.events': 'Events | BAF TCG',
    'page.title.news': 'News | BAF TCG',
    'page.title.contact': 'Contact | BAF TCG',
    'page.title.resources': 'Resources | BAF TCG',
    'page.title.tournament': 'Tournament Tracker | BAF TCG',
    'page.title.admin': 'Admin | BAF TCG',

    // Navigation
    'nav.about': "L'Asso",
    'nav.events': 'Events',
    'nav.news': 'News',
    'nav.resources': 'Resources',
    'nav.contact': 'Contact',
    'nav.tracker': 'Tournament Tracker',

    // Hero
    'hero.eyebrow': 'Flesh and Blood Community',
    'hero.desc': 'Supporting players, organizing events, and celebrating competitive Flesh and Blood play.',
    'hero.cta': 'View Tournament Tracker',
    'hero.card.title': 'Join the community',
    'hero.card.desc': 'Connect with local players, follow live standings, and stay up to date with upcoming tournaments.',

    // About
    'about.eyebrow': 'Association',
    'about.title': 'La BAF',
    'about.desc': 'BAF is a community association dedicated to Flesh and Blood players and enthusiasts. We organize regular events — from weekly Armories to national championships — and bring together a community of competitive and casual players.',
    'about.join.title': 'Join La BAF',
    'about.join.desc': 'Come join us at our weekly events or reach out to learn more about becoming a member of the association.',
    'about.join.cta': 'Get in Touch',

    // Events
    'events.eyebrow': 'Events',
    'events.title': 'Events',
    'events.next': 'Next major event',
    'events.weekly': 'Weekly events',
    'events.card1.title': 'French Nationals',
    'events.card1.desc': 'June 26–28, 2026 · Partner: Uchronies Games.',
    'events.card2.title': 'Tuesday Armory',
    'events.card2.desc': 'Every Tuesday at 7:30 PM — Decaféine',
    'events.card3.title': 'Thursday Armory',
    'events.card3.desc': 'Every Thursday at 7:30 PM — Artefact',
    'events.card4.title': 'SAGE Freeplay',
    'events.card4.desc': 'Every Friday at 7:30 PM — Artefact',

    // News
    'news.eyebrow': 'News',
    'news.title': 'Latest News',
    'news.item1.title': 'Live standings now available',
    'news.item1.desc': 'Track our members during tournaments with the live standings feed. Highlight your favorite players and stay updated.',
    'news.item2.title': 'New membership benefits',
    'news.item2.desc': 'Members now receive exclusive deckbuilding sessions, promo cards, and tournament registration discounts.',

    // Contact
    'contact.eyebrow': 'Contact',
    'contact.title': 'Get in Touch',
    'contact.desc': 'If you want to join BAF, organize an event, or ask about membership, send us a message or connect on social channels.',
    'contact.instagram.label': 'Instagram:',
    'contact.discord.label': 'Discord:',
    'contact.venue.label': 'Venue:',
    'contact.venue.value': 'Central Game Club, Downtown',
    'contact.form.name.label': 'Name',
    'contact.form.name.placeholder': 'Your name',
    'contact.form.email.label': 'Email',
    'contact.form.email.placeholder': 'you@example.com',
    'contact.form.message.label': 'Message',
    'contact.form.message.placeholder': 'How can we help?',
    'contact.form.submit': 'Send Message',
    'contact.form.success': 'Thanks! Your message has been received. We will follow up shortly.',

    // Resources
    'resources.eyebrow': 'Useful links',
    'resources.title': 'Resources',
    'resources.desc': 'Essential links for Flesh and Blood players.',
    'resources.official.title': 'Official Flesh and Blood site',
    'resources.official.desc': 'News, lore, rules, and official tournament calendar.',
    'resources.rules.title': 'Rules and policy',
    'resources.rules.desc': 'Complete rulebook, FAQ, and tournament policy documents.',
    'resources.cards.title': 'Card database',
    'resources.cards.desc': 'Search, filter, and browse all Flesh and Blood cards.',
    'resources.events.title': 'Event calendar',
    'resources.events.desc': 'Official tournaments, Armories, and community-run events.',

    // Footer
    'footer.index': '© 2026 BAF TCG Association. Built for the community.',
    'footer.tournament': '© 2026 BAF TCG Association. Live tracker for members.',

    // Tournament tracker — static HTML
    'tracker.eyebrow': 'Tracker',
    'tracker.title': 'Live Tournament Standings',
    'tracker.desc': 'Select an event to load live standings. Click a player to view their round-by-round history.',
    'tracker.event.label': 'Event',
    'tracker.event.placeholder': 'Select an event…',
    'tracker.event.empty': 'No events configured.',
    'tracker.noEvents': 'No events configured yet. Check back soon!',

    // Tournament tracker — JS strings
    'tracker.round.detecting': 'Detecting current round…',
    'tracker.noPlayers': 'No tracked players configured yet.',
    'tracker.trackedTitle': 'Tracked Players',
    'tracker.noStandings': 'No standings data available for this round.',
    'tracker.col.rank': 'Rank',
    'tracker.col.player': 'Player',
    'tracker.col.hero': 'Hero',
    'tracker.col.opponent': 'Opponent',
    'tracker.col.score': 'Score',
    'tracker.col.record': 'Record',
    'tracker.loading': 'Loading standings…',
    'tracker.loadError': 'Unable to load data',
    'tracker.formatError': 'Standings format is not supported by the tracker.',
    'tracker.loaded': '{count} tracked player highlighted.',
    'tracker.loaded.plural': '{count} tracked players highlighted.',
    'tracker.fetchError': 'Error loading standings:',
    'tracker.networkError': 'Unable to load live standings. Verify the event slug, view, and round, or check network access to the coverage endpoint.',
    'tracker.viewFallback': 'Fallback view used: {view}',
    'tracker.fillFields': 'Please fill in all tracker fields.',
    'tracker.noTrackedFound': 'No tracked players found in the current standings.',
    'tracker.card.rank': 'Current Rank',
    'tracker.card.hero': 'Hero',
    'tracker.card.opponent': 'Opponent',
    'tracker.card.score': 'Score',
    'tracker.card.record': 'Record',
    'tracker.card.round': 'Round',
    'tracker.unknown': 'Unknown',
    'tracker.tbd': 'TBD',
    'tracker.coverage.heading': 'Live Coverage',
    'tracker.coverage.external': 'Open ↗',
    'tracker.col.result': 'Result',
    'tracker.col.liveRound': 'Ongoing round',
    'tracker.result.win': 'Win',
    'tracker.result.loss': 'Loss',
    'tracker.result.draw': 'Draw',
    'tracker.result.ongoing': 'In progress',
    'tracker.openCoverage': 'View on fabtcg.com ↗',
    'tracker.roundsLoaded': '{done}/{total} rounds loaded…',
    'tracker.vs': 'vs',
    'tracker.updated': 'Updated {min}m ago',
    'tracker.dropped': 'Dropped',

    // Activity feed
    'feed.badge.member': 'Member',
    'feed.badge.article': 'Article',
    'feed.member.joined': 'joined the BAF!',
    'feed.article.published': 'was published',
    'feed.achievement.unlocked': 'unlocked',
    'feed.empty': 'No recent activity.',
    'feed.time.now': 'just now',
    'feed.time.minutes': '{n}m ago',
    'feed.time.hours': '{n}h ago',
    'feed.time.days': '{n}d ago',

    // Admin — login
    'admin.login.username': 'Username',
    'admin.login.password': 'Password',
    'admin.login.submit': 'Sign in',
    'admin.login.submitting': 'Signing in…',
    'admin.login.error': 'Invalid username or password.',

    // Admin — dashboard header
    'admin.viewsite': 'View Site',
    'admin.logout': 'Logout',

    // Admin — tabs
    'admin.tab.articles': 'Articles',
    'admin.tab.players': 'Focused Players',
    'admin.tab.events': 'Events',
    'admin.tab.members': 'Members',
    'admin.tab.achievements': 'Achievements',
    'admin.tab.analytics': 'Analytics',

    // Admin — events panel
    'admin.events.title': 'Tracked Events',
    'admin.events.desc': 'Events listed here appear in the tournament tracker page selector.',
    'admin.events.new': '+ New Event',
    'admin.events.empty': 'No events configured. Click "+ New Event" to add one.',
    'admin.events.form.new': 'New Event',
    'admin.events.form.edit': 'Edit Event',
    'admin.events.name.label': 'Display name',
    'admin.events.name.placeholder': 'e.g. French Nationals 2026',
    'admin.events.slug.label': 'Event slug',
    'admin.events.slug.placeholder': 'national-championship-2026-france',
    'admin.events.view.label': 'Coverage view',
    'admin.events.active.label': 'Show in selector',
    'admin.events.setDefault': '★ Set as default',
    'admin.events.edit': 'Edit',
    'admin.events.delete': 'Delete',
    'admin.events.confirmDelete': 'Permanently delete this event?',
    'admin.events.save': 'Save',
    'admin.events.cancel': 'Cancel',

    // Admin — proxy config
    'admin.proxy.label': 'Custom CORS proxy (optional)',
    'admin.proxy.desc': 'If all public proxies fail, enter your own proxy URL here.',
    'admin.proxy.placeholder': 'https://…/?url=',
    'admin.proxy.save': 'Save',
    'admin.proxy.clear': 'Clear',
    'admin.proxy.saved': 'Proxy saved.',
    'admin.proxy.cleared': 'Proxy cleared.',

    // Admin — articles panel
    'admin.articles.title': 'Articles',
    'admin.articles.new': '+ New Article',
    'admin.articles.empty': 'No articles yet. Click "+ New Article" to create one.',
    'admin.articles.form.new': 'New Article',
    'admin.articles.form.edit': 'Edit Article',
    'admin.form.title.label': 'Title',
    'admin.form.title.placeholder': 'Article title',
    'admin.form.excerpt.label': 'Excerpt',
    'admin.form.excerpt.placeholder': 'Short description shown on the homepage (optional)',
    'admin.form.content.label': 'Content',
    'admin.form.content.placeholder': 'Full article content',
    'admin.form.save': 'Save',
    'admin.form.cancel': 'Cancel',
    'admin.articles.edit': 'Edit',
    'admin.articles.delete': 'Delete',
    'admin.articles.confirmDelete': 'Permanently delete this article?',

    // Admin — players panel
    'admin.players.title': 'Focused Players',
    'admin.players.desc': 'Players listed here are highlighted on the Tournament Tracker page.',
    'admin.players.placeholder': 'Player name',
    'admin.players.add': 'Add',
    'admin.players.empty': 'No focused players yet. Add one above.',
    'admin.players.remove': 'Remove',
    'admin.players.confirmRemove': 'Remove "{name}" from the focused player list?',
    'admin.members.title': 'Members',
    'admin.achievements.title': 'Achievements',
    'admin.analytics.title': 'Analytics',
  },
};

// --- Core ---

const getLang = () => localStorage.getItem(LANG_KEY) || DEFAULT_LANG;

const t = (key, vars = {}) => {
  const lang = getLang();
  let str = translations[lang]?.[key] ?? translations[DEFAULT_LANG][key] ?? key;
  Object.entries(vars).forEach(([k, v]) => {
    str = str.replace(`{${k}}`, v);
  });
  return str;
};

const applyTranslations = (lang = getLang()) => {
  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const value = translations[lang]?.[el.dataset.i18n];
    if (value !== undefined) el.textContent = value;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const value = translations[lang]?.[el.dataset.i18nPlaceholder];
    if (value !== undefined) el.placeholder = value;
  });

  document.querySelectorAll('.lang-toggle').forEach((btn) => {
    btn.textContent = lang === 'fr' ? 'EN' : 'FR';
  });
};

const setLang = (lang) => {
  localStorage.setItem(LANG_KEY, lang);
  applyTranslations(lang);
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
};

// --- Init ---

document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();

  document.querySelectorAll('.lang-toggle').forEach((btn) => {
    btn.addEventListener('click', () => setLang(getLang() === 'fr' ? 'en' : 'fr'));
  });

  const navToggle = document.getElementById('nav-toggle');
  const siteNav = document.querySelector('.site-header .site-nav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const open = siteNav.classList.toggle('open');
      navToggle.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', String(open));
    });
    siteNav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        siteNav.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
});

window.t = t;
window.getLang = getLang;
window.applyTranslations = applyTranslations;
window.setLang = setLang;
