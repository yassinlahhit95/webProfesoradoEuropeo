// Fuentes servidas desde la propia web (sin Google Fonts: más rápido y sin enviar datos a terceros)
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';

import './styles/main.css';

import { initMenu } from './js/menu.js';
import { initActiveNav } from './js/active-nav.js';
import { initCatalog } from './js/catalog.js';
import { initContactForm } from './js/contact-form.js';

initMenu();
initActiveNav();
initCatalog();
initContactForm();

document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
});
