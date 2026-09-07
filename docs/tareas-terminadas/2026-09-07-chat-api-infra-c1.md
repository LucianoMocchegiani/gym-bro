# chat-api: scaffold, DB `chat` y health (C1)

**Fecha:** 2026-09-07
**Roadmap:** C1 — chat/MCP (`docs/17-roadmap-chat-mcp.md`)
**Commit:** `7e886d7` — feat(chat-api): scaffold Hono, DB chat y health en Compose
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/7e886d7

## Resumen

Servicio portable `chat-api` (Hono + Prisma, Node 24) en Compose, puerto 3010. Postgres del stack tiene una segunda database `chat`. `GET /health` hace ping a esa DB. Cero strings `GYMBRO_*`. Todavía no hay hilos, introspect ni LLM.

## Cambios principales

- Paquete `chat-api/` (config, Prisma, Docker, CI).
- Init SQL + `ensure-db.ts` para crear `chat` en volúmenes nuevos y existentes.
- Tablas `identities`, `conversations`, `messages` (migración `20260907120000_init`).

## Decisiones

- Env de C4/C2 (`OPENROUTER_*`, `AUTH_*`, `CHAT_MCP_URL`) ya es required al arrancar, aunque C1 no las use.
- Health `503` si la DB no responde (probe de Compose).

## Validación

- `npm run typecheck` en `chat-api`.
- Health en Compose: `GET http://localhost:3010/health` → `status: ok`.

## Referencias

- [16-chat-mcp-diseno.md](../16-chat-mcp-diseno.md) · [17-roadmap-chat-mcp.md](../17-roadmap-chat-mcp.md)
- Commit: `7e886d7` / https://github.com/LucianoMocchegiani/gym-bro/commit/7e886d7
