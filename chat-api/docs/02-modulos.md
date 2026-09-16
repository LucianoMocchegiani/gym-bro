# Módulos (`src/`)

No es un monolito Nest por bounded context de gym. Es un servicio chico partido por **capa técnica del chat**. Cada carpeta es un módulo con un trabajo claro.

```text
src/
  index.ts          arranque HTTP
  app.ts            Hono: CORS, /health, /v1/public, /v1 autenticado
  config.ts         env; falla el boot si falta required
  cors.ts           allowlist + *.localhost + CORS_APP_DOMAIN
  prisma.ts         cliente Prisma
  ensure-db.ts      CREATE DATABASE si el volumen Postgres ya existía
  auth/             quién sos
  conversations/    hilos
  messages/         persistencia + HTTP de mensajes
  agent/            un turno LLM + tools
  mcp/              cliente hacia el sidecar
  llm/              OpenRouter + errores para humanos
  public/           sesión landing + rate limit
```

## Arranque y HTTP

| Archivo | Qué hace |
|---------|----------|
| `index.ts` | `serve` en `PORT` (default 3010). |
| `app.ts` | CORS; `GET /health` (ping `SELECT 1`); monta `publicRoutes` en `/v1/public`; monta `/v1` con `requirePrincipal`, conversaciones y mensajes. `onError` serializa `HTTPException`. |
| `config.ts` | Parseo estricto. `OPENROUTER_API_KEY=replace-me` no arranca. Prompts staff/landing por default en español. |
| `cors.ts` | Refleja `Origin` si está en `CORS_ORIGIN`, es `{slug}.localhost` o cae bajo `CORS_APP_DOMAIN`. |
| `ensure-db.ts` | Conecta a database `postgres` del mismo cluster y crea el nombre de `DATABASE_URL` (ignora “already exists”). No usa Prisma. |
| `prisma.ts` | Singleton del client. |

`/health` no pide Bearer. Si la DB está caído responde `503` y `status: degraded`.

## `auth/` — identidad portable

| Archivo | Qué hace |
|---------|----------|
| `principal.ts` | Tipo `Principal` (`userId`, `tenantId`, `profileType`, email/name). Flags landing (`PUBLIC` + tenant `public`). `AppEnv` de Hono (`principal`, `accessToken`). |
| `introspect.ts` | Reenvía Bearer a `AUTH_INTROSPECT_URL`. Exige `userId` + `profileType` en JSON. 401/403 del huésped → 401; resto no-OK → 502. Perfil distinto o sin tenant → 403. Cache in-memory 30 s / 256 entradas. |
| `public-session.ts` | Emite y verifica tokens `pub1.`. HMAC-SHA256 + `timingSafeEqual`. |
| `middleware.ts` | Lee `Authorization: Bearer`. Si el token es `pub1.` verifica local (o 503 si landing off); si no, introspecta. Upsert `identities`. Setea contexto. `OPTIONS` pasa. |

**Invariante:** el dueño del hilo es el principal del middleware. Las rutas no aceptan `tenantId` en el body.

## `conversations/` — CRUD de hilos

| Archivo | Qué hace |
|---------|----------|
| `routes.ts` | `GET/POST /`, `GET/PATCH/DELETE /:id`. Query `archived=true` lista archivados. |
| `service.ts` | Filtro `ownerWhere(tenantId, userId)`. Create/list/get/update/archive. Título máx. 200. `applyAutomaticTitle` solo si `title IS NULL`. |
| `title.ts` | Primer mensaje → una línea, máx. 60 chars + `…`. Sin LLM. Vacío → `Nuevo chat`. |
| `ids.ts` | UUID de ruta o 400. |

`DELETE` no borra filas: setea `archived_at`.

## `messages/` — historial y disparo del turno

| Archivo | Qué hace |
|---------|----------|
| `routes.ts` | `GET /` lista DTOs. `POST /` valida texto (1–8000), niega archivado (409), rate-limit landing, llama `streamAgentTurn`. |
| `persist.ts` | Insert user / tool / assistant; `touchConversation`; listado cronológico. DTO expone args/result JSON. |

El `POST` no espera un JSON de respuesta de chat: **devuelve el stream** del AI SDK.

## `agent/` — un turno

| Archivo | Qué hace |
|---------|----------|
| `run.ts` | Abre MCP con el Bearer del request, lista tools (staff: todas; public: solo `get_help`), persiste el user, título automático, arma historial, `streamText`, persiste tools + assistant al terminar / abortar / error. Cierra el cliente MCP una vez. |
| `window.ts` | Recorte de prompt (tokens + shrink de tools viejas). |

Abort del cliente (`AbortSignal` del request): corta el LLM y **guarda lo ya generado** (`onAbort` / `onError`).

## `mcp/` — puerto al huésped

`client.ts`: `createMCPClient` HTTP a `CHAT_MCP_URL` con `Authorization: Bearer <token del request>`. `clientName: chat-api`. Sin token fijo de servicio.

Si MCP no arranca o `tools()` falla → **502** (texto distinto staff vs landing).

## `llm/` — proveedor

| Archivo | Qué hace |
|---------|----------|
| `openrouter.ts` | Provider strict + slug `OPENROUTER_MODEL` (default `openai/gpt-4.1-mini`). |
| `errors.ts` | Mapea 402/401/429/contexto/timeout a frases para el drawer. Sin bodies ni claves en el mensaje al usuario. Abort → string vacío (no mostrar error). |

## `public/` — widget de landing

| Archivo | Qué hace |
|---------|----------|
| `routes.ts` | `POST /v1/public/session` (sin JWT): rate limit por IP, emite token, upsert identity, crea hilo vacío, `{ token, conversation }`. |
| `rate-limit.ts` | Contador **en memoria**, ventana 1 h. Una instancia. Keys: `public-session:{ip}` (12/h) y `public-turn:{ip}:{userId}` (`CHAT_PUBLIC_MAX_TURNS_PER_HOUR`, default 24). IP: `cf-connecting-ip` o `x-forwarded-for`. |

Reiniciar el proceso resetea el tope. Varios réplicas no comparten buckets.

## Dependencias externas (adapters)

| Puerto | Adapter | Notas |
|--------|---------|--------|
| Identidad staff | HTTP GET introspect | Contrato: JSON con `userId`, `profileType`, `tenantId` |
| Tools | MCP HTTP | Catálogo dinámico |
| Modelo | OpenRouter | Una clave por instancia |
| Persistencia | Prisma → Postgres `chat` | |

GymBro concreta esos puertos en Compose (`api:3001/api/auth/me`, `mcp:3011/mcp`). El código de `chat-api` no importa `api/` ni `mcp/`.

[← Diseño](./01-diseno-y-modelo.md) · [Índice](./00-indice.md) · [Flujos →](./03-flujos.md)
