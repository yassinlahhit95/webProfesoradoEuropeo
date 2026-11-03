// Genera las páginas de cursos y del blog a partir de archivos Markdown.
//
//   content/cursos/<slug>.md  →  cursos/<slug>.html   (dirección: /cursos/<slug>)
//   content/blog/<slug>.md    →  blog/<slug>.html     (dirección: /blog/<slug>)
//                                blog/index.html      (dirección: /blog/)
//
// Las plantillas están en templates/. Lo usa el plugin de Vite (scripts/site-plugin.mjs)
// al arrancar `npm run dev` y `npm run build`, y cada vez que cambias un .md en modo dev.

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, basename } from 'node:path';
import { marked } from 'marked';

// Marca que llevan los archivos generados. Solo se borran archivos que la tengan.
const GENERATED = '<!-- Archivo generado automáticamente desde content/. No lo edites: cambia el .md. -->';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// ---------- Lectura de archivos .md con cabecera "clave: valor" ----------

function parseFile(file, required) {
    const raw = readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) throw new Error(`${file}: el archivo debe empezar con una cabecera entre líneas "---".`);

    const data = {};
    for (const line of match[1].split('\n')) {
        if (!line.trim() || line.trim().startsWith('#')) continue;
        const i = line.indexOf(':');
        if (i === -1) throw new Error(`${file}: esta línea de la cabecera no tiene el formato "clave: valor" → ${line}`);
        let value = line.slice(i + 1).trim();
        if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
        data[line.slice(0, i).trim()] = value;
    }

    const slug = basename(file, '.md');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        throw new Error(`${file}: el nombre del archivo solo puede tener minúsculas sin tildes, números y guiones (ej.: mi-articulo.md).`);
    }
    const missing = required.filter(k => !data[k]);
    if (missing.length) throw new Error(`${file}: faltan estos campos en la cabecera: ${missing.join(', ')}.`);
    for (const key of ['inicio', 'fecha']) {
        if (data[key] && !/^\d{4}-\d{2}-\d{2}$/.test(data[key])) {
            throw new Error(`${file}: "${key}" debe tener el formato AAAA-MM-DD (ej.: 2026-11-16).`);
        }
    }

    return { slug, ...data, body: match[2], html: marked.parse(match[2]) };
}

function loadCollection(dir, required) {
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
        .filter(f => f.endsWith('.md') && !f.startsWith('_'))
        .map(f => parseFile(join(dir, f), required))
        .filter(item => !['si', 'sí', 'true'].includes(String(item.borrador).toLowerCase()));
}

// ---------- Fechas ----------

const toDate = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const dayMonth = iso => toDate(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
const fullDate = iso => toDate(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const readingTime = text => Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));

// ---------- Datos ----------

const COURSE_FIELDS = ['titulo', 'resumen', 'modalidad', 'horas', 'inicio', 'idioma', 'lugar', 'precio', 'formador'];
const POST_FIELDS = ['titulo', 'descripcion', 'fecha', 'autor', 'categoria'];

export function loadCourses(root) {
    return loadCollection(join(root, 'content', 'cursos'), COURSE_FIELDS)
        .map(c => {
            const modalidad = c.modalidad.toLowerCase();
            if (!['online', 'presencial'].includes(modalidad)) {
                throw new Error(`content/cursos/${c.slug}.md: "modalidad" debe ser online o presencial.`);
            }
            return { ...c, modalidad };
        })
        .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export function loadPosts(root) {
    return loadCollection(join(root, 'content', 'blog'), POST_FIELDS)
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

// ---------- Fragmentos reutilizables ----------

const modeLabel = m => (m === 'online' ? 'Online' : 'Presencial');

export function catalogHtml(courses) {
    return courses.map(c => `
            <article class="course" data-mode="${c.modalidad}">
                <div>
                    <h3><a href="/cursos/${c.slug}">${esc(c.titulo)}</a></h3>
                    <p class="course-desc">${esc(c.resumen)}</p>
                </div>
                <dl class="course-meta">
                    <dt>Modalidad</dt><dd class="mode ${c.modalidad}">${modeLabel(c.modalidad)}</dd>
                    <dt>Horas</dt><dd>${esc(c.horas)} h</dd>
                    <dt>Próximo inicio</dt><dd><time datetime="${c.inicio}">${dayMonth(c.inicio)}</time></dd>
                </dl>
            </article>`).join('\n');
}

export function courseOptionsHtml(courses) {
    return courses.map(c => `<option value="${esc(c.titulo)}" data-slug="${c.slug}">${esc(c.titulo)}</option>`).join('\n                        ');
}

export function postCardsHtml(posts, headingLevel = 3) {
    const h = `h${headingLevel}`;
    return posts.map(p => `
            <article class="post-card">
                <p class="post-cat">${esc(p.categoria)}</p>
                <${h}><a href="/blog/${p.slug}">${esc(p.titulo)}</a></${h}>
                <p class="post-desc">${esc(p.descripcion)}</p>
                <p class="post-meta"><time datetime="${p.fecha}">${fullDate(p.fecha)}</time> · ${readingTime(p.body)} min de lectura</p>
            </article>`).join('\n');
}

// ---------- Plantillas ----------

function fill(template, vars, name) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        if (!(key in vars)) throw new Error(`templates/${name}: la variable {{${key}}} no existe.`);
        return vars[key];
    });
}

function writeGenerated(file, html) {
    writeFileSync(file, html.replace(/^(<!DOCTYPE html>\n?)/i, `$1${GENERATED}\n`));
}

// Borra las páginas generadas que ya no tienen .md (por ejemplo, si borras un artículo)
function cleanGenerated(dir, keep) {
    if (!existsSync(dir)) return;
    for (const f of readdirSync(dir)) {
        if (!f.endsWith('.html') || keep.has(f)) continue;
        const file = join(dir, f);
        if (readFileSync(file, 'utf8').includes(GENERATED)) unlinkSync(file);
    }
}

export function generateContent(root) {
    const tpl = name => readFileSync(join(root, 'templates', name), 'utf8');
    const courses = loadCourses(root);
    const posts = loadPosts(root);

    // Cursos
    const coursesDir = join(root, 'cursos');
    mkdirSync(coursesDir, { recursive: true });
    const courseTpl = tpl('curso.html');
    for (const c of courses) {
        const others = courses.filter(o => o !== c).slice(0, 3);
        writeGenerated(join(coursesDir, `${c.slug}.html`), fill(courseTpl, {
            slug: c.slug,
            titulo: esc(c.titulo),
            resumen: esc(c.resumen),
            modalidad: c.modalidad,
            modalidadTexto: modeLabel(c.modalidad),
            horas: esc(c.horas),
            inicioIso: c.inicio,
            inicio: fullDate(c.inicio),
            idioma: esc(c.idioma),
            lugar: esc(c.lugar),
            precio: esc(c.precio),
            formador: esc(c.formador),
            formadorBio: esc(c.formador_bio || ''),
            contenido: c.html,
            erasmus: c.modalidad === 'presencial'
                ? `<p class="aside-note">Este curso puede financiarse con una movilidad Erasmus+ KA1. <a href="/erasmus">Te explicamos cómo</a>.</p>`
                : '',
            otros: others.map(o => `<li><a href="/cursos/${o.slug}">${esc(o.titulo)}</a> <span>${modeLabel(o.modalidad)} · ${esc(o.horas)} h</span></li>`).join('\n                '),
        }, 'curso.html'));
    }
    cleanGenerated(coursesDir, new Set(courses.map(c => `${c.slug}.html`)));

    // Blog
    const blogDir = join(root, 'blog');
    mkdirSync(blogDir, { recursive: true });
    const postTpl = tpl('articulo.html');
    for (const p of posts) {
        const others = posts.filter(o => o !== p).slice(0, 2);
        writeGenerated(join(blogDir, `${p.slug}.html`), fill(postTpl, {
            slug: p.slug,
            titulo: esc(p.titulo),
            descripcion: esc(p.descripcion),
            categoria: esc(p.categoria),
            autor: esc(p.autor),
            fechaIso: p.fecha,
            fecha: fullDate(p.fecha),
            lectura: String(readingTime(p.body)),
            imagen: p.imagen
                ? `<figure class="post-cover"><img src="${esc(p.imagen)}" alt="${esc(p.imagen_alt || '')}" width="1600" height="1067"></figure>`
                : '',
            contenido: p.html,
            otros: others.length
                ? `<section class="more-posts" aria-labelledby="mas"><h2 id="mas">Sigue leyendo</h2><div class="post-grid">${postCardsHtml(others)}</div></section>`
                : '',
        }, 'articulo.html'));
    }
    writeGenerated(join(blogDir, 'index.html'), fill(tpl('blog.html'), {
        articulos: posts.length ? postCardsHtml(posts, 2) : '<p>Todavía no hay artículos publicados.</p>',
    }, 'blog.html'));
    cleanGenerated(blogDir, new Set([...posts.map(p => `${p.slug}.html`), 'index.html']));

    return { courses, posts };
}
