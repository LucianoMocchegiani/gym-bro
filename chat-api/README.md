# chat-api

Motor del asistente: hilos, stream y cliente MCP. **Portable**: GymBro se conecta; este paquete **no** conoce afiliados, caja ni Nest.

Diseño: [`docs/16-chat-mcp-diseno.md`](../docs/16-chat-mcp-diseno.md) · roadmap: [`docs/17-roadmap-chat-mcp.md`](../docs/17-roadmap-chat-mcp.md).

Otra plataforma = **otra instancia** (Compose + env). Misma imagen. Cero strings `GYMBRO_*`.

## Cómo se enchufa (analogía Redis)

| Pieza | Quién la pone | Qué es |
|-------|----------------|--------|
| `chat-api` | Infra | Hilos en DB `chat`, OpenRouter, llama al MCP con el Bearer del request |
| MCP | El producto huésped | Tools → su API (en GymBro: sidecar `mcp/`) |
| UI | El producto huésped | En GymBro: burbuja + drawer en el Admin (`web/`). No hay login propio |
| Auth | El huésped | `GET AUTH_INTROSPECT_URL` con el mismo JWT Staff. GymBro: `/api/auth/me` |

El Admin ya tiene sesión. El drawer manda `Authorization: Bearer`. Logout del Admin corta el chat.

## Env

```powershell
Copy-Item chat-api\.env.example chat-api\.env
```

| Variable | Notas |
|----------|--------|
| `DATABASE_URL` | Postgres database **`chat`** (no `gymbro`) |
| `CHAT_MCP_URL` | MCP de esta instancia (`http://mcp:3011/mcp` en Compose) |
| `AUTH_INTROSPECT_URL` | `GET` identidad (`http://api:3001/api/auth/me`) |
| `AUTH_REQUIRED_PROFILE` | `STAFF` |
| `OPENROUTER_API_KEY` | No uses `replace-me`. Tras editar `.env`, recreá el contenedor |
| `CORS_ORIGIN` / `CORS_APP_DOMAIN` | Orígenes del panel (túnel `{slug}.faciliter.xyz`) |
| `CHAT_SYSTEM_PROMPT` | Texto de instancia; no el C-producto |
| `CHAT_CONTEXT_TOKENS` | Ventana del prompt (default 10000) |
| `CHAT_MAX_TOOL_STEPS` | Tope de round-trips con tools (default 8) |

## Compose

```powershell
docker compose up --build -d chat-api mcp api web
```

- Health: `GET http://localhost:3010/health`
- Hilos: `GET/POST /v1/conversations` (JWT Staff)
- Mensajes: `POST /v1/conversations/:id/messages` → UI Message Stream; **Parar** aborta y persiste lo generado
- Título: primer mensaje recortado; `PATCH` para editar

## Qué no hace

No cobra, no enrola débito, no conoce rutas `/afiliados`. Las tools y los `links` de chips los trae el MCP. Tope de uso por staff = pendiente.
