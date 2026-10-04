# Web del gym editable: colores para tema claro y tema oscuro

**Fecha:** 2026-10-04
**Roadmap:** Web del gym (post-MVP)
**Commit:** `8fc4511` — feat(web-gym): colores por tema claro y oscuro en la web editable
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/8fc4511

## Resumen

La web del gym solo tenía una configuración de colores, pero cada visitante la ve en tema claro u oscuro. Ahora la portada y cada slide tienen colores separados para los dos temas (tono del texto, capa y color del título) y comparten una sola imagen. La web pública pinta los colores del tema del visitante sin parpadeo, y el editor permite configurar y previsualizar cada tema.

## Cambios principales

- API: `SiteVisual` pasa a `{ image, light, dark }`, donde cada tema es `{ tone, accent, overlay }`. El DTO valida los dos temas anidados y el contraste del título se exige en ambos (400 con el tema en el mensaje).
- Compatibilidad: el contenido guardado con el formato anterior (tono, acento y capa sueltos) se lee copiando esos valores a los dos temas, sin migración. Aplica al GET del staff y al catálogo público.
- Web: `SiteFrame` manda las variables CSS de los dos temas y `marketing.css` elige según `data-theme`, así el script del `<head>` decide antes de pintar. Los bloques sin imagen llevan un borde suave para no perderse contra la página.
- Editor: recuadro con pestañas **Tema claro / Tema oscuro** (con «!» si ese tema no se lee) y «Copiar del otro tema». La vista previa tiene las mismas pestañas y fuerza el tema elegido; el estado es compartido entre portada, slides y vista previa.
- `site-contrast.ts` (API y web) recibe los colores de un tema y si hay imagen.

## Decisiones

- Una sola imagen para los dos temas; por tema cambian tono, capa y color del título.
- Defaults: tema claro con texto oscuro y tema oscuro con texto claro, para que cada uno combine con su página.
- El editor arranca en el tema oscuro, que es el default de la web.

## Validación

- API: `tsc`, eslint y `site-contrast.spec.ts` (5 tests) OK.
- Web: `tsc`, eslint de los archivos tocados y `next build` OK.
- Docs: RN-CTA-010, CU-CTA-010, `07` §18, `08` G36 y G43 nuevo, `09` §4.21b, guía, ayuda del MCP y Postman (bodies con `light`/`dark`).
- Prueba manual pendiente: sección «Tema claro y tema oscuro» de `local/en-testeo/web-gym-editable.md`.

## Referencias

- Tarea anterior: [Web del gym editable](./2026-10-04-web-gym-editable.md).
- Commit: `8fc4511` / https://github.com/LucianoMocchegiani/gym-bro/commit/8fc4511
