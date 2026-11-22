# Agent Runtime en GymBro

El Compose incluye Agent Runtime con PostgreSQL y volumen propios. No comparte tablas ni credenciales de la base GymBro. Su UI/API queda disponible localmente en `http://localhost:3031`; en producción publicar Runtime detrás de HTTPS y permitir los orígenes del frontend en `CORS_ORIGIN`.

## Preparar y levantar

```sh
cp agent-runtime/.env.example agent-runtime/.env
cp web/.env.example web/.env
# Editar secretos, URL pública de Runtime y CORS_ORIGIN.
docker compose up -d --build
```

En PowerShell, usar `Copy-Item`. Para claves, generar valores aleatorios con `openssl rand -hex 32`. Poner la misma contraseña de DB en `POSTGRES_PASSWORD` y `DATABASE_URL`. El volumen `agent_runtime_data` persiste configuración e historial de Runtime; no ejecutar `docker compose down -v` salvo que se quiera borrar esos datos.

En producción, `NEXT_PUBLIC_AGENT_RUNTIME_URL` se bakea en el build de web: establecerla en el `.env` junto a `docker-compose.yml` antes de `docker compose up --build`. Debe ser una URL accesible desde el navegador, no el hostname Docker.

## Conectar identidad y MCP

Entrar a `/admin` de Runtime y configurar **Administración → Auth**:

```json
{
  "authIntrospectUrl": "http://api:3001/api/auth/agent-runtime",
  "authMapping": { "userId": "userId", "email": "email", "name": "name" }
}
```

Probar la introspección con un access token STAFF. El endpoint rechaza MEMBER o identidades sin tenant; compone `userId` con `[tenantId, profileType, userId]` y entrega además `tenantId` y `role`. Runtime reenvía al MCP el Bearer original, conservando permisos. Las sesiones STAFF siguen autenticándose mediante introspección; Runtime también admite `anon:<UUID>` sin introspección para el chat público.

En **Administración → MCP**, configurar GymBro con URL `http://mcp:3011/mcp` y autenticación que reenvíe el Bearer de cada petición, no una credencial estática. GymBro MCP acepta `anon:<UUID>` y para esos tokens publica exclusivamente `get_help`; los demás bearers conservan el conjunto STAFF. Configurar proveedor/modelo y perfil de agente. Para mantener las tarjetas de propuestas del drawer STAFF, habilitar en ese perfil `config.chat.confirmUserOnlyTools: true`.

## Migración del chat

El drawer STAFF y el asistente de la landing Faciliter usan Agent Runtime para conversaciones, mensajes y turnos. La landing crea y persiste en el navegador una sesión `anon:<UUID>`; Runtime reenvía ese mismo Bearer al MCP, que aplica el conjunto público de herramientas. `chat-api` se quitó del Compose y ya no hay fallback a ese servicio; su código histórico y sus datos existentes no se borran con este cambio.

El límite de uso contra abuso/costo que tenía `chat-api` aún no se reemplaza: hasta agregar rate limit de anónimos en Runtime, el acceso público a la landing puede generar costos sin ese tope. No exponer el cambio en producción sin aceptar ese riesgo; proteger temporalmente el endpoint a nivel de infraestructura si hace falta. Validar CORS, autenticación MCP, herramientas disponibles y flujo en staging antes de desplegar.
