// Genera las páginas de cursos y del blog a partir de archivos Markdown.
//
//   content/cursos/<nombre>.md  →  cursos/<nombre>.html   (dirección: /cursos/<nombre>)
//   content/blog/<nombre>.md    →  blog/<nombre>.html     (dirección: /blog/<nombre>)
//                                  blog/index.html        (dirección: /blog/)
//
// Los .md pueden editarse a mano o desde el panel Pages CMS (ver .pages.yml).
// Las fotos indicadas en "imagen" se optimizan solas (WebP en dos tamaños) en public/img/opt/.
// Las plantillas están en templates/. Lo usa el plugin de Vite (scripts/site-plugin.mjs).

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { marked } from 'marked';
import { parse as parseYaml } from 'yaml';
import sharp from 'sharp';

// Marca que llevan los archivos generados. Solo se borran archivos que la tengan.
const GENERATED = '<!-- Archivo generado automáticamente desde content/. No lo edites: cambia el .md. -->';
const IMAGE_WIDTHS = [640, 1280];

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// "Mi Artículo Nuevo" → "mi-articulo-nuevo"
const slugify = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Acepta 2026-11-16, "2026-11-16T10:00:00Z" o una fecha ya convertida por YAML
function toIsoDate(value) {
    if (value instanceof Date && !isNaN(value)) return value.toISOString().slice(0, 10);
    const m = String(value ?? '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null;
}

const isTrue = v => v === true || ['si', 'sí', 'true', 'yes'].includes(String(v ?? '').toLowerCase());

// ---------- Lectura de archivos .md ----------

function parseFile(file, required, dateField) {
    const raw = readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) throw new Error('el archivo debe empezar con una cabecera entre dos líneas "---".');

    let data;
    try {
        data = parseYaml(match[1]) ?? {};
    } catch (err) {
        throw new Error(`la cabecera tiene un error de formato: ${err.message.split('\n')[0]}`);
    }
    const missing = required.filter(k => data[k] === undefined || data[k] === null || data[k] === '');
    if (missing.length) throw new Error(`faltan estos campos: ${missing.join(', ')}.`);

    const iso = toIsoDate(data[dateField]);
    if (!iso) throw new Error(`"${dateField}" debe ser una fecha AAAA-MM-DD (ej.: 2026-11-16).`);

    const slug = slugify(basename(file, extname(file)));
    if (!slug) throw new Error('el nombre del archivo no es válido.');

    // Todos los valores de la cabecera pasan a texto (salvo los que se tratan aparte)
    const text = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v instanceof Date ? toIsoDate(v) : String(v ?? '').trim()]));
    return { ...text, slug, [dateField]: iso, borrador: isTrue(data.borrador), body: match[2], html: marked.parse(match[2]) };
}

function loadCollection(dir, required, dateField, warnings) {
    if (!existsSync(dir)) return [];
    const items = [];
    for (const f of readdirSync(dir)) {
        if (!f.endsWith('.md') || f.startsWith('_')) continue;
        try {
            const item = parseFile(join(dir, f), required, dateField);
            if (!item.borrador) items.push(item);
        } catch (err) {
            warnings.push(`${join(basename(dir), f)}: ${err.message} → no se publica.`);
        }
    }
    return items;
}

// ---------- Fotos ----------

// Crea versiones WebP de una foto de public/ y devuelve los datos para <img>.
async function optimizeImage(root, src, warnings, where) {
    if (!src) return null;
    if (/^https?:\/\//.test(src)) return { src, srcset: '', width: 1600, height: 1067 };

    const file = join(root, 'public', decodeURIComponent(src.split('?')[0]));
    if (!existsSync(file)) {
        warnings.push(`${where}: no existe la imagen ${src} (debe estar dentro de public/) → se publica sin foto.`);
        return null;
    }
    const { mtimeMs, size } = statSync(file);
    const hash = createHash('md5').update(`${src}:${mtimeMs}:${size}`).digest('hex').slice(0, 8);
    const base = slugify(basename(file, extname(file))) || 'foto';
    const outDir = join(root, 'public', 'img', 'opt');
    mkdirSync(outDir, { recursive: true });

    try {
        const meta = await sharp(file).metadata();
        const ratio = (meta.height || 2) / (meta.width || 3);
        const variants = [];
        for (const w of IMAGE_WIDTHS) {
            const width = Math.min(w, meta.width || w);
            const name = `${base}-${hash}-${w}.webp`;
            if (!existsSync(join(outDir, name))) {
                await sharp(file).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 74 }).toFile(join(outDir, name));
            }
            variants.push({ url: `/img/opt/${name}`, width });
        }
        const largest = variants.at(-1);
        return {
            src: variants[0].url,
            srcset: variants.map(v => `${v.url} ${v.width}w`).join(', '),
            width: largest.width,
            height: Math.round(largest.width * ratio),
        };
    } catch (err) {
        warnings.push(`${where}: no se pudo procesar la imagen ${src} (${err.message}) → se publica sin foto.`);
        return null;
    }
}

function imgTag(image, alt, sizes, { lazy = true, cls = '' } = {}) {
    if (!image) return '';
    return `<img${cls ? ` class="${cls}"` : ''} src="${esc(image.src)}"${image.srcset ? ` srcset="${image.srcset}" sizes="${sizes}"` : ''} alt="${esc(alt)}" width="${image.width}" height="${image.height}"${lazy ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"'}>`;
}

// ---------- Fechas ----------

const toDate = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const dayMonth = iso => toDate(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
const fullDate = iso => toDate(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const readingTime = text => Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));

// ---------- Datos ----------

const COURSE_FIELDS = ['titulo', 'resumen', 'modalidad', 'horas', 'inicio', 'idioma', 'lugar', 'precio', 'formador'];
const POST_FIELDS = ['titulo', 'descripcion', 'fecha', 'autor', 'categoria'];

async function loadAll(root) {
    const warnings = [];
    const courses = loadCollection(join(root, 'content', 'cursos'), COURSE_FIELDS, 'inicio', warnings)
        .filter(c => {
            c.modalidad = c.modalidad.toLowerCase();
            if (['online', 'presencial'].includes(c.modalidad)) return true;
            warnings.push(`cursos/${c.slug}.md: "modalidad" debe ser online o presencial → no se publica.`);
            return false;
        })
        .sort((a, b) => a.inicio.localeCompare(b.inicio));
    const posts = loadCollection(join(root, 'content', 'blog'), POST_FIELDS, 'fecha', warnings)
        .sort((a, b) => b.fecha.localeCompare(a.fecha));

    for (const item of courses) item.image = await optimizeImage(root, item.imagen, warnings, `cursos/${item.slug}.md`);
    for (const item of posts) item.image = await optimizeImage(root, item.imagen, warnings, `blog/${item.slug}.md`);
    return { courses, posts, warnings };
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
                <div class="post-thumb">${p.image
                    ? imgTag(p.image, '', '(min-width: 1000px) 380px, (min-width: 700px) 50vw, 100vw')
                    : `<span class="post-thumb-empty" aria-hidden="true">${esc(p.categoria)}</span>`}</div>
                <div class="post-body">
                    <p class="post-cat">${esc(p.categoria)}</p>
                    <${h}><a href="/blog/${p.slug}">${esc(p.titulo)}</a></${h}>
                    <p class="post-desc">${esc(p.descripcion)}</p>
                    <p class="post-meta"><time datetime="${p.fecha}">${fullDate(p.fecha)}</time> · ${readingTime(p.body)} min de lectura</p>
                </div>
            </article>`).join('\n');
}

const credit = text => (text ? `<figcaption>${esc(text)}</figcaption>` : '');

// ---------- Plantillas ----------

function fill(template, vars, name) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        if (!(key in vars)) throw new Error(`templates/${name}: la variable {{${key}}} no existe.`);
        return vars[key];
    });
}

function writeGenerated(file, html) {
    const content = html.replace(/^(<!DOCTYPE html>\n?)/i, `$1${GENERATED}\n`);
    // No reescribir si no cambia: evita recargas innecesarias en dev
    if (existsSync(file) && readFileSync(file, 'utf8') === content) return;
    writeFileSync(file, content);
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

// Último contenido generado (lo usa el plugin para la portada)
let site = { courses: [], posts: [] };
export const getSite = () => site;

export async function generateContent(root, log = console) {
    const tpl = name => readFileSync(join(root, 'templates', name), 'utf8');
    const { courses, posts, warnings } = await loadAll(root);
    warnings.forEach(w => log.warn(`⚠ ${w}`));

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
            heroClass: c.image ? 'page-hero has-photo' : 'page-hero',
            imagen: c.image
                ? `<figure class="hero-photo">${imgTag(c.image, c.imagen_alt || '', '(min-width: 960px) 40vw, 100vw', { lazy: false })}${credit(c.imagen_credito)}</figure>`
                : '',
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
            ogImage: p.image ? `<meta property="og:image" content="${esc(p.image.src.replace('-640.', '-1280.'))}">` : '',
            imagen: p.image
                ? `<figure class="post-cover">${imgTag(p.image, p.imagen_alt || '', '(min-width: 860px) 800px, 100vw', { lazy: false })}${credit(p.imagen_credito)}</figure>`
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

    site = { courses, posts };
    return site;
}
