# El asistente sabe que la app solo es necesaria con la puerta Kuatia

**Fecha:** 2026-10-04
**Roadmap:** Post-MVP — web del gym / asistente
**Commit:** `1405279` — docs(asistente): la app solo es necesaria con puerta Kuatia
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/1405279

## Resumen

El asistente decía «la app es la credencial de acceso» como regla general. Ahora sabe que la puerta es opcional y que el socio solo necesita la app con **Kuatia** (credencial QR en el celular). Con **ZKTeco** o sin control de acceso, alcanza con el portal web; la app es una comodidad.

## Cambios principales

- MCP: `puerta.md` («¿El socio necesita la app?»), `app.md` («¿Hace falta descargar la app?»), `producto.md` y `guia.md`.
- Prompt público de `chat-api`: sin «La app es la credencial» general; regla Kuatia / ZKTeco / portal.
- Guía `/docs`: Puerta (opcional, dos formas, cuándo hace falta la app) y Portal web del socio.

## Validación

- Solo texto. Prueba: preguntarle al asistente «¿mis socios tienen que bajar la app si uso ZKTeco?» → no, alcanza con el portal.
- En el server: deploy de MCP y `chat-api`; si `CHAT_PUBLIC_SYSTEM_PROMPT` está definida, actualizarla a mano.

## Referencias

- Commit: `1405279` / https://github.com/LucianoMocchegiani/gym-bro/commit/1405279
