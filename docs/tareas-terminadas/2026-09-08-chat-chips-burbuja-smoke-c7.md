# Chips, burbuja del asistente y smoke C7

**Fecha:** 2026-09-08
**Roadmap:** C7 — chat/MCP (`docs/17-roadmap-chat-mcp.md`)
**Commit:** `8fc964d` — feat(web): burbuja del asistente, chips y smoke C7
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/8fc964d

## Resumen

El asistente sale del topbar y queda como burbuja fija abajo a la derecha. Los `links` de las tools (y rutas Admin escritas en el texto) se muestran como chips que navegan y cierran el drawer. Smoke con Admin y Profesor; seed del Profesor. README de `chat-api/` (analogía Redis). Tope de uso sigue fuera.

## Cambios principales

- Burbuja FAB en `AdminShell` (portal a `body`); oculta con el drawer abierto.
- Chips: `web/lib/chat/links.ts` + `MessageThread` + `router.push`.
- Smoke: login Admin + Profesor; periodos distintos; 403 de caja/débito para Profesor.
- Seed `profesor@gymdeprueba.com` (sin `cashier.operate`).

## Decisiones

- Solo href relativos del Admin (`ADMIN_NAV_PERMISSIONS`). También se parsean del markdown/texto si el modelo no llamó tool.
- FAB se oculta al abrir: el panel ya tiene cierre.

## Validación

- OK del usuario en el Admin (burbuja + chips).
- Requiere reseed para el Profesor: `docker compose exec api npm run prisma:seed`.

## Referencias

- [16-chat-mcp-diseno.md](../16-chat-mcp-diseno.md) · [17-roadmap-chat-mcp.md](../17-roadmap-chat-mcp.md)
- Commit: `8fc964d` / https://github.com/LucianoMocchegiani/gym-bro/commit/8fc964d
