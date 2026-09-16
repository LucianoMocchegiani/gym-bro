# chat-api — documentación interna

Describe **cómo está implementado** este servicio (código en `chat-api/src`). El diseño de producto y las decisiones cerradas siguen en el C-producto: [`docs/16-chat-mcp-diseno.md`](../../docs/16-chat-mcp-diseno.md) y el roadmap [`docs/17-roadmap-chat-mcp.md`](../../docs/17-roadmap-chat-mcp.md).

Setup y env: [`../README.md`](../README.md).

| Documento | Contenido |
|-----------|-----------|
| [01-diseno-y-modelo.md](./01-diseno-y-modelo.md) | Rol, límites, stack, persistencia, aislamiento |
| [02-modulos.md](./02-modulos.md) | Qué hace cada carpeta de `src/` |
| [03-flujos.md](./03-flujos.md) | De abrir el chat a la respuesta; turno staff; landing; abort; errores |
| [04-http.md](./04-http.md) | Rutas, auth, códigos |

Idioma: español. Si el código y este texto divergen, gana el código.
