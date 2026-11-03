// Marca en la barra de navegación la sección que se está viendo
export function initActiveNav() {
    const links = [...document.querySelectorAll('.nav-links a')];
    const sections = links
        .map(a => document.querySelector(a.getAttribute('href')))
        .filter(Boolean);

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            links.forEach(a => {
                if (a.getAttribute('href') === `#${entry.target.id}`) a.setAttribute('aria-current', 'true');
                else a.removeAttribute('aria-current');
            });
        });
    }, { rootMargin: '-40% 0px -55% 0px' });

    sections.forEach(s => observer.observe(s));
}
