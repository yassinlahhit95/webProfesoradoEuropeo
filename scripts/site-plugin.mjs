// Plugin de Vite para que la web tenga varias páginas sin repetir código:
//
// 1. Genera las páginas de cursos y blog desde content/ (ver scripts/content.mjs).
// 2. Sustituye estas marcas en cualquier HTML:
//      <!-- include:nombre -->   → contenido de partials/nombre.html
//      <!-- cursos:catalogo -->  → filas del catálogo de cursos
//      <!-- cursos:opciones -->  → <option> del formulario de contacto
//      <!-- blog:ultimos -->     → las 3 últimas entradas del blog
// 3. Añade al build todas las páginas .html del proyecto.
// 4. En `npm run dev`, recarga el navegador al cambiar content/, partials/ o templates/.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { generateContent, getSite, catalogHtml, courseOptionsHtml, postCardsHtml } from './content.mjs';

const IGNORED_DIRS = new Set(['api', 'node_modules', 'dist', 'public', 'partials', 'templates', 'content', 'scripts', 'src', '.git', '.vercel']);

function findHtmlPages(dir, root = dir) {
    const pages = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) pages.push(...findHtmlPages(join(dir, entry.name), root));
        } else if (entry.name.endsWith('.html')) {
            pages.push(join(dir, entry.name));
        }
    }
    return pages;
}

function expand(html, root) {
    return html
        .replace(/<!--\s*include:([\w-]+)\s*-->/g, (_, name) => {
            const file = join(root, 'partials', `${name}.html`);
            if (!existsSync(file)) throw new Error(`No existe partials/${name}.html`);
            return readFileSync(file, 'utf8');
        })
        .replace(/<!--\s*cursos:catalogo\s*-->/g, () => catalogHtml(getSite().courses))
        .replace(/<!--\s*cursos:opciones\s*-->/g, () => courseOptionsHtml(getSite().courses))
        .replace(/<!--\s*blog:ultimos\s*-->/g, () => postCardsHtml(getSite().posts.slice(0, 3)));
}

export default function sitePlugin() {
    let root = process.cwd();

    return {
        name: 'edueurope-site',

        async config(userConfig) {
            if (userConfig.root) root = userConfig.root;
            await generateContent(root);
            const input = Object.fromEntries(findHtmlPages(root).map(file => [
                relative(root, file).split(sep).join('/').replace(/\.html$/, ''),
                file,
            ]));
            return { appType: 'mpa', build: { rollupOptions: { input } } };
        },

        transformIndexHtml: {
            order: 'pre',
            handler: html => expand(html, root),
        },

        configureServer(server) {
            const watched = ['content', 'partials', 'templates'].map(d => join(root, d));
            server.watcher.add(watched);
            server.watcher.on('all', async (event, file) => {
                if (!watched.some(d => file.startsWith(d))) return;
                try {
                    if (!file.startsWith(join(root, 'partials'))) await generateContent(root, server.config.logger);
                } catch (err) {
                    server.config.logger.error(`\n${err.message}\n`);
                    return;
                }
                server.ws.send({ type: 'full-reload' });
            });
        },
    };
}
