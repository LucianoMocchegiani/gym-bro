# Preview de ingreso sin persistir intentos (C0)

**Fecha:** 2026-09-07
**Roadmap:** C0 — chat/MCP (`docs/17-roadmap-chat-mcp.md`)
**Commit:** `90de132` — feat(api): preview de ingreso sin persistir access_attempts
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/90de132

## Resumen

Staff puede consultar si un afiliado podría entrar ahora con las mismas RN de puerta, sin escribir `access_attempts` ni marcar asistencia. El GET queda listo para el MCP (`preview_member_access`).

## Cambios principales

- Evaluación de puerta extraída a `evaluateDecision` (OID4VP reusa y sigue persistiendo).
- `GET /api/members/:memberId/access-preview` (`access.verify`).
- Postman, `docs/09`, diseño/roadmap chat (`16` / `17`).

## Decisiones

- Afiliado inexistente en el tenant → 404 (no deny persistido).
- Cuerpo incluye `reasonLabel`, reserva/sesión y días de deuda para no forzar otra ronda.

## Validación

- Typecheck API OK.
- Prueba manual: preview repetido no suma filas en `GET /access-attempts`.

## Referencias

- RN-ACC-004..007, CU-ACC-001.
- [16-chat-mcp-diseno.md](../16-chat-mcp-diseno.md) · [17-roadmap-chat-mcp.md](../17-roadmap-chat-mcp.md)
- Commit: `90de132` / https://github.com/LucianoMocchegiani/gym-bro/commit/90de132
