# Deuda / tolerancia + startsAt de renovación

**Fecha:** 2026-08-12
**Roadmap:** Acceso OID4VP — tolerancia evaluate + RN-CON-001
**Commit:** `84df5dc` — feat(access,contracts): deuda real, tolerancia y startsAt de renovación
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/84df5dc

## Resumen

Evaluate calcula atraso real desde el `endsAt` del último contrato libre y permite ingreso dentro de `debtToleranceDays` (`ok_deuda_tolerancia`). La renovación MONTHLY encadena al día siguiente del `endsAt` previo si el pack sigue vigente o si hubo ingreso tras el vencimiento; si no hubo ingresos en el hueco, `startsAt` es el día de pago.

## Cambios principales

- `resolveOverdueDays` + gracia en `access-verify`
- Motivo `ok_deuda_tolerancia` + label Admin
- `resolveMonthlyRenewalStartsAt` en contratos MONTHLY
- Docs RN-ACC-005 / RN-CON-001, roadmap, CU y pruebas X8–X10

## Decisiones

- Tolerancia solo afecta puerta; no “gasta” días por calendario.
- Proxy de deuda = días desde `endsAt` libre (sin ledger de pagos).
- Uso de tolerancia = algún `access_attempt` ALLOWED con `createdAt > endsAt`.

## Validación

- `npx tsc --noEmit -p tsconfig.build.json` (API) OK
- Guía manual: gracia 10/20 días, renovación con/sin ingresos post-`endsAt`

## Referencias

- RN-ACC-005, RN-CON-001, CU-ACC-001/002
- [12-acceso-quark-oid4-diseno.md](../12-acceso-quark-oid4-diseno.md)
- Commit: `84df5dc` / https://github.com/LucianoMocchegiani/gym-bro/commit/84df5dc
