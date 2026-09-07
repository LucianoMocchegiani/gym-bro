# chat-api: introspect JWT y CRUD de hilos (C2)

**Fecha:** 2026-09-07
**Roadmap:** C2 — chat/MCP (`docs/17-roadmap-chat-mcp.md`)
**Commit:** `9fd320e` — feat(chat-api): introspect JWT y CRUD de conversaciones
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/9fd320e

## Resumen

`chat-api` valida el Bearer contra `AUTH_INTROSPECT_URL` (GymBro: `GET /api/auth/me`), exige `STAFF` con `tenantId`, y persiste hilos aislados por gym + usuario. Sin LLM ni MCP.

## Cambios principales

- Introspect + cache ~30s; upsert `identities`.
- `GET/POST /v1/conversations` y `GET/PATCH/DELETE /v1/conversations/:id` (DELETE archiva).
- Colección Postman aparte: `postman/GymBro.chat-api.postman_collection.json`.

## Decisiones

- El `tenantId` sale del introspect, nunca del body.
- Colección chat-api separada de Nest; reusa `accessToken` del environment **GymBro Local**.

## Validación

- `npm run typecheck` en `chat-api`.
- Postman/curl: login Staff → CRUD hilos; Member → 403; sin token → 401.

## Referencias

- [16-chat-mcp-diseno.md](../16-chat-mcp-diseno.md) · [17-roadmap-chat-mcp.md](../17-roadmap-chat-mcp.md)
- Commit: `9fd320e` / https://github.com/LucianoMocchegiani/gym-bro/commit/9fd320e
