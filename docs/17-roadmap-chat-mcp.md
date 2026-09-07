# GymBro — Roadmap asistente chat + MCP

**Estado:** Borrador (tareas; diseño cerrado)  
**Objetivo:** Drawer en Admin + `chat-api` portable (tipo Redis) + sidecar `mcp/` de lectura.  
**Fuera de MVP.** Diseño: [16-chat-mcp-diseno.md](./16-chat-mcp-diseno.md). El MVP sigue en [11-roadmap-mvp.md](./11-roadmap-mvp.md).  
**Árbol de archivos:** acercamiento (§10 del diseño); al codear se puede mover.

## Cómo usar este doc

1. Las **épicas** van en orden sugerido (dependencias).
2. Debajo: **tareas** = títulos cortos para tomar una a una (`work-on-task`).
3. Marcar: `[ ]` pendiente · `[~]` en curso · `[x]` hecho.
4. No implementar hasta que se abra una tarea con OK explícito.

---

## Vista rápida

| # | Épica | Entrega |
|---|--------|---------|
| C0 | Preview ingreso Nest | `GET …/access-preview` sin `access_attempts` |
| C1 | chat-api infra | Paquete Hono + DB `chat` + Compose + health + env |
| C2 | Identidad y conversaciones | Introspect `/me` + CRUD hilos (sin LLM) |
| C3 | MCP servidor + tools A | HTTP MCP + operación (socio, puerta, sesiones, caja, nav) |
| C4 | Agente + stream | OpenRouter + cliente MCP + ventana tokens |
| C5 | Drawer Admin | UI en `web/` con el JWT Staff |
| C6 | MCP B/C/D | Reportes, débitos, devoluciones, catálogo, roles, audit, help |
| C7 | Cierre corte | Abort, título, chips, tope de uso, smoke |

---

## C0 — Preview ingreso (Nest)

Única excepción al “no hinchar Nest”: lectura para el MCP.

- [x] Extraer evaluación de puerta **sin** persistir intento
- [x] `GET /api/members/:memberId/access-preview` (`access.verify`)
- [x] Postman + nota en `docs/09` solo si toca schema (no debería)

---

## C1 — chat-api infra (portable)

Cero `GYMBRO_*`. Imagen reutilizable.

- [x] Scaffold `chat-api/` (Hono, Node 24, Prisma, Dockerfile)
- [x] Database `chat` en el Postgres de Compose (mismo contenedor)
- [x] Schema: `identities`, `conversations`, `messages`
- [x] `config.ts` + `.env.example` (`CHAT_MCP_URL`, `AUTH_INTROSPECT_URL`, `AUTH_REQUIRED_PROFILE`, OpenRouter, CORS)
- [x] `GET /health`
- [x] Servicio `chat-api` en `docker-compose.yml`

---

## C2 — Identidad y conversaciones

Sin modelo todavía. Se puede probar con curl + token Staff.

- [x] Introspect: `GET AUTH_INTROSPECT_URL` + cache corto
- [x] Exigir `AUTH_REQUIRED_PROFILE` (GymBro: `STAFF`)
- [x] `GET/POST /v1/conversations` (lista/alta; filtro tenant+user)
- [x] `GET/PATCH/DELETE /v1/conversations/:id` (título, archivar)
- [x] CORS hacia el Admin (`demo.localhost:3002`, etc.)

---

## C3 — MCP GymBro (servidor + tools A)

- [x] Scaffold `mcp/` + Streamable HTTP + Bearer por request
- [x] `gymbro-client.ts` + `slim.ts` + Compose servicio `mcp`
- [x] Tools: `search_members`, `get_member_account`
- [x] Tool: `preview_member_access` (usa C0)
- [x] Tools: `list_sessions`, `get_session`
- [x] Tools: `get_cash_day`, `suggest_nav`
- [x] Probar tools con un cliente MCP (stdio/HTTP) y token Staff — sin drawer

---

## C4 — Agente + stream

Une C2 + C3. `chat-api` sigue sin conocer afiliados.

- [x] Cliente MCP (`CHAT_MCP_URL` + Bearer del request)
- [x] OpenRouter + `CHAT_SYSTEM_PROMPT`
- [x] `POST /v1/conversations/:id/messages` (SSE / UI Message Stream)
- [x] Persistencia user / assistant / tool
- [x] Ventana por tokens + `tool_result` viejos a una línea
- [x] Tope de tool-calls
- [x] `GET /v1/conversations/:id/messages` (historial; C5 lo reusa)

---

## C5 — Drawer Admin

- [ ] `web/lib/api/chat.ts` (Bearer de sesión Staff; refresh como `apiRequest`)
- [ ] `AssistantDrawer` + lista + hilo + composer
- [ ] Botón en `AdminShell`
- [ ] `NEXT_PUBLIC_CHAT_API_URL`
- [ ] Estados: vacío, loading, error, 401, 403
- [ ] Disclaimer (“puede equivocarse; no cobra”)

---

## C6 — MCP lectura amplia + ayuda

- [ ] `get_reports_summary` (`period` / `from`–`to`)
- [ ] `list_refund_requests`, `list_debit_mandates`
- [ ] `list_services`, `list_packs`, `get_pack`
- [ ] `list_roles`, `get_role`
- [ ] `search_audit_events` (slim, sin before/after)
- [ ] `get_help` + `mcp/help/*.md`

---

## C7 — Cierre de este corte

- [ ] Abort de generación
- [ ] Título automático (editable)
- [ ] Chips `links` → `router.push`
- [ ] Tope de uso por staff (mensajes/min o tokens)
- [ ] Smoke: un gym, dos staff, profesor sin caja, comparación dos períodos
- [ ] README `chat-api/` + `mcp/` (cómo se “enchufa” como Redis)

---

## Orden de ataque (1 dev)

```text
C0 (Nest preview, chico)
  → C1 (chat-api Compose)
  → C2 (hilos + /me)
  → C3 (MCP tools A; se puede solapar el final de C2)
  → C4 (agente + stream)
  → C5 (drawer)
  → C6 (resto del catálogo)
  → C7
```

C3 se puede probar sin UI. C5 no tiene sentido antes de C4.

**Out de este roadmap:** writes (cobrar, devolver, reservar), `compare_reports`, `chat-web/` suelto, OpenCode en runtime, summary buffer (v2 contexto), C-producto RN/CU.

---

[Diseño](./16-chat-mcp-diseno.md) · [Roadmap MVP](./11-roadmap-mvp.md) · [Índice](./00-indice.md)
