# N1: más eventos y cron de vencimiento

**Fecha:** 2026-09-30
**Roadmap:** E8 — reserva, waitlist, devolución, E2/E3
**Commit:** `830ac63` — feat(notifications): reserva, waitlist, devolución y cron de vencimiento
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/830ac63466dd09810a2a45a50f269dfa77c86023

## Resumen

Además del pago, el socio recibe avisos de reserva confirmada/cancelada, promoción de waitlist, devolución ejecutada y pack MONTHLY por vencer o en tolerancia. Cron diario 12:00 ART. Sin puerta ni rutina. Opt-out de email por evento en la app.

## Cambios principales

- Enum de eventos + `notifyMember`
- Ganchos en reservas, waitlist, refunds
- `ExpirationNotifyJob` + `@nestjs/schedule`

## Decisiones

- Waitlist: solo aviso `WAITLIST_PROMOTED` (no duplicar reserva confirmada)
- E2/E3: una vez por contrato (no un mail por cada día de la ventana)
- Puerta fuera de alcance

## Validación

- `prisma generate`; `nest build`; `dart analyze` avisos
- Prueba de reserva/waitlist/devolución y cron a cargo del usuario

## Referencias

- RN-NOT-002 · N7–N10 en `docs/08-casos-prueba-manuales.md`
- Commit: `830ac63` / https://github.com/LucianoMocchegiani/gym-bro/commit/830ac63466dd09810a2a45a50f269dfa77c86023
