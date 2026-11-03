// Formulario de contacto.
//
// - Se envía a la función de Vercel /api/contacto (api/contacto.js), que lo manda por email con Resend.
// - Con JavaScript: se valida cada campo, se envía sin recargar y se muestra el resultado.
// - Sin JavaScript: el navegador lo envía normalmente y la función redirige a /gracias.
// - Con `npm run dev` la función no existe (solo con `vercel dev` o publicado), así que el envío se simula.
// - ?curso=<slug> en la dirección deja elegido ese curso o evento (lo usan las fichas de curso).

const TIMEOUT_MS = 15000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function selectCourse(form, slug) {
    const option = slug && form.curso.querySelector(`option[data-slug="${CSS.escape(slug)}"]`);
    if (option) option.selected = true;
    return Boolean(option);
}

function setError(form, name, text) {
    const field = form.elements[name];
    const box = form.querySelector(`#${name}-error`);
    if (box) box.textContent = text;
    if (text) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
}

const FIELDS = ['nombre', 'email', 'privacidad'];

function errorFor(form, name) {
    if (name === 'nombre') return form.nombre.value.trim() ? '' : 'Escribe tu nombre.';
    if (name === 'email') {
        const value = form.email.value.trim();
        if (!value) return 'Escribe tu correo electrónico.';
        return EMAIL_RE.test(value) ? '' : 'Revisa el correo: parece que falta algo (ej.: nombre@centro.es).';
    }
    return form.privacidad.checked ? '' : 'Tienes que aceptar la política de privacidad para que podamos responderte.';
}

// Marca los campos con error y devuelve sus nombres
function validate(form) {
    return FIELDS.filter(name => {
        const text = errorFor(form, name);
        setError(form, name, text);
        return text;
    });
}

async function send(form) {
    const body = new URLSearchParams(new FormData(form));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(form.action, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body,
            signal: controller.signal,
        });

        // En `npm run dev` no hay función: simulamos el envío para poder probar el formulario
        if (import.meta.env.DEV && res.status === 404) {
            console.info('[formulario] En local no se envía nada (usa `vercel dev` para probarlo de verdad). Datos:', Object.fromEntries(body));
            await new Promise(r => setTimeout(r, 600));
            return;
        }

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `HTTP ${res.status}`);
        }
    } finally {
        clearTimeout(timer);
    }
}

export function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const msg = form.querySelector('.form-msg');
    const button = form.querySelector('button[type="submit"]');
    let sending = false;

    selectCourse(form, new URLSearchParams(location.search).get('curso'));

    // Enlaces de esta misma página a ?curso=...#contacto: eligen el curso sin recargar
    document.addEventListener('click', e => {
        const link = e.target.closest('a[href*="curso="]');
        if (!link || e.ctrlKey || e.metaKey || e.shiftKey) return;
        const url = new URL(link.href);
        if (url.pathname !== location.pathname || !selectCourse(form, url.searchParams.get('curso'))) return;
        e.preventDefault();
        history.replaceState(null, '', url.pathname + url.search + url.hash);
        document.getElementById('contacto')?.scrollIntoView();
        form.nombre.focus({ preventScroll: true });
    });

    // Quita el aviso de error en cuanto la persona corrige el campo
    FIELDS.forEach(name => {
        form.elements[name].addEventListener(name === 'privacidad' ? 'change' : 'input', () => {
            if (form.elements[name].hasAttribute('aria-invalid')) setError(form, name, errorFor(form, name));
        });
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (sending) return;

        const invalid = validate(form);
        if (invalid.length) {
            msg.className = 'form-msg error';
            msg.textContent = invalid.length === 1 ? 'Revisa el campo marcado.' : `Revisa los ${invalid.length} campos marcados.`;
            form.elements[invalid[0]].focus();
            return;
        }

        sending = true;
        button.disabled = true;
        button.textContent = 'Enviando…';
        msg.className = 'form-msg';
        msg.textContent = '';

        try {
            await send(form);
            msg.className = 'form-msg ok';
            msg.textContent = `¡Gracias, ${form.nombre.value.trim().split(' ')[0]}! Hemos recibido tu solicitud y te responderemos en dos días laborables.`;
            form.reset();
        } catch (err) {
            console.error('[formulario]', err);
            msg.className = 'form-msg error';
            msg.innerHTML = err.name === 'AbortError'
                ? 'La conexión está tardando demasiado. Comprueba tu conexión e inténtalo de nuevo.'
                : 'No se ha podido enviar. Inténtalo de nuevo o escríbenos a <a href="mailto:info@edueurope.example">info@edueurope.example</a>.';
        } finally {
            sending = false;
            button.disabled = false;
            button.textContent = 'Enviar solicitud';
        }
    });
}
