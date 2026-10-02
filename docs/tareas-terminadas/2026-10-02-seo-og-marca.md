# Preview OG 1200×630 y SEO de marca Faciliter

**Fecha:** 2026-10-02
**Roadmap:** P3 — Landing, pricing y SEO (`docs/18-prioridades-cierre-mvp.md`)
**Commit:** `961151b` — feat(web): preview OG 1200x630 y SEO de marca Faciliter
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/961151b

## Resumen

Al compartir `faciliter.xyz` (Google, WhatsApp, Discord) la preview es una imagen ancha 1200×630 sin bandas vacías: isotipo de triángulo + FACILITER + tagline. Favicon e ícono Apple quedan a sangre con el mismo triángulo de la app. La home pone la marca primero en title, description y H1, y el JSON-LD declara la empresa y el producto.

## Cambios principales

- `lib/brand-image.tsx` + `app/opengraph-image.tsx` / `app/twitter-image.tsx`: imagen generada en el build (estática) con Barlow Condensed (`web/assets/fonts`, OFL).
- `app/icon.svg`, `icon.png` (512) y `apple-icon.png` (180) regenerados; fuera `public/og-stack.png`, `favicon.png`, `favicon.svg` y los PNG de OG viejos.
- Metadatos: title `Faciliter | Software de afiliaciones para gyms, clubes y estudios`; description arranca con "Faciliter"; sin `images`/`icons` manuales (las convenciones de archivos de Next generan los tags).
- Landing: kicker "Software de afiliaciones · Argentina", H1 "Faciliter: el cerebro de tus afiliados.", JSON-LD `@graph` con `Organization` + `SoftwareApplication` (`alternateName` Faciliter Brain).
- `/docs` con "Faciliter" en títulos y descripciones; `/cuenta/eliminar` en el sitemap e indexable (el middleware le ponía noindex).

## Decisiones

- Logo único: triángulo de nodos (app, favicon, OG); se deja el logo "dado".
- "Faciliter Brain" queda como nombre alternativo, no en title ni H1.
- Search Console por DNS TXT (propiedad de dominio), fuera del código.
- Sin páginas nuevas en este corte.

## Validación

- `tsc` y eslint en web; `next build` con `/opengraph-image`, `/twitter-image` e íconos estáticos.
- `next dev`: un solo `og:image` 1200×630, title/H1/JSON-LD/sitemap correctos, `/cuenta/eliminar` sin `X-Robots-Tag` y `/cuenta` con noindex.
- Lighthouse contra producción (versión anterior): escritorio 98, móvil 95; SEO 100. El cuello de botella es la respuesta del servidor (400–840 ms), no el JavaScript.
- Search Console, Sharing Debugger y Rich Results a cargo del usuario (`local/en-testeo/probar-seo-og.md`).

## Referencias

- [18-prioridades-cierre-mvp.md](../18-prioridades-cierre-mvp.md) · [08-casos-prueba-manuales.md](../08-casos-prueba-manuales.md) (M3, M3b)
- Commit: `961151b`
