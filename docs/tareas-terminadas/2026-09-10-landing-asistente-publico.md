# Landing Faciliter Brain y asistente público

**Fecha:** 2026-09-10
**Roadmap:** P3 — landing + SEO (`docs/18-prioridades-cierre-mvp.md`)
**Commit:** `a428ca4` — feat(web): landing Faciliter Brain y asistente publico
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/a428ca4af8c26173a171be1528d78c938e72eb74

## Resumen

El apex (`localhost:3002` / dominio de plataforma) es el sitio comercial de Faciliter Brain. El Admin sigue en el subdominio del gym. La burbuja de la landing reusa el drawer del Admin con sesión anónima: MCP solo `get_help`, sin datos de un tenant.

## Cambios principales

- Landing: copy de afiliaciones (gyms, clubes, estudios), plan a convenir, SEO, legales borrador.
- `get_help` topic `producto` y artículos de packs, caja, puerta, etc. ampliados.
- `POST /v1/public/session` + burbuja pública (mismo `AssistantLauncher`).
- Header sin Acceder/Agendá por ahora; docs de uso web+app diferidas a backlog.

## Decisiones

- Nombre comercial Faciliter; código interno no se renombra.
- Tienda de productos y noticias del local: próximamente, no como vivos.
- Docs de uso (apartado tipo Kuatia, Admin + app): diseño después.

## Validación

- Landing en apex, burbuja abre drawer, copy de plan y CTA revisados a mano.
- `chat-api` typecheck; eslint de drawer/landing.

## Referencias

- [18-prioridades-cierre-mvp.md](../18-prioridades-cierre-mvp.md) P3
- [16-chat-mcp-diseno.md](../16-chat-mcp-diseno.md) decisión 18
- Commit: `a428ca4` / https://github.com/LucianoMocchegiani/gym-bro/commit/a428ca4af8c26173a171be1528d78c938e72eb74
