'use strict';

const LANG_KEY = 'baf-lang';
const DEFAULT_LANG = 'fr';

const translations = {
  fr: {
    // Page titles
    'page.title.index': 'BAF TCG Association',
    'page.title.tournament': 'Suivi de tournoi | BAF TCG',
    'page.title.admin': 'Admin | BAF TCG',

    // Navigation
    'nav.about': 'À propos',
    'nav.events': 'Événements',
    'nav.news': 'Actualités',
    'nav.contact': 'Contact',
    'nav.tracker': 'Suivi de tournoi',

    // Hero
    'hero.eyebrow': 'Communauté Flesh and Blood',
    'hero.desc': 'Accompagner les joueurs, organiser des événements et célébrer la compétition Flesh and Blood.',
    'hero.cta': 'Voir le suivi de tournoi',
    'hero.card.title': 'Rejoindre la communauté',
    'hero.card.desc': 'Connectez-vous avec les joueurs locaux, suivez les classements en direct et restez informé des tournois à venir.',

    // About
    'about.eyebrow': 'À propos',
    'about.title': "L'Association",
    'about.desc': "BAF est une association communautaire pour les joueurs et organisateurs de Flesh and Blood. Nous aidons nos membres à trouver des événements, améliorer leurs compétences et profiter du jeu de cartes à travers une compétition structurée et conviviale.",

    // Events
    'events.eyebrow': 'À venir',
    'events.title': 'Événements à venir',
    'events.card1.title': 'Soirée de ligue mensuelle',
    'events.card1.desc': 'Vendredi, 19h00 au Game Hall. Pods Construit Standard et Draft disponibles.',
    'events.card2.title': 'Championnat régional',
    'events.card2.desc': 'Samedi, 14h00. Couverture en direct et classements disponibles sur le suivi de tournoi.',
    'events.card3.title': 'Rencontre des membres',
    'events.card3.desc': 'Dimanche, 13h00. Jeu libre, discussion de decks et moments forts des membres.',

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
    'contact.email.label': 'Email :',
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

    // Footer
    'footer.index': '© 2026 BAF TCG Association. Construit pour la communauté.',
    'footer.tournament': '© 2026 BAF TCG Association. Suivi en direct pour les membres.',

    // Tournament tracker — static HTML
    'tracker.eyebrow': 'Suivi',
    'tracker.title': 'Classements en direct',
    'tracker.desc': "Saisissez le slug de l'événement, la vue de couverture et le round pour charger les classements en direct de la couverture Flesh and Blood.",
    'tracker.slug.label': "Slug de l'événement",
    'tracker.slug.placeholder': 'exemple-regionals-2026',
    'tracker.view.label': 'Vue de couverture',
    'tracker.round.label': 'Round',
    'tracker.submit': 'Charger les classements',

    // Tournament tracker — JS strings
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
    'admin.tab.players': 'Joueurs',

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
  },

  en: {
    // Page titles
    'page.title.index': 'BAF TCG Association',
    'page.title.tournament': 'Tournament Tracker | BAF TCG',
    'page.title.admin': 'Admin | BAF TCG',

    // Navigation
    'nav.about': 'About',
    'nav.events': 'Events',
    'nav.news': 'News',
    'nav.contact': 'Contact',
    'nav.tracker': 'Tournament Tracker',

    // Hero
    'hero.eyebrow': 'Flesh and Blood Community',
    'hero.desc': 'Supporting players, organizing events, and celebrating competitive Flesh and Blood play.',
    'hero.cta': 'View Tournament Tracker',
    'hero.card.title': 'Join the community',
    'hero.card.desc': 'Connect with local players, follow live standings, and stay up to date with upcoming tournaments.',

    // About
    'about.eyebrow': 'About',
    'about.title': 'About the Association',
    'about.desc': 'BAF is a community-led association for Flesh and Blood players and organizers. We help members find events, improve their skills, and enjoy the trading card game through structured play and friendly competition.',

    // Events
    'events.eyebrow': 'Upcoming',
    'events.title': 'Upcoming Events',
    'events.card1.title': 'Monthly League Night',
    'events.card1.desc': 'Friday, 7:00 PM at the Game Hall. Standard Construct and Draft pods available.',
    'events.card2.title': 'Regional Championship',
    'events.card2.desc': 'Saturday, 2:00 PM. Live coverage and standings available on the tournament tracker.',
    'events.card3.title': 'Member Meet-Up',
    'events.card3.desc': 'Sunday, 1:00 PM. Open play, deck discussion, and member highlights.',

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
    'contact.email.label': 'Email:',
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

    // Footer
    'footer.index': '© 2026 BAF TCG Association. Built for the community.',
    'footer.tournament': '© 2026 BAF TCG Association. Live tracker for members.',

    // Tournament tracker — static HTML
    'tracker.eyebrow': 'Tracker',
    'tracker.title': 'Live Tournament Standings',
    'tracker.desc': 'Enter an event slug, coverage view, and round to load live standings from Flesh and Blood coverage.',
    'tracker.slug.label': 'Event Slug',
    'tracker.slug.placeholder': 'example-regionals-2026',
    'tracker.view.label': 'Coverage View',
    'tracker.round.label': 'Round',
    'tracker.submit': 'Load Standings',

    // Tournament tracker — JS strings
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
    'admin.tab.players': 'Players',

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
    'admin.players.title': 'Tracked Players',
    'admin.players.desc': 'Players listed here are highlighted on the Tournament Tracker page.',
    'admin.players.placeholder': 'Player name',
    'admin.players.add': 'Add Player',
    'admin.players.empty': 'No tracked players yet. Add one above.',
    'admin.players.remove': 'Remove',
    'admin.players.confirmRemove': 'Remove "{name}" from the tracked player list?',
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
});

window.t = t;
window.getLang = getLang;
window.applyTranslations = applyTranslations;
window.setLang = setLang;
