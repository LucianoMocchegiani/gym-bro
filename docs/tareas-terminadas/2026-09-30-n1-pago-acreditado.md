# N1: aviso de pago acreditado

**Fecha:** 2026-09-30
**Roadmap:** E8 — primer corte (solo E1 pago)
**Commit:** `40a331a` — feat(notifications): N1 pago acreditado, bandeja in-app y MailPort
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/40a331a23b39f6771a8ce82de6d5811b59f8c341

## Resumen

Tras un cobro APPROVED (caja o MP) el socio tiene fila in-app y, si no hizo opt-out, un intento de email. `MailPort`: stub o Resend. Push y colas no entran. Reserva, vencimientos y demás eventos no están cableados.

## Cambios principales

- Tablas plantilla / preferencia / `notifications`
- Dispatcher + enganche webhook y CASH
- App: Inicio → Avisos

## Decisiones

- Un canal email detrás de puerto; FCM post-MVP
- Idempotencia `PAYMENT_APPROVED:{transactionId}`

## Validación

- `prisma generate`; `nest build`; `dart analyze` avisos/home
- Prueba de cobro + bandeja a cargo del usuario (migrate en VPS)

## Referencias

- RN-NOT-001..005 · CU-NOT-001/003/005 · `docs/09-esquema-db.md` §4.9c
- Commit: `40a331a` / https://github.com/LucianoMocchegiani/gym-bro/commit/40a331a23b39f6771a8ce82de6d5811b59f8c341
