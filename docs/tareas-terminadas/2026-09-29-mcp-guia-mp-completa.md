# Guía MP completa en el asistente (get_help)

**Fecha:** 2026-09-29
**Roadmap:** C6 / cobros Faciliter
**Commit:** `1e92280` — docs(mcp): guía MP completa en get_help y prompts del chat
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/1e92280d56144e3e3e5b5af834e8789caf919d9a

## Resumen

`get_help` topic `mercadopago` replica la guía de Config (pasos, URL, cuatro topics, checklist, errores, anexo admin). Los prompts de chat-api piden no resumir esa respuesta.

## Cambios principales

- `mcp/help/mercadopago.md` y descripción de `get_help`
- `DEFAULT_STAFF_PROMPT` / público en `chat-api` y `.env.example`

## Validación

- A cargo del usuario en VPS: rebuild mcp + chat-api; alinear `CHAT_SYSTEM_PROMPT` si está en `.env`

## Referencias

- `docs/uso/configurar-mercadopago-tenant.md`
- Commit: `1e92280` / https://github.com/LucianoMocchegiani/gym-bro/commit/1e92280d56144e3e3e5b5af834e8789caf919d9a
