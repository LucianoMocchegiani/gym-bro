# Agent Runtime en GymBro

El Compose incluye Agent Runtime con PostgreSQL y volumen propios. No comparte tablas ni credenciales de la base GymBro. Su UI/API queda disponible localmente en `http://localhost:3031`; en producción publicarla detrás de HTTPS y un proxy con autenticación adecuada.

## Preparar y levantar

```sh
cp agent-runtime/.env.example agent-runtime/.env
# Editar los secretos; para las claves usar: openssl rand -hex 32
# Poner el mismo valor de contraseña en POSTGRES_PASSWORD y DATABASE_URL.
docker compose up -d --build
```

En PowerShell, usar `Copy-Item agent-runtime/.env.example agent-runtime/.env`. El volumen `agent_runtime_data` persiste la configuración, historial y perfiles de Runtime. No ejecutar `docker compose down -v` salvo que se quiera borrar también esa información.

## Conectar identidad y MCP

Entrar a `http://localhost:3031/admin` con las credenciales locales de `agent-runtime/.env` y configurar **Administración → Auth**:

```json
{
  "authIntrospectUrl": "http://api:3001/api/auth/agent-runtime",
  "authMapping": { "userId": "userId", "email": "email", "name": "name" }
}
```

Probar la introspección con un access token STAFF real antes de guardar. El endpoint rechaza MEMBER o identidades sin tenant. La respuesta compone el `userId` con `[tenantId, profileType, userId]`; `tenantId` y `role` también se devuelven como metadatos. El Bearer original se conserva para las llamadas al MCP y sus permisos de GymBro.

En **Administración → MCP**, configurar el servidor GymBro con URL `http://mcp:3011/mcp` y autenticación Bearer del usuario (no una credencial estática). Así Runtime envía el access token validado al MCP, que mantiene la autorización de GymBro. Configurar también un proveedor/modelo y un perfil de agente con el comportamiento y tools necesarios. Antes de ponerlo a disposición, probar con un staff de cada tenant y verificar que conversaciones de distintos gyms y usuarios quedan separadas.

## Estado de la migración del chat

Esto despliega Runtime y deja disponible la conexión de identidad/MCP para probarlo. **El drawer de GymBro todavía usa `chat-api`** (`NEXT_PUBLIC_CHAT_API_URL`); no cambiarlo hasta adaptar el cliente/UI y conservar las tarjetas de propuestas y la confirmación de `confirm_proposal`. Runtime ya soporta aprobaciones genéricas de herramientas MCP marcadas `chat/userOnly`, pero ese mecanismo no sustituye automáticamente la acción de usuario específica de las tarjetas actuales. La landing pública también sigue en `chat-api`.

El Compose conserva ambos servicios deliberadamente: no se interrumpe el chat activo ni se borran sus conversaciones al desplegar Runtime. La migración de UI y el retiro de `chat-api` quedan para el paso siguiente.
