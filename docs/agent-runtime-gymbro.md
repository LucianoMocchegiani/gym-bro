# Agent Runtime en GymBro

El Compose incluye Agent Runtime con PostgreSQL y volumen propios. No comparte tablas ni credenciales de la base GymBro. Su UI/API queda disponible localmente en `http://localhost:3031`; en producción publicar Runtime detrás de HTTPS y permitir el origen del frontend en `CORS_ORIGIN`.

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

Probar la introspección con un access token STAFF. El endpoint rechaza MEMBER o identidades sin tenant; compone `userId` con `[tenantId, profileType, userId]` y entrega además `tenantId` y `role`. Runtime reenvía el Bearer original al MCP para conservar sus permisos.

En **Administración → MCP**, configurar GymBro con URL `http://mcp:3011/mcp` y autenticación Bearer del usuario, no una credencial estática. Configurar proveedor/modelo y perfil de agente. Para mantener las tarjetas de propuestas, habilitar en el perfil `config.chat.confirmUserOnlyTools: true`; el drawer enlaza Confirmar/Cancelar con la aprobación pendiente de `confirm_proposal` y nunca ejecuta argumentos suministrados por el navegador. Confirmar autoriza únicamente los argumentos que Runtime persistió. Cancelar rechaza la aprobación, no ejecuta el MCP de cancelación; GymBro deja vencer la propuesta temporal.

## Migración del chat

Cuando `NEXT_PUBLIC_AGENT_RUNTIME_URL` está configurado, el drawer STAFF usa Runtime para conversaciones, mensajes, títulos, archivo y turnos. El chat público de la landing sigue en `chat-api`. El Compose deja el servicio antiguo desplegado para ese chat público y como transición.

Las conversaciones antiguas de `chat-api` no se copian ni se borran; dejan de aparecer en el drawer STAFF migrado. Revisar y conservar la base `chat` antes de retirar `chat-api`. Validar CORS, introspección, perfil, MCP y una propuesta descartable en staging antes del despliegue a usuarios.
