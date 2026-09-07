# MCP GymBro: servidor Streamable HTTP y tools A (C3)

**Fecha:** 2026-09-07
**Roadmap:** C3 — chat/MCP (`docs/17-roadmap-chat-mcp.md`)
**Commit:** `79d3e5f` — feat(mcp): sidecar Streamable HTTP y tools A de lectura
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/79d3e5f

## Resumen

Sidecar `mcp/` en Compose (`:3011`): MCP Streamable HTTP con Bearer Staff por request. Traduce tools de lectura a GET de Nest (`GYMBRO_API_URL`). JSON recortado + `links`. Sin drawer ni LLM.

## Cambios principales

- HTTP `/health` (público) y `/mcp` (Bearer). 403 Nest → “no hay permiso”.
- Tools A: `search_members`, `get_member_account`, `preview_member_access`, `list_sessions`, `get_session`, `get_cash_day`, `suggest_nav`.
- Compose, CI typecheck, smoke (`ACCESS_TOKEN`), Postman aparte.

## Decisiones

- `mcp/` sigue siendo GymBro (no portable como `chat-api`).
- Colección Postman MCP separada de Nest y de chat-api.

## Validación

- `npm run typecheck` en `mcp/`.
- `GET /health` → `gymbro: up`; `/mcp` sin Bearer → 401.
- `npm run smoke` con JWT Staff: 7 tools, `search_members` (socio seed), `suggest_nav` → `/caja`.

## Referencias

- [16-chat-mcp-diseno.md](../16-chat-mcp-diseno.md) · [17-roadmap-chat-mcp.md](../17-roadmap-chat-mcp.md) · [mcp/README.md](../../mcp/README.md)
- Commit: `79d3e5f` / https://github.com/LucianoMocchegiani/gym-bro/commit/79d3e5f
