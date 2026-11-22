# Identidad para Agent Runtime

`GET /api/auth/agent-runtime` es el endpoint de introspección para conectar una instancia de Agent Runtime con GymBro. Requiere el Bearer de una sesión STAFF válida y devuelve `userId`, `tenantId` y `role` derivados del token validado por GymBro; no acepta esos valores del cliente.

Agent Runtime particiona actualmente por un único `userId`, así que la respuesta usa `JSON.stringify([tenantId, role, userId])` como clave opaca estable. El rol se devuelve también por separado y forma parte de la clave para aislar historiales por tenant, perfil y usuario. Agent Runtime reenvía el Bearer original al MCP de GymBro, que conserva su validación de tenant y rol.

Configurar Agent Runtime → Administración → Auth para introspectar `https://<gymbro>/api/auth/agent-runtime`, con `userId` mapeado a `userId` y `email` a `email`. La UI aún no fue migrada desde `chat-api`; esta ruta prepara identidad segura para la integración, no cambia el chat actual.
