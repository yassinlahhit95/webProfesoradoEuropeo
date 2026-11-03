import { defineConfig } from 'vite';
import sitePlugin from './scripts/site-plugin.mjs';

export default defineConfig({
    plugins: [sitePlugin()],
    build: {
        target: 'es2020',
        cssMinify: true,
    },
});
