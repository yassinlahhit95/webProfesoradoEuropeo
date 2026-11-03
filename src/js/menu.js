// Menú desplegable en móvil
export function setMenu(open) {
    const btn = document.querySelector('.menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;

    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    btn.querySelector('.i-open').style.display = open ? 'none' : '';
    btn.querySelector('.i-close').style.display = open ? '' : 'none';
}

export function initMenu() {
    const btn = document.querySelector('.menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', () => setMenu(menu.hidden));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !menu.hidden) {
            setMenu(false);
            btn.focus();
        }
    });

    // Si se agranda la ventana con el menú abierto, se cierra
    matchMedia('(min-width: 1000px)').addEventListener('change', e => {
        if (e.matches) setMenu(false);
    });
}
