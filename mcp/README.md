# gymbro-mcp

Sidecar Faciliter: traduce tools MCP → Nest con el Bearer del staff. **No** es el agente (eso es `chat-api`). Lecturas directas; crear/editar solo por **propuesta + botón** (C8, RN-ASI).

Diseño: [`docs/16-chat-mcp-diseno.md`](../docs/16-chat-mcp-diseno.md) · roadmap: [`docs/17-roadmap-chat-mcp.md`](../docs/17-roadmap-chat-mcp.md).

## Cómo se enchufa

`chat-api` es el Redis: portable, no sabe de GymBro. Este sidecar **sí** es GymBro: tools → `GET` Nest. Otra plataforma escribe **otro** MCP y apunta `CHAT_MCP_URL` ahí. El Bearer del staff viaja request a request; Nest autoriza.

## Env

```powershell
Copy-Item mcp\.env.example mcp\.env
```

| Variable | Default Compose | Notas |
|----------|-----------------|--------|
| `PORT` | `3011` | HTTP |
| `GYMBRO_API_URL` | `http://api:3001` | En el host: `http://localhost:3001` |

Cero secretos JWT: cada request MCP manda `Authorization: Bearer` y el sidecar lo reenvía a Nest.

## Compose

```powershell
docker compose up --build -d api mcp
```

- Health: `GET http://localhost:3011/health` → `{ status: "ok", gymbro: "up"|"down" }` (sin auth).
- MCP: `POST http://localhost:3011/mcp` (Streamable HTTP). Sin Bearer → 401.

## Tools (C3 + C6)

**A:** `search_members`, `get_member_account`, `preview_member_access`, `list_sessions`, `get_session`, `get_cash_day`, `suggest_nav`.

**B:** `get_reports_summary`, `get_expenses_summary` y `list_expenses` (gastos, `expenses.read`; etiqueta por nombre), `list_refund_requests`, `list_debit_mandates`.

**C:** `list_services`, `list_packs`, `get_pack`, `list_roles`, `get_role`, `search_audit_events`.

**D:** `get_help` (artículos en `mcp/help/`: `producto`, `guia`, `mercadopago`, `carpeta` = notas/PDF socio y staff, `migracion` = importar afiliados + contraseña temporal, `gastos` = egresos del gym, `soporte`, etc.).

Cada pantalla o flujo nuevo del producto lleva **artículo `mcp/help/{topic}.md`**, topic en `get_help`, y una línea en `guia.md` / `producto.md`. El chat no adivina features: lee help.

**Staff:** `search_staff`.

**Escritura (C8):** `propose_*` (gastos, afiliados, servicios, packs, clases, series, reservas, lista de espera, staff, roles) **no escriben**: guardan una propuesta en memoria (2 min, un uso, atada a `tenantId:sub`) y devuelven la tarjeta. `confirm_proposal` (con `_meta` `chat/userOnly`, el modelo no la ve) la ejecuta ante el clic del staff vía `chat-api` `POST …/user-actions`. `get_assistant_limits` + `instructions` del server: qué no hace (caja, devoluciones, débito, puerta, config, borrar/cancelar, uploads) y que es por seguridad. Detalle: [`docs/16` §15](../docs/16-chat-mcp-diseno.md).

403 de Nest → texto de tool “No hay permiso para esta consulta.” Preview de ingreso **no** escribe `access_attempts`.

`get_reports_summary` sin `period` ni fechas → mes calendario actual (BA) y manda `from`/`to` a Nest.

## Smoke (host)

Con `api` + `mcp` arriba y seed reciente (Admin + Entrenador):

```powershell
cd mcp
npm run smoke
```

Login automático a `http://localhost:3001` (`admin@gymdeprueba.com` y `entrenador@gymdeprueba.com`). Overrides: `ACCESS_TOKEN`, `ACCESS_TOKEN_ENTRENADOR`, `GYMBRO_API_URL`, `TENANT_SLUG`.

Esperado: tools de lectura + `confirm_proposal` / `get_assistant_limits`; reportes `this_month` ≠ `last_month`; Admin puede caja y gastos; Entrenador recibe “no hay permiso” en caja/débitos/gastos y sí reportes + help.

Colección Postman aparte: `postman/GymBro.mcp.postman_collection.json` (health + initialize). El flujo completo de tools es el smoke.
