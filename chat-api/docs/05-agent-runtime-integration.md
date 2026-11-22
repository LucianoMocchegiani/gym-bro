# Identidad para Agent Runtime

`GET /api/auth/agent-runtime` es el endpoint de introspección para conectar una instancia de Agent Runtime con GymBro. Requiere el Bearer de una sesión STAFF válida y devuelve `userId`, `tenantId` y `role` derivados del token validado por GymBro; no acepta esos valores del cliente.

Agent Runtime particiona actualmente por un único `userId`, así que la respuesta usa `JSON.stringify([tenantId, userId])` como clave opaca estable. El rol se devuelve por separado, no forma parte de esa clave: cambiar permisos no debe abrir otro historial. Agent Runtime reenvía el Bearer original al MCP de GymBro, que conserva su validación de tenant y rol.

Configurar Agent Runtime → Administración → Auth para introspectar `https://<gymbro>/api/auth/agent-runtime`, con `userId` mapeado a `userId` y el Bearer de GymBro. La UI aún no fue migrada desde `chat-api`; esta ruta prepara identidad segura para la integración, no cambia el chat actual.
