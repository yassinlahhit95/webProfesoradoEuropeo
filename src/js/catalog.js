import { setMenu } from './menu.js';

// Filtro por modalidad + buscador del catálogo de cursos
const normalize = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function initCatalog() {
    const chips = document.querySelectorAll('.chip');
    const courses = document.querySelectorAll('.course[data-mode]');
    const empty = document.querySelector('.course.empty');
    const inputs = document.querySelectorAll('.search-input');
    if (!courses.length) return;

    let mode = 'todos';
    let query = '';

    function apply() {
        let shown = 0;
        courses.forEach(course => {
            const ok = (mode === 'todos' || course.dataset.mode === mode)
                && normalize(course.textContent).includes(query);
            course.hidden = !ok;
            if (ok) shown++;
        });
        if (empty) empty.hidden = shown > 0;
    }

    chips.forEach(chip => chip.addEventListener('click', () => {
        chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
        mode = chip.dataset.filter;
        apply();
    }));

    inputs.forEach(input => {
        input.addEventListener('input', () => {
            query = normalize(input.value.trim());
            inputs.forEach(other => { if (other !== input) other.value = input.value; });
            apply();
        });
        input.form?.addEventListener('submit', e => {
            e.preventDefault();
            setMenu(false);
            document.getElementById('programas')?.scrollIntoView();
        });
    });

    // Permite enlazar a una búsqueda: /?q=erasmus#programas
    const initial = new URLSearchParams(location.search).get('q');
    if (initial) {
        inputs.forEach(i => { i.value = initial; });
        query = normalize(initial);
        apply();
    }
}
