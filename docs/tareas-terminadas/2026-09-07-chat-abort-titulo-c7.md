# Abort, título automático y errores OpenRouter (C7 parcial)

**Fecha:** 2026-09-07
**Roadmap:** C7 — chat/MCP (`docs/17-roadmap-chat-mcp.md`)
**Commit:** `4e1a568` — feat(chat-api): abort, titulo automatico y errores OpenRouter
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/4e1a568

## Resumen

El drawer puede cortar la generación y queda lo ya stremeado. El primer mensaje titula el hilo (editable). Fallos de OpenRouter (crédito, clave, saturación) se muestran en castellano.

## Cambios principales

- `AbortSignal` del fetch → `streamText`; persistencia una sola vez en finish/abort/error.
- Título auto si `title IS NULL`; input en el hilo + `PATCH`.
- Mapper `staffFacingLlmError` y botón Parar en el composer.

## Decisiones

- Título = recorte del primer mensaje, sin llamada extra al LLM.
- Abort guarda parcial; no descarta el turno.
- Tope de uso, chips y smoke dos staff quedan pendientes en C7.

## Validación

- `npm run typecheck` en `chat-api/` y `npx tsc --noEmit` en `web/`.
- OK del usuario en el drawer (título, Parar, errores).

## Referencias

- [16-chat-mcp-diseno.md](../16-chat-mcp-diseno.md) · [17-roadmap-chat-mcp.md](../17-roadmap-chat-mcp.md)
- Commit: `4e1a568` / https://github.com/LucianoMocchegiani/gym-bro/commit/4e1a568
