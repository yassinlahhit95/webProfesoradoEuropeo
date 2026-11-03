// Función de Vercel: recibe el formulario de contacto y lo envía por email con Resend.
// Dirección: POST /api/contacto
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY  Clave de https://resend.com/api-keys (obligatoria)
//   CONTACT_TO      Email donde quieres recibir las solicitudes (obligatoria).
//                   Varias direcciones: sepáralas con comas.
//   CONTACT_FROM    Remitente (opcional). Mientras no verifiques tu dominio en Resend,
//                   deja el valor por defecto y usa en CONTACT_TO el email de tu cuenta de Resend.
//
// Si la petición viene del JavaScript de la web (Accept: application/json) responde con JSON.
// Si viene de un navegador sin JavaScript, redirige a /gracias o muestra el error.

const LIMITS = { nombre: 100, email: 150, centro: 150, curso: 200, mensaje: 3000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const esc = s => String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const oneLine = s => s.replace(/[\r\n]+/g, ' ');

function reply(request, status, body) {
    if ((request.headers.get('accept') || '').includes('application/json')) {
        return Response.json(body, { status });
    }
    if (status < 400) return Response.redirect(new URL('/gracias', request.url), 303);
    return new Response(
        `<!DOCTYPE html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>No se ha podido enviar | EduEurope</title>
<body style="font-family:system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1.25rem;line-height:1.6">
<h1>No se ha podido enviar</h1><p>${esc(body.error)}</p>
<p><a href="/#contacto">Volver al formulario</a></p></body></html>`,
        { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
}

export async function POST(request) {
    let form;
    try {
        form = await request.formData();
    } catch {
        return reply(request, 400, { error: 'El formulario ha llegado con un formato no válido.' });
    }
    const get = key => String(form.get(key) ?? '').trim();

    // Campo trampa: las personas no lo ven; si viene relleno es un bot. Fingimos que todo ha ido bien.
    if (get('empresa')) return reply(request, 200, { ok: true });

    const data = Object.fromEntries(Object.entries(LIMITS).map(([key, max]) => [key, get(key).slice(0, max)]));
    const invalid = [];
    if (!data.nombre) invalid.push('nombre');
    if (!EMAIL_RE.test(data.email)) invalid.push('email');
    if (get('privacidad') !== 'si') invalid.push('privacidad');
    if (invalid.length) {
        return reply(request, 422, { error: 'Faltan datos obligatorios o el correo no es válido.', campos: invalid });
    }

    const { RESEND_API_KEY, CONTACT_TO } = process.env;
    const from = process.env.CONTACT_FROM || 'EduEurope web <onboarding@resend.dev>';
    if (!RESEND_API_KEY || !CONTACT_TO) {
        console.error('[contacto] Faltan las variables de entorno RESEND_API_KEY o CONTACT_TO.');
        return reply(request, 500, { error: 'El formulario todavía no está configurado. Escríbenos por email.' });
    }

    const rows = [
        ['Nombre', data.nombre],
        ['Email', data.email],
        ['Centro', data.centro || '—'],
        ['Le interesa', data.curso || '—'],
        ['Mensaje', data.mensaje || '—'],
    ];
    const html = `<h2 style="font-family:sans-serif">Nueva solicitud desde la web</h2>
<table cellpadding="8" style="font-family:sans-serif;border-collapse:collapse">
${rows.map(([k, v]) => `<tr><th align="left" valign="top" style="border-bottom:1px solid #ddd">${k}</th><td style="border-bottom:1px solid #ddd;white-space:pre-wrap">${esc(v)}</td></tr>`).join('\n')}
</table>
<p style="font-family:sans-serif;color:#666">Responde a este email para contestar directamente a ${esc(data.nombre)}.</p>`;
    const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from,
                to: CONTACT_TO.split(',').map(s => s.trim()).filter(Boolean),
                reply_to: data.email,
                subject: oneLine(`Solicitud web: ${data.curso || 'información'} · ${data.nombre}`).slice(0, 200),
                html,
                text,
            }),
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error(`Resend respondió ${res.status}: ${await res.text()}`);
    } catch (err) {
        console.error('[contacto]', err);
        return reply(request, 502, { error: 'No se ha podido enviar el mensaje. Inténtalo de nuevo en unos minutos.' });
    }

    return reply(request, 200, { ok: true });
}
