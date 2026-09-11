# Drawer del asistente, marca pública y agenda Calendar

**Fecha:** 2026-09-10
**Roadmap:** P3 landing + post-MVP C5 (asistente)
**Commit:** `19cfd05` — feat(web): drawer del asistente, marca publica y agenda Calendar
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/19cfd05171ba904a6c89db5819b4155a738af5c8

## Resumen

El asistente (landing y Admin) pasa a drawer angosto con expandir a pantalla completa. La landing queda sin mock de celular. Faciliter tiene favicon y preview al compartir. **Agendá una reunión** abre Google Calendar.

## Cambios principales

- Drawer MP-like: historial a pantalla completa, expandir fullscreen, CSS del componente.
- Landing: hero de una columna; CTA a `https://calendar.app.google/dcTzccnNjB6tTLXR8`.
- Marca: favicon SVG/PNG y OG cuadrado (logo + FACILITER).
- Contacto comercial: `faciliterapps@gmail.com` (footer/legales).

## Decisiones

- Expandir ocupa toda la ventana; en viewport angosto el cambio se nota por layout centrado.
- Preview de WhatsApp en cuadrado (el recorte 16:9 cortaba el texto).
- Footer sigue en mailto; los botones de agendar van a Calendar.

## Validación

- Landing y Admin: drawer, expandir, historial, disclaimer.
- `/og-stack.png` y `/icon.svg` en local.
- CTA abre Calendar; WhatsApp puede cachear la preview vieja hasta un chat nuevo post-deploy.

## Referencias

- [07-wireframes-ascii.md](../07-wireframes-ascii.md) §17
- [18-prioridades-cierre-mvp.md](../18-prioridades-cierre-mvp.md) P3
- Commit: `19cfd05` / https://github.com/LucianoMocchegiani/gym-bro/commit/19cfd05171ba904a6c89db5819b4155a738af5c8
