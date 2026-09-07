# Drawer Admin del asistente (C5)

**Fecha:** 2026-09-07
**Roadmap:** C5 — chat/MCP (`docs/17-roadmap-chat-mcp.md`)
**Commit:** `e6758ef` — feat(web): drawer Admin del asistente con chat-api
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/e6758ef

## Resumen

Drawer en el topbar Staff: lista de hilos, composer + stream, historial. Usa el JWT de sesión contra `chat-api`. Caja sigue detrás. Sin ruta `/asistente`.

## Cambios principales

- `web/lib/api/chat.ts` + `AssistantLauncher` en `AdminShell`.
- Tools en una línea; archivar desde el sidebar; al abrir retoma el último hilo.
- `NEXT_PUBLIC_CHAT_API_URL`. `chat-api` CORS: `*.localhost` + `CORS_APP_DOMAIN` (túnel `{slug}.faciliter.xyz`).

## Decisiones

- Abort, título automático y chips quedan en C7.
- Disclaimer: “Puede equivocarse; no cobra solo.”

## Validación

- `npx tsc --noEmit` en `web/` y `chat-api/`.
- Drawer en `https://gym-de-prueba.faciliter.xyz`: stream + tools; CORS preflight 204 con `CORS_APP_DOMAIN`.

## Referencias

- [16-chat-mcp-diseno.md](../16-chat-mcp-diseno.md) · [17-roadmap-chat-mcp.md](../17-roadmap-chat-mcp.md)
- Commit: `e6758ef` / https://github.com/LucianoMocchegiani/gym-bro/commit/e6758ef
