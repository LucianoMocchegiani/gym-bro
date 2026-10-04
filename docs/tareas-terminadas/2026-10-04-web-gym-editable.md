# Web del gym editable: portada y sliders desde el panel

**Fecha:** 2026-10-04
**Roadmap:** Web del gym (post-MVP)
**Commit:** `072269e` — feat(web): web del gym editable con portada y sliders
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/072269e

## Resumen

Cada gym arma su web pública (`{slug}/`) desde **Sistema → Web del gym**: una portada y hasta 5 sliders de 1 a 10 slides, con imagen de fondo, tono del texto, capa, color del título y botón opcional. El editor tiene vista previa, contadores y aviso de contraste; publicar se ve al instante. Sin contenido, la web sigue mostrando la vidriera por defecto (nombre y planes).

## Cambios principales

- Tabla `tenant_sites` (JSON 1:1 con el tenant) y módulo `tenant-site`: `GET|PUT|DELETE /api/tenant-site` con `tenant.settings.read/write`, auditoría `tenant.site.update` / `tenant.site.reset`, y `site` en el catálogo público del gym.
- Validación en la API: largos, ids únicos, imágenes solo del R2 del tenant (carpeta `site` de `POST /upload`), packs activos y links https. La legibilidad la decide `site-contrast.ts`, copiado igual en la web.
- Las imágenes que dejan de usarse (y todas al restablecer) se borran de R2.
- Web: `SiteViews` (portada y slide, sin hooks) sirven para la web del gym y para la vista previa; el slider de la landing pasó a un `Carousel` genérico compartido.
- Editor `/dashboard/web`: agregar, quitar y reordenar sliders y slides; `ImageUpload` ahora acepta `accept` y `minWidth`. Las imágenes se suben recién al publicar.
- Metadata de la web del gym con título, subtítulo e imagen de la portada.

## Decisiones

- Colores acotados: texto claro u oscuro, capa en tres niveles y un acento para el título. El contraste se mide contra el peor caso de fondo (foto toda blanca o toda negra bajo la capa): título ≥ 3:1. El cuerpo pasa 4.5:1 con cualquier capa.
- Imágenes: solo JPG, PNG o WebP, de al menos 1200 px de ancho, con descripción y enfoque.
- Botón: planes, reservar (portal), comprar pack (sin Mercado Pago lleva a los planes; si el pack se desactiva, se oculta) o link https.
- Publicar al instante, sin borrador. Logo y color de marca, en otra tarea.

## Validación

- API: `tsc` y eslint limpios; `site-contrast.spec.ts` (5 tests).
- Web: `tsc`, eslint de los archivos tocados y `next build` OK.
- Prueba manual pendiente: `local/en-testeo/web-gym-editable.md` (casos G33–G42 de `08`). Hay que aplicar la migración `20261004150000_tenant_sites`.

## Referencias

- RN-CTA-010, CU-CTA-010 (`05-casos-de-uso/cuenta.md`), `07` §18, `09` §4.21b, Postman «Tenant site (web del gym)».
- Commit: `072269e` / https://github.com/LucianoMocchegiani/gym-bro/commit/072269e
