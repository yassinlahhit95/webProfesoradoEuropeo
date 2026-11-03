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
index.html              Portada
erasmus.html            Guía de Erasmus+            → /erasmus
sobre-nosotros.html     Equipo y testimonios        → /sobre-nosotros
aviso-legal.html, privacidad.html, cookies.html      Páginas legales
gracias.html            Tras enviar el formulario sin JavaScript
404.html                Página de error (Netlify la usa sola)

content/
  cursos/*.md           Un archivo por curso        → /cursos/<nombre>
  blog/*.md             Un archivo por artículo     → /blog/<nombre>
  blog/_plantilla.md    Plantilla para artículos nuevos (no se publica)
templates/              Diseño de las páginas de curso, artículo y listado del blog
partials/               Piezas comunes: nav.html, footer.html, testimonios.html

src/main.js             Punto de entrada (carga fuentes, estilos y scripts)
src/styles/
  tokens.css            Colores, tipografía y medidas
  base.css              Estilos generales y botones
  layout.css            Navegación, portada y pie de página
  sections.css          Catálogo, Erasmus+, eventos, FAQ, contacto
  pages.css             Páginas interiores, blog, testimonios, equipo
src/js/
  menu.js               Menú móvil
  active-nav.js         Marca en el menú la página o sección actual
  catalog.js            Filtro y buscador de cursos (admite ?q=palabra en la URL)
  contact-form.js       Validación y envío del formulario a Netlify
scripts/
  content.mjs           Convierte content/*.md en páginas HTML
  site-plugin.mjs       Plugin de Vite: piezas comunes, varias páginas, recarga en vivo
  photos.json           Fotos usadas (ID de Unsplash, autor, tamaños)
  images.mjs            Descarga y optimiza las fotos
public/                 Archivos que se copian tal cual (favicon, robots.txt, img/)
netlify.toml            Configuración de publicación y caché
```

Las carpetas `cursos/` y `blog/` de la raíz **se generan solas** a partir de `content/`.
No las edites a mano (y no se suben a Git).

En cualquier HTML puedes usar estas marcas:

| Marca | Se sustituye por |
|---|---|
| `<!-- include:nav -->` | `partials/nav.html` (sirve con cualquier archivo de `partials/`) |
| `<!-- cursos:catalogo -->` | Las filas del catálogo de cursos |
| `<!-- cursos:opciones -->` | Las opciones de cursos del formulario |
| `<!-- blog:ultimos -->` | Las 3 últimas entradas del blog |

## Escribir un artículo del blog

1. Copia `content/blog/_plantilla.md` en la misma carpeta con un nombre nuevo, sin tildes
   ni espacios: por ejemplo `evaluar-con-rubricas.md`. Su dirección será `/blog/evaluar-con-rubricas`.
2. Rellena la cabecera (`titulo`, `descripcion`, `fecha`, `autor`, `categoria`) y escribe
   el texto en Markdown debajo.
3. Con `npm run dev` abierto, la página se crea al guardar. Aparece en `/blog/` y, si es
   de las tres más recientes, en la portada.

Para guardar un borrador sin publicarlo, añade `borrador: si` a la cabecera.
Si falta un campo o la fecha está mal escrita, la terminal te dice qué falta y en qué archivo.

## Añadir o cambiar un curso

Crea o edita un archivo en `content/cursos/` (copia uno que ya exista). Con eso se actualizan
su ficha, el catálogo de la portada y la lista de cursos del formulario.
`modalidad` debe ser `online` o `presencial`, y `inicio` una fecha `AAAA-MM-DD`.

## Formulario de contacto

- Valida cada campo y explica qué falta, sin recargar la página.
- Las fichas de curso y los botones "Apuntarme" de los eventos enlazan a `/?curso=<nombre>#contacto`,
  y el formulario aparece con ese curso ya elegido.
- Si alguien tiene JavaScript desactivado, el formulario se envía igual y Netlify muestra `/gracias`.
- En `npm run dev` el envío **se simula** (Netlify no existe en local). Los datos aparecen en la
  consola del navegador.

## Cambiar una foto

1. Busca una foto gratuita en unsplash.com (que no sea de Unsplash+).
2. Copia el identificador `photo-…` de la dirección de la imagen y ponlo en `scripts/photos.json`.
3. Ejecuta `npm run images -- --force`.
4. Actualiza el crédito del autor en `partials/footer.html`.

## Publicar en Netlify

1. Sube el proyecto a GitHub.
2. En Netlify, elige *Add new site → Import an existing project* y selecciona el repositorio.
   Netlify lee `netlify.toml`, así que el comando de build y la carpeta ya están configurados.
3. **Activa los formularios:** en el panel del sitio, ve a *Forms* y pulsa *Enable form detection*.
   Después vuelve a publicar (*Deploys → Trigger deploy*). Sin este paso Netlify no guarda los envíos.
4. En *Forms → contacto* verás las solicitudes. En *Forms → Form notifications* puedes recibir
   un email cada vez que alguien escriba.
5. Envía una prueba desde la web publicada para comprobar que llega.

Antes de publicar, completa los datos marcados en amarillo en `aviso-legal.html` y `privacidad.html`
(razón social, NIF y dirección), y sustituye `info@edueurope.example` por tu correo real.
