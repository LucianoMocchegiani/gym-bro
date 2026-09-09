# gymbro-mcp

Sidecar Faciliter: traduce tools MCP → `GET` de Nest con el Bearer del staff. **No** es el agente (eso es `chat-api`). Sin writes.

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

**B:** `get_reports_summary`, `list_refund_requests`, `list_debit_mandates`.

**C:** `list_services`, `list_packs`, `get_pack`, `list_roles`, `get_role`, `search_audit_events`.

**D:** `get_help` (artículos en `mcp/help/`).

403 de Nest → texto de tool “No hay permiso para esta consulta.” Preview de ingreso **no** escribe `access_attempts`. Sin writes.

`get_reports_summary` sin `period` ni fechas → mes calendario actual (BA) y manda `from`/`to` a Nest.

## Smoke (host)

Con `api` + `mcp` arriba y seed reciente (Admin + Profesor):

```powershell
cd mcp
npm run smoke
```

Login automático a `http://localhost:3001` (`admin@gymdeprueba.com` y `profesor@gymdeprueba.com`). Overrides: `ACCESS_TOKEN`, `ACCESS_TOKEN_PROFESOR`, `GYMBRO_API_URL`, `TENANT_SLUG`.

Esperado: 17 tools; reportes `this_month` ≠ `last_month`; Admin puede caja; Profesor recibe “no hay permiso” en caja/débitos y sí reportes + help.

Colección Postman aparte: `postman/GymBro.mcp.postman_collection.json` (health + initialize). El flujo completo de tools es el smoke.
