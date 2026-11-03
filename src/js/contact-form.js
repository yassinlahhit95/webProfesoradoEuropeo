// Formulario de contacto con Netlify Forms.
// Netlify detecta el formulario al publicar (atributo data-netlify) y guarda
// los envíos en el panel del sitio; puedes activar avisos por email allí.

export function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const msg = form.querySelector('.form-msg');
    const button = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async e => {
        e.preventDefault();

        const missing = [];
        if (!form.nombre.value.trim()) missing.push('tu nombre');
        if (!form.email.validity.valid) missing.push('un correo válido');
        if (!form.privacidad.checked) missing.push('aceptar la política de privacidad');
        if (missing.length) {
            msg.className = 'form-msg error';
            msg.textContent = `Falta ${missing.join(', ')}.`;
            return;
        }

        button.disabled = true;
        msg.className = 'form-msg';
        msg.textContent = 'Enviando…';

        try {
            const res = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(new FormData(form)).toString(),
            });
            if (!res.ok) throw new Error(res.status);
            msg.className = 'form-msg ok';
            msg.textContent = 'Solicitud enviada. Te responderemos en dos días laborables.';
            form.reset();
        } catch {
            msg.className = 'form-msg error';
            msg.textContent = 'No se ha podido enviar. Inténtalo de nuevo o escríbenos a info@edueurope.example.';
        } finally {
            button.disabled = false;
        }
    });
}
