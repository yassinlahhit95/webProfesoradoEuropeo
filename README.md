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
404.html                Página de error (Vercel la usa sola)

content/
  cursos/*.md           Un archivo por curso        → /cursos/<nombre>
  blog/*.md             Un archivo por artículo     → /blog/<nombre>
  blog/_plantilla.md    Plantilla para artículos nuevos (no se publica)
templates/              Diseño de las páginas de curso, artículo y listado del blog
.pages.yml              Configuración del panel de edición Pages CMS
public/img/fotos/       Fotos de cursos y artículos de ejemplo (Unsplash)
public/img/subidas/     Fotos subidas desde el panel
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
  contact-form.js       Validación y envío del formulario a /api/contacto
scripts/
  content.mjs           Convierte content/*.md en páginas HTML y optimiza sus fotos
  site-plugin.mjs       Plugin de Vite: piezas comunes, varias páginas, recarga en vivo
  photos.json           Fotos usadas (ID de Unsplash, autor, tamaños)
  images.mjs            Descarga y optimiza las fotos
public/                 Archivos que se copian tal cual (favicon, robots.txt, img/)
api/contacto.js         Función de Vercel: recibe el formulario y lo envía por email (Resend)
vercel.json             Direcciones limpias (sin .html), caché y cabeceras de seguridad
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

## Escribir y editar artículos (panel Pages CMS)

La forma más cómoda es el panel **Pages CMS**: formularios, editor de texto con botones y
subida de fotos, sin tocar código. Es gratuito y no hace falta instalar nada.

**Configurarlo (una vez):**

1. Entra en [app.pagescms.org](https://app.pagescms.org) y pulsa *Sign in with GitHub*.
2. Instala la aplicación de Pages CMS en tu cuenta de GitHub y dale acceso **solo** al
   repositorio `webProfesoradoEuropeo`.
3. Abre el repositorio desde el panel. Verás dos secciones: **Blog** y **Cursos**
   (las define el archivo `.pages.yml`).

**Publicar un artículo:**

1. *Blog → Add an entry*. Rellena título, resumen, fecha, autor y categoría.
2. Sube una foto horizontal en *Foto principal* y describe qué se ve en ella.
3. Escribe el texto en el editor (negritas, listas, enlaces, subtítulos e imágenes).
4. Pulsa *Save*. En uno o dos minutos Vercel publica la web con el artículo nuevo.

Para preparar un artículo sin publicarlo, marca *Borrador*. Para editarlo o borrarlo,
ábrelo desde la lista del blog. Para que otras personas escriban sin darles acceso a GitHub,
añádelas en *Settings → Collaborators* del panel.

Los cursos se editan igual desde la sección **Cursos**: al guardar se actualizan su ficha,
el catálogo de la portada y la lista del formulario.

### Detalles técnicos

- Cada artículo es un archivo `content/blog/<nombre>.md` y cada curso `content/cursos/<nombre>.md`.
  Su dirección es `/blog/<nombre>` o `/cursos/<nombre>`. También puedes editarlos a mano
  (tienes una plantilla en `content/blog/_plantilla.md`).
- Las fotos subidas desde el panel se guardan en `public/img/subidas/`. Al publicar se crean
  versiones WebP de 640 y 1280 px en `public/img/opt/` (carpeta generada, no se sube a Git).
- Si un artículo tiene un error (le falta un campo, la foto no existe...), **no se publica ese
  artículo**, pero el resto de la web sí. El aviso aparece en los *Build Logs* de Vercel y en
  la terminal de `npm run dev`, empezando por ⚠.

## Formulario de contacto

- Valida cada campo y explica qué falta, sin recargar la página.
- Las fichas de curso y los botones "Apuntarme" de los eventos enlazan a `/?curso=<nombre>#contacto`,
  y el formulario aparece con ese curso ya elegido.
- Lo recibe la función `api/contacto.js`, que vuelve a comprobar los datos, descarta a los bots
  (campo trampa) y te lo envía por email con [Resend](https://resend.com). Al responder a ese email
  contestas directamente a quien escribió.
- Si alguien tiene JavaScript desactivado, el formulario se envía igual y se muestra `/gracias`.
- Con `npm run dev` la función no existe, así que el envío **se simula** (los datos salen en la
  consola del navegador). Para probarlo de verdad en local: `npx vercel dev`.

## Cambiar una foto

1. Busca una foto gratuita en unsplash.com (que no sea de Unsplash+).
2. Copia el identificador `photo-…` de la dirección de la imagen y ponlo en `scripts/photos.json`.
3. Ejecuta `npm run images -- --force`.
4. Actualiza el crédito del autor en `partials/footer.html`.

## Publicar en Vercel

La web se publica sola cada vez que subes cambios a GitHub (`git push`).
`vercel.json` ya indica el comando de build, la carpeta `dist` y que las direcciones
funcionen sin `.html` (por ejemplo `/erasmus` en lugar de `/erasmus.html`).

### Activar el formulario (una sola vez)

1. Crea una cuenta gratuita en [resend.com](https://resend.com) y, en *API Keys*, crea una clave.
2. En Vercel, abre el proyecto → *Settings → Environment Variables* y añade:
   - `RESEND_API_KEY`: la clave de Resend.
   - `CONTACT_TO`: el email donde quieres recibir las solicitudes. Mientras no verifiques
     un dominio en Resend, **tiene que ser el mismo email con el que te registraste en Resend**.
   - `CONTACT_FROM` (opcional, solo con dominio verificado): por ejemplo `EduEurope <web@tudominio.com>`.
3. Vuelve a publicar (*Deployments → ⋯ → Redeploy*) para que se apliquen las variables.
4. Envía una prueba desde la web publicada. Si no llega, mira *Logs* en Vercel: los errores
   del formulario aparecen con la etiqueta `[contacto]`.

Antes de publicar en serio, completa los datos marcados en amarillo en `aviso-legal.html` y
`privacidad.html` (razón social, NIF, dirección) y sustituye `info@edueurope.example` por tu correo real.
