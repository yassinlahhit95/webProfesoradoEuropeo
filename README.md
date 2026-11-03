# EduEurope

Web de formación para profesorado, hecha con **Vite** y HTML, CSS y JavaScript sin frameworks.

## Primeros pasos

```bash
npm install
npm run dev        # abre http://localhost:5173
```

La primera vez, `npm run dev` descarga las fotos de Unsplash y crea versiones optimizadas
(AVIF, WebP y JPG en varios tamaños) en `public/img/`. Después ya no vuelve a descargarlas.
Súbelas al repositorio con el resto del proyecto.

```bash
npm run build      # genera la web final en dist/
npm run preview    # prueba la versión final en local
npm run images -- --force   # vuelve a generar las fotos
```

## Estructura

```
index.html              Contenido de la página
src/main.js             Punto de entrada (carga fuentes, estilos y scripts)
src/styles/
  tokens.css            Colores, tipografía y medidas
  base.css              Estilos generales y botones
  layout.css            Navegación, portada y pie de página
  sections.css          Catálogo, Erasmus+, eventos, FAQ, contacto
src/js/
  menu.js               Menú móvil
  active-nav.js         Marca la sección visible en el menú
  catalog.js            Filtro y buscador de cursos (admite ?q=palabra en la URL)
  contact-form.js       Envío del formulario a Netlify
scripts/
  photos.json           Fotos usadas (ID de Unsplash, autor, tamaños)
  images.mjs            Descarga y optimiza las fotos
public/                 Archivos que se copian tal cual (favicon, robots.txt, img/)
netlify.toml            Configuración de publicación y caché
```

## Cambiar una foto

1. Busca una foto gratuita en unsplash.com (que no sea de Unsplash+).
2. Copia el identificador `photo-…` de la dirección de la imagen y ponlo en `scripts/photos.json`.
3. Ejecuta `npm run images -- --force`.
4. Actualiza el crédito del autor en el pie de página de `index.html`.

## Publicar en Netlify

1. Sube el proyecto a GitHub.
2. En Netlify, elige *Add new site → Import an existing project* y selecciona el repositorio.
   Netlify lee `netlify.toml`, así que el comando de build y la carpeta ya están configurados.
3. El formulario de contacto aparecerá en *Forms* dentro del panel del sitio.
   Ahí puedes activar un aviso por email cada vez que alguien lo envíe.

El formulario usa Netlify Forms, así que solo funciona publicado en Netlify (no en `npm run dev`).
