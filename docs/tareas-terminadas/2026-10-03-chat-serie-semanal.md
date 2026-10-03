# Chat: serie semanal sin clases no se propone

**Fecha:** 2026-10-03
**Roadmap:** Chat MCP — propuestas de sesiones (`docs/17`)
**Commit:** `8bbca0b` — fix(mcp): serie semanal sin clases no se propone y la tarjeta muestra cuántas salen
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/8bbca0b

## Resumen

El asistente propuso una serie lun–vie con «desde» y «hasta» el mismo sábado: la tarjeta se mostró y falló al confirmar con el error en inglés de Nest. Ahora la propuesta cuenta las clases antes de mostrarse y el modelo pregunta hasta cuándo si el usuario no lo dijo.

## Cambios principales

- `propose_create_recurring_sessions` calcula los días de clase como Nest (sin las que ya empezaron); con 0 devuelve el motivo al modelo y no hay tarjeta.
- Línea **Clases** en la tarjeta: cantidad, primera y última.
- Descripción de la herramienta y de `endsOn`: preguntar el «hasta», no repetir «desde».
- Confirmación fallida: el mensaje ya no repite «No se pudo».
- Ayuda `sesiones` actualizada.

## Decisiones

- Sin «hasta» por defecto: el chat pregunta (pedido del usuario).

## Validación

- `npx tsc --noEmit` en MCP; conteo verificado (sábado 10/10 lun–vie → 0; 12/10 al 06/11 → 20).
- Prueba en prod pendiente (`local/en-testeo/probar-chat-serie-semanal.md`).

## Referencias

- `mcp/src/tools/write-sessions.ts`, RN-ASI-001.
- Commit: `8bbca0b` / https://github.com/LucianoMocchegiani/gym-bro/commit/8bbca0b
