# chat-api: agente OpenRouter, MCP y stream de mensajes (C4)

**Fecha:** 2026-09-07
**Roadmap:** C4 — chat/MCP (`docs/17-roadmap-chat-mcp.md`)
**Commit:** `aa65198` — feat(chat-api): agente OpenRouter, MCP y stream de mensajes
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/aa65198

## Resumen

`chat-api` abre el MCP de la instancia con el JWT del staff, llama a OpenRouter y stremea UI Message Stream. Persiste user / tool / assistant. Sigue sin conocer afiliados ni Nest. Sin drawer.

## Cambios principales

- Cliente MCP (`CHAT_MCP_URL` + Bearer del request) y `streamText` con tools A.
- `POST /v1/conversations/:id/messages` (SSE) y `GET …/messages` (historial).
- Ventana ~10k tokens (tools viejas a una línea) y tope de 8 pasos.
- Compose: `chat-api` espera `mcp` healthy. Postman chat-api: POST stream + GET.

## Decisiones

- GET de historial en C4 (C5 lo reusa). Título automático queda en C7.
- `docker compose restart` no recarga `env_file`; hay que recrear el contenedor. Placeholder `replace-me` falla al boot.

## Validación

- `npm run typecheck` en `chat-api/`.
- POST con JWT Staff: `search_members` (`q: Socio`) → Socio Gym de Prueba; stream `finishReason: stop`.
- Sin key real / contenedor con placeholder → 401 OpenRouter (`Missing Authentication header`).

## Referencias

- [16-chat-mcp-diseno.md](../16-chat-mcp-diseno.md) · [17-roadmap-chat-mcp.md](../17-roadmap-chat-mcp.md) · [chat-api/.env.example](../../chat-api/.env.example)
- Commit: `aa65198` / https://github.com/LucianoMocchegiani/gym-bro/commit/aa65198
