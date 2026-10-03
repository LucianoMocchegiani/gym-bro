# Altas de plataforma colgadas: liberar slug y crear el gym sin depender del webhook

**Fecha:** 2026-10-03
**Roadmap:** Alta self-serve de gym (RN-PAG-017)
**Commit:** `2b9a96b` — fix(signup): liberar slug de altas sin autorizar y crear el gym sin depender del webhook
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/2b9a96b

## Resumen

Las altas de `/empezar` que fallaban o se abandonaban en MP quedaban en `PENDING` para siempre y reservaban el subdominio. Una alta autorizada podía no crear el gym si el aviso de MP no se procesaba. Ahora el gym nace también consultando MP, y los intentos sin autorizar vencen.

## Cambios principales

- `GET /identity/tenants` (vuelta a `/cuenta`) consulta en MP los preapproval `PENDING` del dueño y aplica el estado (nace el gym si está autorizado).
- Job horario: misma consulta para todos los `PENDING`; los de más de 1 h sin autorizar pasan a `FAILED` («Vencido…») y se cancela el preapproval en MP.
- Reintento del mismo slug por el mismo dueño: el `PENDING` anterior pasa a `FAILED` («Reemplazado…»). Antes de descartar se consulta MP.
- Webhook: acepta topics IPN viejos (`preapproval`, `authorized_payment`).
- `fulfill` no marca `FAILED` si otra ejecución ya completó el alta; el aviso de cancelación de un intento vencido no manda el mail de débito fallido.
- Docs: guía MP aclara que basta el producto Checkout Pro (las suscripciones van por API).

## Decisiones

- Vencimiento 1 h, job cada hora (pedido del usuario): el slug se libera entre 1 y 2 h.
- Sin migración: se reutiliza `FAILED` + `last_error`.

## Validación

- `npx tsc --noEmit` y eslint en API.
- Prueba en prod pendiente (`local/en-testeo/probar-alta-plataforma-slug.md`). Requiere volver a pegar el token de `admin` por el cambio de `MP_CREDENTIALS_SECRET`.

## Referencias

- RN-PAG-017, `docs/09` §4.15h3, casos P3k / P3l.
- Commit: `2b9a96b` / https://github.com/LucianoMocchegiani/gym-bro/commit/2b9a96b
