# Asistente chat + MCP — diseño

**Estado:** Cerrado (diseño; **sin código**). Árboles de archivos = **acercamiento**: al implementar se pueden unir, partir o renombrar archivos sin reabrir las decisiones de producto.  
**Fecha:** 2026-09-02 (cierre 2026-09-04)  
**Fuera de MVP.** La IA está explícitamente out en el [documento maestro](./01-documento-maestro.md).  
**Backlog:** [admin.md](./99-backlog-post-mvp/admin.md) · [tecnico.md](./99-backlog-post-mvp/tecnico.md)  
**Tareas:** [17-roadmap-chat-mcp.md](./17-roadmap-chat-mcp.md)

No es C-producto (sin RN/CU/wireframes). Este archivo fija despliegue, identidad, persistencia y el contrato de infra. Nest no implementa el agente.

---

## 1. Decisiones cerradas

| # | Tema | Valor |
|---|------|--------|
| 1 | Dónde corre el agente | **Fuera de Nest.** `chat-api` (AI SDK + MCP + OpenRouter). Cero módulo assistant en `api/src`. |
| 2 | Cómo se reutiliza | Como infra (Postgres, Redis, RabbitMQ): **otra instancia** + config distinta. No un SaaS único con N plataformas en el mismo proceso. |
| 3 | MCP por instancia | **Uno.** La instancia nace apuntando a un servidor MCP (`CHAT_MCP_URL`). GymBro no “agrega MCPs” en runtime. |
| 4 | Auth de esa instancia | **La del producto huésped.** En GymBro: login Staff de hoy (`tenantSlug` + email + password → access + refresh). El chat **no** tiene usuarios/password propios. |
| 5 | MCP GymBro | Sidecar `mcp/` en este monorepo. Solo traduce tools → HTTP de la API existente. JWT Staff en cada llamada. |
| 6 | Multi-gimnasio | Una instancia de chat sirve a **todos los tenants** de ese GymBro (igual que `web/` hoy). El aislamiento lo da el JWT (`tenantId` + `sub`) que viaja al MCP. |
| 7 | Conversaciones | Privadas por **staff**. María (Demo) no ve los chats de Ana (otro gym) ni los de Pedro (mismo gym). |
| 8 | Código ahora | No. Planificación → este doc → implementación cuando se pida. |
| 9 | Título de conversación | Como ChatGPT: automático (primer mensaje / resumen), editable después. |
| 10 | Postgres del chat | Mismo contenedor Compose, **otra database** `chat`. |
| 11 | UI + login | **Ambas:** `chat-api` servicio aparte; drawer en el Admin; un JWT Staff. |
| 12 | Runtime IA | Sin OpenCode. `chat-api` = Vercel AI SDK + MCP SDK + OpenRouter. |
| 13 | Validar JWT (A.1) | Introspección: `GET /api/auth/me` con el Bearer. chat-api no guarda `JWT_ACCESS_SECRET`. |
| 14 | Stack chat-api (A.2) | Hono + Prisma + Node 24. |
| 15 | Contexto largo | v1: ventana por **tokens** + `tool_result` viejos a una línea en el prompt; historial intacto en DB. v2: summary buffer. No borrar filas por cantidad. System prompt siempre fuera del resumen. |
| 16 | Catálogo MCP v1 | Lectura: operación + reportes/períodos (2 llamadas) + débitos/devoluciones list + catálogo/roles/audit slim + `get_help`. Sin writes. Preview ingreso = GET Nest nuevo. Sin tool `compare_reports`. |
| 17 | Árbol de archivos | **Acercamiento** (§10). No es contrato: al codear se puede mover. Invariantes: `chat-api` sin GymBro; `mcp/` GymBro; drawer en `web/`. |

---

## 2. Analogía de infra

```text
Producto A (GymBro)                         Producto B (otra plataforma)
docker compose                              otra compose / otro cluster
  postgres          (negocio)                 postgres
  redis                                       …
  api / web                                   api / web
  mcp               ← tools GymBro            mcp-B
  chat-api          (infra, tipo Redis)       chat-api
  web Admin         drawer → chat-api         host o chat-web
                    mismo JWT Staff
```

Misma imagen/código de `chat-api` / `chat-web`. Cambia env: URL del MCP, URLs de login/refresh, clave LLM. El chat **no conoce** afiliados, packs ni caja; descubre tools en runtime (`tools/list` de MCP).

---

## 3. Qué es una “conversación” (no un hilo de Twitter)

**Conversación** = un chat guardado, como una fila del sidebar de ChatGPT.

Un staff logueado puede tener muchas conversaciones (temas distintos). Cada una tiene su historial de mensajes. “Hilo” en la charla previa = esto; en producto usamos **conversación**.

```text
Instancia chat (un GymBro, un MCP)

  Staff María · tenant Demo Gym · JWT A
    ├── Conversación “¿Juan puede entrar?”     12 mensajes
    └── Conversación “Arqueo del lunes”         4 mensajes

  Staff Pedro · tenant Demo Gym · JWT B   ← mismo gym, otra persona
    └── Conversación “Alta pack mensual”

  Staff Ana · tenant Gym de Prueba · JWT C
    └── Conversación “Deuda de López”
```

| Capa | Qué aísla | Cómo |
|------|-----------|------|
| Instancia | Un producto (GymBro vs otra app) | Otro deploy + otro MCP |
| Tenant | Un gimnasio | `tenantId` del JWT Staff; el MCP llama a la API con ese Bearer |
| Staff | Una persona | `sub` del JWT; las conversaciones se guardan con `(tenant_id, user_id)` |
| Conversación | Un tema / historial | Filas en la DB del chat; el modelo solo recibe **esa** conversación |

El MCP no “cambia de gym” dentro de un turno: el Bearer es el del login. Si María trabaja en dos gyms, son **dos logins** (como en el Admin: otro slug / otro host) y dos listados de conversaciones.

Compartir una conversación entre todo el staff del gym: **fuera de este diseño** (después).

---

## 4. Identidad (sin tabla de passwords en el chat)

Al loguearse, el chat llama a la API huésped (GymBro):

```http
POST /api/auth/staff/login
{ "tenantSlug": "demo", "email": "…", "password": "…" }
```

Respuesta ya existente: `accessToken`, `refreshToken`, `user.id`, `user.tenantId`, `user.email`.

El chat **upsert** una identidad local (no es una cuenta nueva):

```text
identities
  tenant_id     ← user.tenantId
  user_id       ← user.id        (staff GymBro)
  email, name
  refresh_token_encrypted
```

Password: no se persiste. Access: memoria/Redis + refresh igual que `web/lib/api/client.ts`. Si el refresh muere, hay que volver a loguear.

**Contrato para otra instancia** (otro MCP / otro producto): login + refresh que devuelvan lo mismo a nivel conceptual:

- `accessToken` / `refreshToken` / `expiresIn`
- sujeto: `id`, `tenantId` (o equivalente), `email`, `name`

Si el otro producto no matchea, esa instancia lleva un adapter de auth chico. El núcleo del chat (conversaciones, stream, cliente MCP) no cambia.

---

## 5. Persistencia del chat (DB distinta a GymBro)

Postgres **propio** del servicio chat (en dev: mismo servidor Compose, otra database `chat`; no tablas en el schema Prisma de GymBro).

```text
identities          staff/huésped cacheado (ver §4)
conversations       id, tenant_id, user_id, title, created_at, updated_at, archived_at
messages            id, conversation_id, role, content, tool_*, created_at
```

`role`: `user` | `assistant` | `system` | `tool`.

Las filas `tool` (nombre, args, resultado) sirven para el **siguiente turno** del modelo y para debug. La UI puede mostrar un resumen (“Busqué afiliados”) sin el JSON crudo.

PII (nombre, documento, deuda) puede aparecer en `messages`: cifrado en reposo a decidir en implementación; nunca copiar eso al Postgres de GymBro. Fuente de verdad de negocio = API GymBro vía MCP.

Listado de conversaciones: siempre `WHERE tenant_id = ? AND user_id = ?`. Sin eso, un bug mezcla gyms.

---

## 6. Runtime de un turno

```text
Staff (chat-web)
  → POST chat-api  /conversations/:id/messages   Bearer sesión-chat
  → chat-api refresca JWT GymBro si hace falta
  → LLM + tools MCP (CHAT_MCP_URL)
        Authorization: Bearer <access GymBro>
  → gymbro-mcp → GET/POST api:3001/api/…  (permisos Nest de siempre)
  → stream SSE al web
  → persistir mensajes en DB chat
```

El chat-api impone tope de tool-calls y ventana de contexto (últimos N mensajes). No hay system prompt de dominio GymBro en el núcleo: el MCP aporta descriptions de tools; opcionalmente un `CHAT_SYSTEM_PROMPT` por instancia (env/archivo de config).

Writes peligrosos (devolver, débito, cancelar contrato): **out** de la primera entrega. El MCP GymBro v1 es de **lectura** (+ tal vez `suggest_nav` si se define). Confirmación genérica de mutaciones = fase 2 del MCP, no del núcleo chat.

---

## 7. MCP GymBro (`mcp/` en este repo)

Proceso aparte. No agrega controllers a Nest.

- Transport: **HTTP** (un proceso, muchos staff; Bearer por request). Stdio queda para uso local (Cursor), no para el chat multi-tenant.
- Tools v1 (borrador, a cerrar cuando se implemente): búsqueda de afiliados, estado de cuenta, preview de ingreso **sin** persistir `access_attempts`, listado corto de sesiones. Catálogo corto de intents, no espejo de toda la API.
- 401/403 de la API se devuelven al modelo; el chat no bypassa `PermissionGuard`.

---

## 8. In / out de esta entrega (cuando se implemente)

**In**

- `chat-api` + `chat-web` reutilizables, un MCP por instancia.
- Login Staff GymBro; conversaciones persistidas por `(tenant, staff)`.
- Sidecar `mcp/` lectura + Compose (servicios nuevos, DB `chat`).
- UI tipo sidebar de conversaciones + panel de mensajes + stream.

**Out**

- Módulo IA dentro de Nest / Prisma GymBro.
- Multi-MCP en una misma instancia.
- Usuarios propios del chat.
- Conversaciones compartidas del gym.
- Writes / cobros / débito vía agente.
- Super Admin como actor del chat (salvo impersonate Staff, que ya es JWT Staff).
- App afiliado / Flutter.
- RN/CU/wireframes C-producto (se escriben al cerrar el cráneo, no en este borrador).

---

## 9. UI + login: las dos a la vez (P1, cerrado)

No es app aparte **o** embebido. Es el patrón BullMQ:

| Capa | Dónde | Analogía |
|------|--------|----------|
| Motor | `chat-api` proceso aparte | Redis / BullMQ: GymBro **se conecta**, no lo implementa |
| Pantalla en GymBro | Drawer / panel **dentro del Admin** (`web/`) | Nest usa BullMQ; el código de negocio no vive en Redis |
| Login | **Uno:** el Staff de siempre | El worker no pide otro usuario; usa la conexión ya abierta |
| Otra plataforma | Misma imagen `chat-api` + su MCP; UI = su host o `chat-web` suelto | Otro micro que “levanta Redis” |

**Login (sin segunda pantalla):** el Admin ya guarda access/refresh en `localStorage` (`gymbro.staff.session`). El drawer llama a `chat-api` con ese `Authorization: Bearer`. `chat-api` no tiene usuarios: valida el JWT contra GymBro (`GET /api/auth/me` o el mismo secreto). Logout del Admin corta el chat. Impersonate Super ya es JWT Staff: entra igual.

No hace falta cookie SSO ni iframe a otro origen en v1. `chat-web` suelto queda para un producto **sin** panel huésped, o para debug.

**No** es BullMQ de verdad para los mensajes (cola + job). El chat necesita stream ida y vuelta (SSE/HTTP). “Tipo BullMQ” = **dependencia de infra**, no meter prompts en Redis.

---

## 9b. Pendiente de cerrar

| # | Pregunta | Estado |
|---|----------|--------|
| P1 | Servicio aparte **y** UI en el Admin, un login | **Cerrado** (§9). |
| P2 | Título de conversación | **Cerrado:** como ChatGPT. |
| P3 | Postgres | **Cerrado:** misma instancia, DB `chat`. |
| P4 | OpenCode / modelos | **Cerrado:** sin OpenCode en runtime; AI SDK + MCP SDK + OpenRouter (§11). |
| P5 | Contexto largo | **Cerrado:** ventana tokens + tools achicadas (v1); summary buffer (v2); no DELETE por cantidad (§13.1). |
| P6 | Catálogo MCP | **Cerrado** §14. |
| P7 | Árbol de archivos | **Cerrado como acercamiento** §10. |

---

## 10. Organización de archivos (acercamiento)

**No es rígido.** Es una foto de cómo partiríamos el repo. Al implementar está bien fusionar `routes.ts`+`service.ts`, juntar tools, o renombrar. Lo que **no** se mezcla:

- `chat-api/` no importa Nest ni strings `GYMBRO_*` (infra, un MCP por env).
- `mcp/` es el conector GymBro.
- El chat que ve el staff es el drawer en `web/` (v1 GymBro; `chat-web/` suelto queda para otro huésped sin Admin).

```text
mcp/          # GymBro: tools → REST. Bearer por request
chat-api/     # portable: hilos, stream, cliente MCP, OpenRouter
web/          # drawer Asistente (JWT Staff de siempre)
```

---

### 10.1 `mcp/` — sidecar GymBro

Traduce tool → `fetch` a Nest con el Bearer del staff y recorta JSON. El GET `access-preview` vive en **Nest**; el MCP solo lo consume.

```text
mcp/
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example              # GYMBRO_API_URL, PORT=3011
├── help/                     # Artículos de get_help (no el C-producto)
│   ├── afiliados.md
│   ├── packs.md
│   ├── sesiones.md
│   ├── puerta.md
│   ├── caja.md
│   ├── debito.md
│   ├── devoluciones.md
│   ├── reportes.md
│   ├── roles.md
│   └── chat.md
└── src/
    ├── index.ts              # Arranca HTTP Streamable MCP (:3011)
    ├── server.ts             # Registra tools; inyecta Bearer en cada call
    ├── gymbro-client.ts      # Único fetch a Nest; mapea 401/403
    ├── slim.ts               # Recorta listados (máx. 8/15 ítems)
    ├── nav-map.ts            # href Admin ↔ permiso
    ├── period.ts             # this_week / this_month → from/to (BA)
    └── tools/                # Schema + texto para el modelo + slim
        ├── members.ts        # search_members, get_member_account
        ├── access.ts         # preview_member_access
        ├── sessions.ts       # list_sessions, get_session
        ├── register.ts       # get_cash_day
        ├── reports.ts        # get_reports_summary
        ├── refunds.ts        # list_refund_requests
        ├── debit.ts          # list_debit_mandates
        ├── catalog.ts        # list_services, list_packs, get_pack
        ├── roles.ts          # list_roles, get_role
        ├── audit.ts          # search_audit_events
        ├── nav.ts            # suggest_nav (+ GET /me/permissions)
        └── help.ts           # get_help (lee help/*.md)
```

---

### 10.2 `chat-api/` — infra portable (como Redis)

**Cero strings GymBro** en este paquete. Una imagen; otra plataforma = otro Compose + env. Un MCP por instancia (`CHAT_MCP_URL`). El huésped: (1) Bearer, (2) GET de introspección con el JSON de abajo, (3) su MCP.

Contrato de introspección (cualquier API):

```json
{ "userId": "…", "tenantId": "…", "profileType": "STAFF", "email": "…", "name": null }
```

GymBro ya lo cumple (`GET /api/auth/me`). Otro sistema publica un `/me` equivalente.

```text
chat-api/
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example              # CHAT_*, OPENROUTER_*, DATABASE_URL — nada GYMBRO_*
├── prisma/
│   └── schema.prisma         # identities, conversations, messages
└── src/
    ├── index.ts              # PORT (default 3010)
    ├── app.ts                # CORS, /v1, /health
    ├── config.ts             # Lee env; si falta algo, no arranca
    ├── auth/
    │   ├── introspect.ts     # GET AUTH_INTROSPECT_URL + Bearer
    │   └── principal.ts      # Filtra AUTH_REQUIRED_PROFILE; tenantId+userId
    ├── conversations/
    │   ├── routes.ts         # GET/POST lista+alta; GET/PATCH/DELETE :id
    │   └── service.ts        # Aislamiento tenant+user; título automático
    ├── messages/
    │   ├── routes.ts         # POST :id/messages → SSE; abort
    │   └── persist.ts        # Guarda user / assistant / tool
    ├── agent/
    │   ├── run.ts            # streamText + tope de tool-calls
    │   └── window.ts         # Ventana por tokens; tools viejas → 1 línea
    ├── mcp/
    │   └── client.ts         # Un MCP (CHAT_MCP_URL); Bearer del request
    └── llm/
        └── openrouter.ts     # OPENROUTER_API_KEY + OPENROUTER_MODEL
```

Env (el “REDIS_URL” de este servicio):

```text
PORT=3010
DATABASE_URL=postgresql://…/chat
CHAT_MCP_URL=http://mcp:3011/mcp
AUTH_INTROSPECT_URL=http://api:3001/api/auth/me
AUTH_REQUIRED_PROFILE=STAFF
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4.1-mini
CORS_ORIGIN=http://demo.localhost:3002
CHAT_SYSTEM_PROMPT=Hablá en español. Usá las tools. No inventes ids.
```

`GYMBRO_API_URL` solo en `mcp/.env`.

---

### 10.3 `web/` — chat IA (drawer en el Admin)

No hay app Next aparte en GymBro. JWT = sesión Staff de siempre. Sin ruta `/asistente`.

```text
web/
├── lib/
│   └── api/
│       └── chat.ts                # HTTP+SSE a NEXT_PUBLIC_CHAT_API_URL + Bearer
└── components/
    └── assistant/
        ├── AssistantDrawer.tsx    # Panel: sidebar + hilo + input
        ├── ConversationList.tsx   # Conversaciones de este staff
        ├── MessageThread.tsx      # Markdown + chips links
        └── Composer.tsx           # Textarea, enviar, cortar stream
```

`AdminShell.tsx` (ya existe) suma el botón del topbar. Compose: `mcp` + `chat-api`; Postgres database `chat`. `web/.env`: `NEXT_PUBLIC_CHAT_API_URL=http://localhost:3010`.

---

## 11. OpenCode: descartado como runtime; mismas libs, no su repo

OpenCode es MIT: **se puede** copiar código. No conviene. El servidor, las sesiones, Effect, tools de bash/archivos y el MCP con headers fijos están pegados. `@opencode-ai/sdk` es un cliente **hacia** `opencode serve`, no un kernel embebible.

Lo que te gustaba ya está en paquetes chicos (OpenCode solo los usa):

| Lo que querías | De dónde sale de verdad | Qué usamos en `chat-api` |
|----------------|-------------------------|---------------------------|
| Hablar con **MCPs** | `@modelcontextprotocol/sdk` (HTTP/SSE/stdio) | El SDK oficial, Bearer **por request** (JWT Staff) |
| Tools MCP → modelo | Vercel AI SDK (`createMCPClient` / `dynamicTool`) | Paquete `ai` + `@ai-sdk/mcp` |
| Hablar con **muchas APIs de modelos** | Catálogo enorme en OpenCode, o **un** gateway | **OpenRouter** (una key, GPT/Claude/…); AI SDK como cliente |

No copiamos `packages/opencode/src/mcp`. Su cliente no inyecta JWT por staff; el nuestro sí tiene que hacerlo.

Desktop/TUI de OpenCode: opcional **para nosotros** al probar `mcp/`. Fuera del camino del Admin.

**Runtime v1:** `chat-api` = AI SDK + cliente MCP + OpenRouter. Cero proceso OpenCode por usuario.

---

## 12. Arquitectura (para decidir juntos)

Cerrado a nivel producto. El cableado de §12 se ajusta al implementar si hace falta; las decisiones de la tabla §1 no.

### 12.1 Procesos en Compose (GymBro)

```text
                    :3002                         :3001
                 ┌─────────┐                  ┌─────────┐
  Staff browser  │  web    │  JWT localStorage│   api   │  DB gymbro
                 │ Admin   │ ───────────────► │  Nest   │
                 │ +drawer │                  └────▲────┘
                 └────┬────┘                       │ HTTP + Bearer
                      │ :3010                      │
                      ▼                            │
                 ┌─────────┐                  ┌────┴────┐
                 │chat-api │  MCP HTTP+Bearer │  mcp    │ :3011
                 │         │ ───────────────► │ GymBro  │
                 │ DB chat │                  └─────────┘
                 └────┬────┘
                      │ OpenRouter
                      ▼
                 api.openrouter.ai
```

Postgres **un** contenedor, dos databases: `gymbro` (ya) y `chat` (nueva). Redis de GymBro **no** es obligatorio para el chat en v1 (el access dura 15 min; el refresh lo hace el Admin como hoy).

| Servicio | Puerto host (propuesto) | Conoce GymBro |
|----------|-------------------------|---------------|
| `api` | 3001 | sí (dominio) |
| `web` | 3002 | sí (UI) |
| `chat-api` | 3010 | **no** (solo URL auth + MCP) |
| `mcp` | 3011 | sí (tools → REST) |

Otra plataforma: misma imagen `chat-api`, otro `mcp`, mismas env con otras URLs.

### 12.2 Un turno (secuencia)

```text
1. Staff escribe en el drawer (ya logueado).
2. web  POST http://chat-api:3010/v1/conversations/{id}/messages
        Authorization: Bearer <access GymBro>
        body: { text }  →  SSE (protocolo AI SDK / UI Message Stream)
3. chat-api:
     a. Identidad: ¿quién es este JWT?  → ver A.1
     b. Assert: conversation.tenant_id + user_id = claims
     c. Persist mensaje user
     d. Abre cliente MCP a CHAT_MCP_URL con ESE Bearer
     e. tools/list  → schemas al modelo
     f. streamText({ model: openrouter, tools, messages })
     g. Si el modelo llama tool → MCP tools/call → mcp → api Nest
     h. Tope de round-trips (p.ej. 8)
     i. Persist mensajes assistant + tool; título si es el 1.er user
4. Drawer pinta tokens; chips con href si el tool los trae.
```

Refresh del JWT: **el Admin**, igual que `apiRequest`. El drawer manda un access vigente. Si chat-api ve 401, el front refresca y reintenta. chat-api no guarda refresh (el Admin ya lo tiene).

### 12.3 Interior de `chat-api` (genérico)

```text
http
  POST /v1/conversations
  GET  /v1/conversations                 ?  listado del staff
  GET  /v1/conversations/:id
  POST /v1/conversations/:id/messages    stream
  PATCH /v1/conversations/:id            título
  DELETE /v1/conversations/:id           archivo lógico

auth/          valida JWT (A.1)
conversations/ CRUD + aislamiento tenant+user
agent/         AI SDK streamText + tope tools
mcp-client/    connect(url, headers.Authorization)
llm/           @openrouter/ai-sdk-provider (o @ai-sdk/openai compatible)
```

Env típica (portable):

```text
DATABASE_URL=postgresql://…/chat
CHAT_MCP_URL=http://mcp:3011/mcp
AUTH_INTROSPECT_URL=http://api:3001/api/auth/me   # si A.1 = introspección
# o JWT_ACCESS_SECRET=…                           # si A.1 = secreto compartido
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4.1-mini
CORS_ORIGIN=http://demo.localhost:3002,…
```

Nada de `MembersService` acá.

### 12.4 Interior de `mcp/` (solo GymBro)

Servidor MCP **Streamable HTTP** (un proceso, muchos staff). Cada request trae `Authorization`. El handler lo copia a `fetch(GYMBRO_API_URL + path)`.

Tools v1 (borrador, A.3):

| Tool | REST hoy | Permiso |
|------|----------|---------|
| `search_members` | `GET /api/members?q=` | `members.read` |
| `get_member_account` | `GET /api/members/:id/account` | `members.read` |
| `preview_access` | extraer decisión **sin** `access_attempts` | acceso lectura |
| `list_sessions` | `GET /api/sessions` (ventana corta) | catálogo / sesiones |
| `suggest_nav` | tabla href (no REST) | según permiso del link |

403 de Nest → error de tool → el modelo dice “no tenés permiso”. El MCP no bypassa guards.

**Hueco:** `preview_access` no existe como HTTP. Hay que exponer un GET de preview en Nest **o** reimplementar reglas en el MCP (malo). Preferible un endpoint mínimo en la API (sí suma Nest, pero 1 ruta de lectura; si no, el chat miente en puerta).

### 12.5 Tablas `chat` (Postgres)

```text
identities
  id, tenant_id, user_id, email, name, last_seen_at
  unique (tenant_id, user_id)

conversations
  id, tenant_id, user_id, title, archived_at, created_at, updated_at
  index (tenant_id, user_id, updated_at desc)

messages
  id, conversation_id, role, content, tool_name, tool_args, tool_result, created_at
  index (conversation_id, created_at)
```

Sin passwords. Sin `tenant_id` inventado por el body: sale del JWT. Toda query de listado filtra `tenant_id + user_id`.

### 12.6 Drawer en `web/`

- Componente client en `AdminShell` (botón topbar).
- `NEXT_PUBLIC_CHAT_API_URL` (p.ej. `http://localhost:3010`).
- Reusa `readStaffSession().accessToken`.
- Cliente stream del AI SDK (`useChat` apuntando a chat-api, o fetch SSE).
- CORS en chat-api = mismos orígenes que `CORS_ORIGIN` de Nest (`demo.localhost:3002`, etc.).

### 12.7 Decisiones de arquitectura

**A.1 Introspección (cerrado)** — chat-api **no** verifica la firma. Reenvía el Bearer:

```text
drawer  →  chat-api  →  GET http://api:3001/api/auth/me
                         Authorization: Bearer <access>
                         200 { userId, tenantId, profileType, email }
                         401 token vencido / inválido
```

Si `profileType !== STAFF` → 403 (el chat Admin no es para afiliados). Cache opcional ~30s por hash del token. Refresh: el Admin, como hoy. Otra instancia: `AUTH_INTROSPECT_URL` apunta al `/me` de ese producto.

**A.2** Cerrado: **Hono + Prisma**.

**A.3** Tools MCP: ver §14.

**A.4 “¿Puede entrar?”** — ver §14 (`preview_member_access` + GET Nest).

---

## 13. Funciones del chat (el módulo, no el MCP)

El chat no “sabe de gyms”. Hace de **bandeja + cerebro**: guardar charlas, stremear, llamar al MCP que esté en config. Las tools concretas (afiliados, deuda) son del MCP.

### v1 — tiene que estar

| Función | Por qué |
|---------|---------|
| **Drawer en el Admin** (abrir/cerrar, Caja sigue detrás) | Un login; no sacarte de la operación. |
| **Sin login propio** | El Bearer Staff alcanza; un segundo login mata la analogía Redis. |
| **Lista de conversaciones** (solo las mías de este gym) | Varios temas a la vez; María ≠ Pedro ≠ otro tenant. |
| **Nueva / abrir / seguir** | Sin historial, cada pregunta arranca de cero y el modelo no recuerda el afiliado que acabás de buscar. |
| **Título automático** (editable) | Como ChatGPT: el sidebar no puede ser “Sin título” × 20. |
| **Mensaje + stream** | Un bloque de 8 s se siente roto; hay que ver tokens. |
| **Persistir user / assistant / tool** | El siguiente turno necesita el JSON de la tool, no solo el texto lindo. |
| **Cliente MCP + tope de tool-calls** | Por eso existe el micro: el modelo no inventa IDs; un loop infinito quema plata. |
| **Cortar generación** | El modelo se va por las ramas; el staff tiene que poder parar. |
| **Estados: vacío, cargando, error, 401, 403** | 401 → el Admin refresca; 403 afiliado/sin permiso; MCP o OpenRouter caídos ≠ “no hay red”. |
| **Markdown en respuestas** | Listas y negritas; si no, un muro ilegible. |
| **Disclaimer** | “Puede equivocarse; no cobra solo.” Expectativa legal/UX. |
| **Solo STAFF** | Introspección `/me`; el panel no es el chat del socio. |
| **Ventana de contexto** (últimos N mensajes, no el hilo eterno) | Tokens y costo; un chat de 3 meses no entra en el modelo. |
| **Tope de uso** (mensajes/min o tokens/día por staff) | OpenRouter se paga; un loop o un abuse tumba la cuenta. |
| **Health** de `chat-api` | Compose / ops, igual que `/api/health`. |

### v1 — útil, no bloquea el spike

| Función | Por qué |
|---------|---------|
| Archivar / borrar conversación | Sidebar vivo; sin esto se pudre. Se puede ir en el primer corte usable. |
| Reintentar el último turno | OpenRouter a veces falla; no obligar a copiar el texto. |
| Links/chips si el MCP devuelve `href` | “Abrí la ficha” sin que el chat conozca `/afiliados`. Contrato genérico `{ href, label }`. |

### No va en v1 (el chat sigue siendo genérico)

Compartir el hilo con todo el gym, varios MCP a la vez, adjuntos, voz, memoria entre conversaciones, thumbs up, export, Super Admin propio, app afiliado, writes/cobros (eso es MCP, no el drawer).

System prompt: **un texto por instancia** (`CHAT_SYSTEM_PROMPT`: “hablá en español, usá las tools, no inventes ids”). No el documento maestro.

### 13.1 Contexto largo: compactar ≠ borrar (**cerrado**, decisión 15)

Hay **dos copias** distintas:

| Copia | Para quién | ¿Se borra sola? |
|-------|------------|-----------------|
| Tabla `messages` | El staff (sidebar, scroll) | No, salvo que archive/borre la conversación |
| Ventana del modelo | OpenRouter (lo que entra en el prompt) | Sí, cada turno se **arma de nuevo** y no puede ser infinita |

Si borrás filas “cada 50 mensajes”, el drawer pierde historia y el modelo igual no recordaba lo viejo. El recorte tiene que ser **al armar el prompt**, no al guardar.

**v1 — ventana deslizante (sin resumen, sin delete)**

Antes de cada `streamText`:

1. System prompt de la instancia (siempre).
2. Cola: últimos mensajes hasta un tope de **tokens** (p.ej. 8–12k), no un número mágico de filas. Un `tool_result` de 40 afiliados vale por 20 chats de “ok”.
3. Los `tool_result` viejos se **achican** en el prompt (un renglón: `search_members → 3 hits`) y en DB siguen enteros por si reabrís el turno.
4. El turno actual no se recorta.

El staff sigue viendo todo el hilo (o paginado). Postgres aguanta; el costo está en OpenRouter.

**v2 — compactar (resumen), todavía sin borrar**

Cuando la cola que **no** entra en la ventana supera un umbral:

1. Un modelo barato resume ese tramo (“María preguntó por Juan Pérez, deuda 12 días…”).
2. Se guarda en `conversations.summary` (o un mensaje `role=system` tipo `compaction`).
3. El próximo prompt = system + **summary** + cola reciente.
4. Las filas viejas **quedan** para el drawer. Se marcan `excluded_from_model_at` para no re-resumirlas.

Eso puede ir **antes** del stream (un poco más de latencia) o en un job (Redis/BullMQ sí tiene sentido acá: no es el chat en vivo).

**Lo más habitual en producción (2025–26), no borrar el hilo:**

1. El staff **sigue viendo** todos los mensajes (ChatGPT, Claude, Cursor). Nadie compacta borrando la UI.
2. Al modelo se manda **cola reciente completa + resumen de lo viejo** (`ConversationSummaryBuffer` de LangChain; Claude API `compaction`; Claude Code `autoCompact`). El disparador es **tokens**, no “cada 40 filas”.
3. En agentes con tools, se **achican o tiran del prompt** los `tool_result` viejos (se pueden volver a pedir al MCP). Es lo que más tokens come.
4. El system prompt y reglas (“no inventes ids”, “no cobres”) **no** entran en el resumen: si se compactan, el agente se olvida de las restricciones (hay papers de eso).
5. “Memoria” entre conversaciones (perfil ChatGPT) es **otro** producto. No aplica al v1.

Para GymBro/chat-api: v1 = ventana por tokens + tools viejas a una línea. v2 = summary buffer persistido. Borrar DB solo si el staff borra o hay retención PII.

---

## 14. Catálogo MCP GymBro (**cerrado** v1)

Reglas: tools de **lectura / intento**, no espejo de REST. JSON recortado. `links: [{ href, label }]` para chips. 403 Nest → “no hay permiso”. **Sin writes** (no cobra, no devuelve, no enrola débito, no edita roles).

Única excepción Nest: `GET /api/members/:memberId/access-preview` (RN de puerta, **sin** `access_attempts`). Permiso `access.verify`.

Comparar semanas/meses: **la misma tool dos veces** (`get_reports_summary` con `period` o `from`/`to`). El modelo resta totales. No hace falta un endpoint “diff” en Nest: `GET /api/reports/summary` ya filtra por fechas de negocio (timezone BA; default = mes calendario).

### A — Operación (socio / puerta / día)

| Tool | Pregunta | REST | Permiso |
|------|----------|------|---------|
| `search_members` | “¿Tenemos a Juan?” | `GET /api/members?q=&pageSize=8` | `members.read` |
| `get_member_account` | Deuda, pack, reservas | `GET /api/members/:id/account` slim | `members.read` |
| `preview_member_access` | “¿Puede entrar hoy?” | **Nuevo** `GET …/access-preview` | `access.verify` |
| `list_sessions` | Clases en un rango | `GET /api/sessions?from&to` | `sessions.write` |
| `get_session` | Cupo de una clase | `GET /api/sessions/:id` | `sessions.write` |
| `get_cash_day` | Caja de un día | `GET /api/payment-register/day` | `cashier.operate` |
| `suggest_nav` | “Abrí reportes / ficha” | Nav + `GET /api/me/permissions` | el del link |

### B — Números (cobros, devoluciones, débitos, comparar)

| Tool | Pregunta | REST | Permiso |
|------|----------|------|---------|
| `get_reports_summary` | “Ingresos de agosto vs julio” | `GET /api/reports/summary?from&to` | `reports.read` |
| `list_refund_requests` | Solicitudes de devolución | `GET /api/refund-requests` slim | `transaction_items.refund` |
| `list_debit_mandates` | Mandatos ACTIVE/FAILED… | `GET /api/debit-mandates` slim | `cashier.operate` |

`get_reports_summary` args: `{ period?: this_week\|last_week\|this_month\|last_month\|this_year, from?, to?, memberId? }`. El MCP resuelve `period` a YYYY-MM-DD (BA). Slim: `members`, `contracts`, `income.totalApproved`, `totalRefunded`, `byMethod`, `transactionCount` + **máx. 15** filas de movimientos (cobro o egreso de devolución). Link `/reportes`.

Comparación: dos llamadas (ej. `last_month` y `this_month`). El modelo arma la tabla. No ejecutar devoluciones ni cargos.

### C — Catálogo y gobierno (lectura)

| Tool | Pregunta | REST | Permiso |
|------|----------|------|---------|
| `list_services` | “¿Qué servicios hay?” | `GET /api/services` | `catalog.write` |
| `list_packs` / `get_pack` | Packs y precio | `GET /api/packs` / `:id` slim | `catalog.write` |
| `list_roles` / `get_role` | Roles y permisos | `GET /api/roles` / `:id` | `roles.write` |
| `search_audit_events` | “¿Quién canceló el contrato?” | `GET /api/audit-events?q=` slim | `audit.read` |

Auditoría slim: `id, action, entityType, entityId, actorId, createdAt` — **sin** `before`/`after` enteros (revientan tokens). Si hace falta el detalle: `get_audit_event` v1.1. Link `/auditoria`.

### D — Cómo usar el sistema

| Tool | Pregunta | Fuente | Permiso |
|------|----------|--------|---------|
| `get_help` | “¿Cómo enrolar débito?” / “¿Qué es un pack?” | Artículos cortos en `mcp/help/` (no el maestro entero) | cualquiera Staff |

Topics v1 (fijos): `afiliados`, `packs`, `sesiones`, `puerta`, `caja`, `debito`, `devoluciones`, `reportes`, `roles`, `chat`. Texto en español, 1 pantalla. `suggest_nav` puede ir al final del artículo.

### Slim extra

- search / account / preview / sessions / cash: igual que antes
- reports: totales + 15 movimientos; no el ledger completo
- refunds: `id, memberName, status, amount, createdAt` + `/devoluciones`
- débitos: `id, memberName, status, packName, nextChargeDate?` + `/caja`
- packs/servicios: id, name, price/active — sin metadata Kuatia
- roles: name, slug, permission codes
- audit: sin JSON before/after

### Sigue fuera (writes y ruido)

Alta/editar socio, reservar, cobrar, **ejecutar** devolución, enrolar/cancelar débito, pase manual, conectar MP, waitlist, listar `access_attempts` (no confundir con preview).

Profesor seed: A (sin caja), `get_reports_summary`, `get_help`. No B débitos/devoluciones ni C roles/catálogo/audit. Admin: todo.

---

[Índice](./00-indice.md) · [Backlog Admin](./99-backlog-post-mvp/admin.md)




