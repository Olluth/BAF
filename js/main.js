document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('contact-form');
  const formNote = document.getElementById('form-note');

  if (!contactForm || !formNote) return;

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    formNote.textContent = 'Thanks! Your message has been received. We will follow up shortly.';
    formNote.style.color = '#047857';
    contactForm.reset();
  });
});
