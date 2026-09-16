# Diseño y modelo

## Qué es

`chat-api` es el **motor del asistente**: conversaciones, historial, stream del modelo y cliente MCP. Es **infra portable** (como Redis): GymBro se enchufa con env; este paquete **no** conoce afiliados, caja, packs ni rutas Nest.

Otra plataforma = **otra instancia** (otro Compose + env). Misma imagen. Cero strings `GYMBRO_*`.

```text
Staff / visitante (web)
        │  Bearer (JWT Staff o sesión HMAC pub1.)
        ▼
   chat-api :3010     ← hilos en Postgres `chat`, OpenRouter, stream UI
        │  Bearer del request
        ▼
   MCP (huésped)      ← en GymBro: sidecar mcp/
        │  mismo Bearer Staff (landing: no hay tools de gym)
        ▼
   API del producto   ← Nest en GymBro; permisos de siempre
```

La UI, el login y las tools viven en el **huésped**. El chat solo pide identidad (`AUTH_INTROSPECT_URL`) y tools (`CHAT_MCP_URL`).

## Qué no hace

- No cobra, no enrola débito, no escribe negocio.
- No tiene passwords ni `JWT_ACCESS_SECRET`.
- No mezcla tenants: `tenantId` y `userId` salen del principal autenticado, nunca del body.
- No implementa las tools: las descubre en runtime (`tools/list` del MCP).
- Tope de uso por staff: pendiente (landing sí tiene rate limit).

## Stack

| Pieza | Valor |
|-------|--------|
| HTTP | Hono + `@hono/node-server`, Node 24 |
| ORM | Prisma 6, database **`chat`** (mismo Postgres Compose, **otro** database que `gymbro`) |
| LLM | Vercel AI SDK + OpenRouter (`@openrouter/ai-sdk-provider`) |
| Tools | `@ai-sdk/mcp` HTTP hacia `CHAT_MCP_URL` |
| Stream | UI Message Stream (`toUIMessageStreamResponse`) |

Arranque del contenedor: `ensure-db` (crea la database si el volumen ya existía) → `prisma migrate deploy` → `node dist/index.js`. En dev Compose: `tsx src/ensure-db.ts` + migrate + `tsx watch`.

## Principios

1. **Controllers delgados.** Rutas parsean JSON y delegan; reglas de dueño y persistencia en servicios.
2. **Un MCP por instancia.** No se agregan servidores en runtime.
3. **Una instancia, todos los gyms del huésped.** El aislamiento es el JWT (`tenantId` + `sub`), igual que `web/`.
4. **Historial intacto en DB.** La ventana de tokens recorta el **prompt**, no las filas.
5. **System prompt fuera del recorte de historial.** Va en `streamText({ system })`, no como fila `system`.

## Identidad (no es una cuenta nueva)

| Modo | Token | Cómo se resuelve | Principal |
|------|--------|------------------|-----------|
| Staff | JWT del huésped | `GET AUTH_INTROSPECT_URL` con el mismo Bearer. Cache ~30 s por hash SHA-256. No se verifica firma localmente. | `profileType` debe ser `AUTH_REQUIRED_PROFILE` (GymBro: `STAFF`) y traer `tenantId` |
| Landing | `pub1.{payload}.{hmac}` | Firma HMAC local (`CHAT_PUBLIC_SESSION_SECRET` o derivado). TTL 24 h. **No** llama a Nest. | `tenantId = public`, `profileType = PUBLIC`, `userId` = UUID de sesión |

Tras resolver, se hace **upsert** en `identities` (`last_seen_at`, email/nombre si hay). Es cache de quién habló, no login propio.

El Bearer del request se reenvía al MCP. En landing el MCP ve un token `pub1.`; el sidecar GymBro filtra tools a `get_help`. `chat-api` además recorta el catálogo a `get_help` en modo `public`.

### Introspección (staff)

`chat-api` **no** tiene `JWT_ACCESS_SECRET` y **no** parsea el JWT. Pregunta al huésped: “¿este Bearer es válido y quién es?”

```text
Admin (ya logueado)
  Authorization: Bearer <accessToken GymBro>
        │
        ▼
chat-api  requirePrincipal
  token empieza con pub1.  →  HMAC local (landing; acá no)
  si no                    →  resolvePrincipal
        │
        ├─ cache RAM: SHA-256(token) → Principal, TTL 30 s, máx. 256
        │
        └─ miss: GET AUTH_INTROSPECT_URL
                 Header: Authorization: Bearer <mismo token>
                 Timeout 8 s
                        │
                        ▼
              Nest  GET /api/auth/me  (JwtAuthGuard)
              verifica firma y expiry con SU secreto
              200 { userId, email, profileType, tenantId?, impersonatedBy? }
```

En GymBro Compose: `AUTH_INTROSPECT_URL=http://api:3001/api/auth/me` y `AUTH_REQUIRED_PROFILE=STAFF`. Otra plataforma apunta al `/me` equivalente.

**Qué se exige del JSON** (`introspect.ts`): `userId` y `profileType` (si faltan → 502, el contrato está mal). `tenantId` obligatorio para entrar al chat (si no → 403). `email` / `name` opcionales. El `GET /api/auth/me` de Nest hoy **no** manda `name` en el root; `identities.name` suele quedar vacío en staff.

**Filtro de perfil:** `profileType` tiene que ser exactamente `AUTH_REQUIRED_PROFILE`. Socio (`MEMBER`) o Super sin impersonar (`SUPER`, y además sin `tenantId`) no usan el drawer Admin. Impersonate Super **sí**: Nest emite JWT Staff con `tenantId` del gym.

**Códigos** (si no hay cache):

| Respuesta del `/me` | chat-api |
|---------------------|----------|
| 401 o 403 | 401 Unauthorized |
| red caída, timeout, 5xx, body no JSON, sin `userId`/`profileType` | 502 |
| 200 pero perfil ≠ STAFF | 403 Forbidden profile |
| 200 STAFF sin `tenantId` | 403 Tenant required |
| 200 STAFF + tenant | principal + cache 30 s |

**Qué no es.** No es OAuth introspection RFC 7662. No hay tabla de passwords. El **refresh** lo hace `web/` contra Nest (`refreshStaffAccess`); si el access venció, el drawer reintenta el request a chat-api con el token nuevo. Logout del Admin tira la sesión: el próximo introspect da 401.

Landing **no** pasa por acá: token `pub1.` se verifica en proceso.

## Modelo de datos

Sin FKs al schema GymBro. IDs de tenant/user son **texto** copiado del huésped.

```text
identities 1─── (lógico, mismo par tenant+user)
conversations 1──N messages
```

### `identities`

| Campo | Rol |
|-------|-----|
| `tenant_id` + `user_id` | Unique. Staff: gym + persona. Landing: `public` + session id |
| `email`, `name` | Eco de introspección; landing: nombre `Landing` |
| `last_seen_at` | Último request autenticado |

### `conversations`

Un hilo del sidebar (como ChatGPT), no un tweet.

| Campo | Rol |
|-------|-----|
| `tenant_id`, `user_id` | Dueño. Todo list/get/patch filtra por este par |
| `title` | `null` hasta el primer mensaje (recorte del texto, sin LLM) o título al crear. `PATCH` no se pisa después |
| `archived_at` | Archivo lógico. `DELETE` = archivar. Mensajes en archivado → 409 |
| `updated_at` | Orden del listado; se toca al persistir turnos |

Índice: `(tenant_id, user_id, updated_at DESC)`. Listado tope 100.

### `messages`

| Campo | Rol |
|-------|-----|
| `role` | `user` \| `assistant` \| `tool` (no hay filas `system`) |
| `content` | Texto para UI y prompt. En tools: resumen (`search → 3 hits`) |
| `tool_name`, `tool_args`, `tool_result` | JSON crudo para el siguiente turno y debug |
| `created_at` | Orden del hilo |

`ON DELETE CASCADE` desde conversación. Listado tope 500 por hilo.

PII de negocio (nombre, documento, deuda) **puede** quedar en `content` / `tool_result`. Fuente de verdad sigue siendo Nest. No copiar estas tablas al Postgres `gymbro`.

## Ventana de contexto (prompt)

`CHAT_CONTEXT_TOKENS` (default 10 000). Estimación: `ceil(chars / 4)`.

- Se mapean filas a mensajes del modelo (tools y user van como `user`; assistant como `assistant`).
- Las **dos** tools más recientes se dejan más enteras (tope ~1500 chars); las viejas → una línea (`tool → N hits` o `tool → ok`).
- Se llena de **atrás hacia adelante** hasta el presupuesto; lo que no entra **no se borra** de DB.

`CHAT_MAX_TOOL_STEPS` (default 8) corta round-trips del agente.

## Configuración de instancia

Ver `.env.example`. Lo que cambia entre productos: URLs de introspect y MCP, CORS, prompts, clave OpenRouter. Lo que no: código de hilos/stream.

[Índice](./00-indice.md) · [Módulos →](./02-modulos.md)
