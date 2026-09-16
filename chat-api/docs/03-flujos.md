# Flujos

## 0. De abrir el chat a la respuesta (genérico)

Esto es **un turno completo** visto desde la persona: burbuja → hilo → “enviar” → texto del modelo en pantalla. Sirve para staff y landing; lo que cambia es **quién sos** (JWT vs `pub1.`) y **qué tools** hay.

```text
Persona                         UI (web)                         chat-api                      MCP + OpenRouter
───────                         ────────                         ────────                      ────────────────
Abre la burbuja
                                GET /v1/conversations
                                (landing: antes POST /v1/public/session)
                                                                 Bearer → principal
                                                                 lista hilos de ese dueño
                                elige último hilo o vacío
                                GET …/messages  (si hay hilo)
                                muestra historial o canvas vacío

Escribe y Enviar
                                si no hay hilo: POST /v1/conversations
                                POST /v1/conversations/:id/messages  { text }
                                                                 1. dueño + no archivado
                                                                 2. abre MCP (Bearer del request)
                                                                 3. tools/list
                                                                 4. INSERT user (+ título si era null)
                                                                 5. arma prompt (ventana)
                                                                 6. streamText → OpenRouter
                                                                      │
                                                                      ├─ tool call → MCP → API huésped
                                                                      └─ tokens de texto
                                lee UI Message Stream
                                pinta delta a delta
                                                                 onFinish: INSERT tool* + assistant
                                burbuja assistant completa
```

### Paso a paso

1. **Abrir.** Staff: ya hay sesión Admin; el drawer manda el JWT. Landing: `POST /v1/public/session` (sin JWT) y guarda `token` + `conversation`.
2. **Quién sos.** Cada request a `/v1` (salvo `/v1/public`) pasa por `requirePrincipal`: introspect Nest **o** HMAC `pub1.`. Upsert en `identities`.
3. **Qué hilo.** `GET /v1/conversations`. La UI reabre el último id local o el más reciente. Si no hay ninguno, el canvas queda vacío hasta el primer envío (o “Nuevo chat” → `POST /v1/conversations`).
4. **Historial.** Si hay hilo: `GET /v1/conversations/:id/messages`. La UI muestra `user` / `assistant` / `tool`; el modelo **todavía no corre**.
5. **Enviar.** `POST /v1/conversations/:id/messages` con `{ "text": "…" }`. Si no había id, la UI crea el hilo **antes**. Texto 1–8000. Archivado → 409. Landing aplica rate limit.
6. **Persistir el usuario.** Se inserta `role=user`. Si `title` era `null`, se recorta ese texto (sin LLM) y queda el título del sidebar.
7. **Prompt.** Se leen hasta 500 mensajes del hilo, se recortan al presupuesto de tokens, se antepone el **system** de env (staff vs public).
8. **Modelo.** OpenRouter genera. Puede intercalar tools (MCP con el mismo Bearer). Tope `CHAT_MAX_TOOL_STEPS`. El HTTP **no** es un JSON final: es stream.
9. **Pantalla.** La UI consume el stream y va pegando texto. “Parar” aborta el request; lo ya generado se guarda igual.
10. **Cierre.** Al terminar (o abortar): filas `tool` si hubo llamadas + `assistant` con el texto. Se cierra el cliente MCP. `updated_at` del hilo.

Hasta el paso 4 **no hay LLM**. El modelo solo entra en el `POST` de mensajes.

Un segundo mensaje en el **mismo** hilo salta 1–3: mismo Bearer, mismo `:id`, historial más largo en el prompt.

Detalle interno del `POST` (auth, MCP, persist): sección 1. Landing vs staff: secciones 2–3.

## 1. Turno staff (detalle interno)

Precondiciones: Staff logueado en Admin; el drawer manda `Authorization: Bearer <accessToken GymBro>`. Existe un hilo del mismo `tenantId`+`userId` (o se acaba de crear).

```text
1. POST /v1/conversations/:id/messages
   { "text": "¿Puede entrar Juan Pérez?" }

2. requirePrincipal
   → no es pub1. → GET AUTH_INTROSPECT_URL (o cache 30s)
   → profile STAFF + tenantId
   → upsert identities

3. getConversation (dueño). No archivada.

4. openMcpClient(accessToken)
   → tools/list (catálogo completo del sidecar GymBro)

5. INSERT message role=user
   applyAutomaticTitle si title IS NULL
   SELECT messages del hilo → buildModelMessages (ventana)

6. streamText(OpenRouter, system=CHAT_SYSTEM_PROMPT, tools, abortSignal)
   el modelo puede llamar tools (ej. buscar afiliado, get_help, suggest_nav)
   cada tool: MCP → Nest con el mismo Bearer → permisos del staff

7. SSE / UI Message Stream hacia el drawer
   onFinish: INSERT role=tool (args+result) + role=assistant
   close MCP
```

Postcondición: el hilo tiene el mensaje del usuario, filas tool si hubo llamadas, y el texto del asistente. `updated_at` al día. El negocio **no** cambió salvo que una tool del MCP sea de escritura (v1 GymBro: lectura + `get_help` + nav).

### Variante: “Parar”

El browser aborta el `fetch`. `AbortSignal` corta `streamText`. `onAbort` persiste steps ya acumulados (tools y texto parcial si hubo). No se muestra error de LLM.

## 2. Alta de hilo staff

```text
POST /v1/conversations
{ "title": opcional }

→ 201 { id, tenantId, userId, title, archivedAt, createdAt, updatedAt }
```

Sin mensajes. El título automático llega en el **primer** `POST .../messages` si `title` sigue `null`.

Listado: `GET /v1/conversations` (activos) o `?archived=true`. `PATCH` título o `archived`. `DELETE` = archivar.

## 3. Landing pública

```text
Visitante en apex (sin login)

1. POST /v1/public/session     (sin Bearer)
   rate limit IP
   token pub1. + conversation vacía
   upsert identity (tenant public)

2. POST /v1/conversations/:id/messages
   Authorization: Bearer pub1.…
   rate limit IP+session
   MCP + tools filtradas a get_help
   system = CHAT_PUBLIC_SYSTEM_PROMPT
   502 genérico si MCP cae (“El asistente no está disponible.”)
```

No hay datos de un gym. Si `CHAT_PUBLIC_ENABLED=false`: session y middleware `pub1.` → 503.

## 4. Qué ve el modelo vs qué queda en DB

```text
DB (completo)                    Prompt (recortado)
─────────────                    ──────────────────
user: “buscá a Juan”             system (env, siempre)
tool: JSON de 80 socios    →     “search_members → 80 hits”  (si es viejo)
assistant: “Hay varios…”         assistant igual
user: “el DNI 123”               user igual (si entra en el presupuesto)
```

Las dos tools más nuevas se mandan más enteras. Si el hilo es enorme, los mensajes **viejos no van al modelo** pero siguen en `GET .../messages` para la UI.

## 5. Errores frecuentes

| Situación | Código | Mensaje típico |
|-----------|--------|----------------|
| Sin Bearer / token malo / introspect 401 | 401 | Unauthorized |
| Socio u otro perfil | 403 | Forbidden profile |
| Hilo de otro staff o UUID inexistente | 404 | Conversation not found |
| Texto vacío / JSON inválido / UUID malo | 400 | … |
| Hilo archivado | 409 | Conversation archived |
| Tope landing | 429 | Llegaste al tope… |
| MCP o OpenRouter no arrancan | 502 | Staff: gym/IA; landing: asistente no disponible |
| Landing off | 503 | El asistente de la landing no está habilitado |
| Postgres caído en /health | 503 | `status: degraded` |

Errores **durante** el stream (crédito OpenRouter, 429, contexto, timeout) van en el protocolo UI Message Stream, no siempre como HTTP 502. El mapper está en `llm/errors.ts`.

## 6. CORS y túnel

El panel en `{slug}.localhost:3002` o `{slug}.faciliter.xyz` manda `Origin`. `chat-api` solo refleja orígenes de `CORS_ORIGIN`, `*.localhost` o `CORS_APP_DOMAIN`. Tras cambiar `.env`, **recrear** el contenedor (`env_file` no se recarga con un restart).

Logout del Admin tira el JWT: el chat deja de introspectar bien. No hay sesión propia que sobreviva.

## 7. Relación con GymBro (fuera de este paquete)

| Pieza | Dónde | Rol |
|-------|--------|-----|
| Drawer / burbuja | `web/` | UI, chips `links`, botón Parar |
| Sidecar | `mcp/` | Tools → HTTP Nest; `get_help` local; filtro landing |
| Nest | `api/` | `/api/auth/me` + APIs de negocio |

`chat-api` no importa esos repos; Compose los une por red y env.

[← Módulos](./02-modulos.md) · [Índice](./00-indice.md) · [HTTP →](./04-http.md)
