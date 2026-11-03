// Descarga las fotos de Unsplash (licencia gratuita) y genera versiones
// optimizadas en AVIF, WebP y JPG en public/img/.
// Se ejecuta solo antes de `npm run dev` y `npm run build`.
// Si las imágenes ya existen, no vuelve a descargarlas.

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'img');
const photos = JSON.parse(readFileSync(join(root, 'scripts', 'photos.json'), 'utf8'));
const force = process.argv.includes('--force');

mkdirSync(outDir, { recursive: true });

function outputsFor(photo) {
    const files = [];
    for (const w of photo.widths) {
        files.push({ file: `${photo.name}-${w}.avif`, w, format: 'avif' });
        files.push({ file: `${photo.name}-${w}.webp`, w, format: 'webp' });
    }
    files.push({ file: `${photo.name}-${photo.fallbackWidth}.jpg`, w: photo.fallbackWidth, format: 'jpeg' });
    return files;
}

let failed = 0;

for (const photo of photos) {
    const outputs = outputsFor(photo);
    if (!force && outputs.every(o => existsSync(join(outDir, o.file)))) continue;

    const maxW = Math.max(...photo.widths);
    const url = `https://images.unsplash.com/${photo.unsplashId}?w=${maxW}&q=90&fm=jpg&fit=max`;
    process.stdout.write(`Descargando ${photo.name} (${photo.author})… `);

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());

        for (const o of outputs) {
            const img = sharp(buffer).resize({ width: o.w, withoutEnlargement: true });
            if (o.format === 'avif') await img.avif({ quality: 55 }).toFile(join(outDir, o.file));
            if (o.format === 'webp') await img.webp({ quality: 75 }).toFile(join(outDir, o.file));
            if (o.format === 'jpeg') await img.jpeg({ quality: 78, mozjpeg: true }).toFile(join(outDir, o.file));
        }
        console.log('ok');
    } catch (err) {
        failed++;
        console.log(`error: ${err.message}`);
    }
}

if (failed) {
    console.warn(`\n${failed} foto(s) no se pudieron descargar. Revisa tu conexión y vuelve a ejecutar "npm run images".`);
}
