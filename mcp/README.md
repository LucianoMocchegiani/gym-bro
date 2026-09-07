# gymbro-mcp

Sidecar GymBro: traduce tools MCP → `GET` de Nest con el Bearer del staff. **No** es el agente (eso es `chat-api`). Sin writes.

Diseño: [`docs/16-chat-mcp-diseno.md`](../docs/16-chat-mcp-diseno.md) · roadmap C6: [`docs/17-roadmap-chat-mcp.md`](../docs/17-roadmap-chat-mcp.md).

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

1. Login Staff (Postman **GymBro API** o Admin) y copiá el access token.
2. Con `api` + `mcp` arriba:

```powershell
cd mcp
$env:ACCESS_TOKEN = "<JWT>"
npm run smoke
```

Esperado: lista las 17 tools, `search_members` slim, `suggest_nav`, `get_reports_summary` sin args (mes actual) y `get_help` topic `packs`.

Colección Postman aparte: `postman/GymBro.mcp.postman_collection.json` (health + initialize). El flujo completo de tools es el smoke.
