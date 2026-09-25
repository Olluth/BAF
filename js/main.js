/*
 * Shared helpers for index.html, news.html and contact.html:
 * the contact form and the news list.
 */

document.addEventListener('DOMContentLoaded', () => {
  initContactForm();
  loadNewsFromStorage();
});

// Contact form: shows a confirmation message and clears the form.
// Note: nothing is actually sent anywhere (no backend endpoint yet).
const initContactForm = () => {
  const contactForm = document.getElementById('contact-form');
  const formNote = document.getElementById('form-note');

  if (!contactForm || !formNote) return;

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    formNote.textContent = t('contact.form.success');
    formNote.style.color = '#047857';
    contactForm.reset();
  });
};

// Replaces the static news list with articles saved from the admin page.
// Reads the browser's localStorage, so it only shows them in the admin's own browser;
// other visitors keep the static HTML content.
const loadNewsFromStorage = () => {
  const newsList = document.getElementById('news-list');
  if (!newsList) return;

  try {
    const raw = localStorage.getItem('baf-articles');
    if (!raw) return;
    const articles = JSON.parse(raw);
    if (!Array.isArray(articles) || !articles.length) return;

    const published = articles.filter((a) => a.published);
    if (!published.length) return;

    newsList.innerHTML = '';
    published.forEach((article) => {
      const item = document.createElement('article');
      item.className = 'news-item';

      const title = document.createElement('h3');
      title.textContent = article.title;

      const meta = document.createElement('p');
      meta.className = 'news-meta';
      meta.textContent = article.date;

      const body = document.createElement('p');
      body.textContent = article.excerpt || article.content.substring(0, 200);

      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(body);
      newsList.appendChild(item);
    });
  } catch {
    // Conserver le contenu statique en cas d'erreur
  }
};
