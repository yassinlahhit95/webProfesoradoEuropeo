// Marca en el menú dónde está la persona:
// - en otras páginas, el enlace de la página actual (ej.: Blog en /blog/...);
// - en la portada, la sección que se está viendo (Cursos, Contacto...).
const clean = path => path.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';

export function initActiveNav() {
    const links = [...document.querySelectorAll('.nav-links a, .mobile-menu > a')];
    const here = clean(location.pathname);
    const sectionLinks = [];

    links.forEach(a => {
        const url = new URL(a.href);
        const path = clean(url.pathname);
        if (url.hash) {
            if (path === here) sectionLinks.push(a);
        } else if (path !== '/' && (here === path || here.startsWith(path.endsWith('/') ? path : `${path}/`))) {
            a.setAttribute('aria-current', 'page');
        }
    });

    const sections = [...new Set(sectionLinks.map(a => document.getElementById(new URL(a.href).hash.slice(1))))].filter(Boolean);
    if (!sections.length) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            sectionLinks.forEach(a => {
                if (new URL(a.href).hash === `#${entry.target.id}`) a.setAttribute('aria-current', 'true');
                else a.removeAttribute('aria-current');
            });
        });
    }, { rootMargin: '-40% 0px -55% 0px' });

    sections.forEach(s => observer.observe(s));
}
