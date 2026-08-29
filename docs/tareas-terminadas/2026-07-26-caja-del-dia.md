# Cobro en caja + caja del día

**Fecha:** 2026-07-26  
**Roadmap:** E5 — Cobro en caja / Caja del día  
**Commit:** `27963e9` — feat(api): record cash register movements for CASH transaction_items  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/27963e9

## Resumen

Pagos `method=CASH` (contrato o drop-in) generan `cash_movements` INCOME 1:1 con el payment. `GET /cash-register/day` lista movimientos y totales del día operativo en timezone BA. STUB no entra a caja. Arqueo diferido.

## Cambios principales

- Prisma `cash_movements` + enums `CashMovementKind` / `CashMovementConcept`
- Hook en contracts y drop-in; API Staff/Super `GET .../cash-register/day`
- Docs README / arquitectura / esquema / roadmap; Postman

## Decisiones

- Solo CASH genera movimiento
- Día calendario `America/Argentina/Buenos_Aires`
- Sin arqueo ni backfill de pagos CASH previos

## Validación

- migrate + lint/build OK
- Prueba: drop-in CASH → day income 8000, 1 movimiento DROP_IN

## Referencias

- CU-PAG-002, CU-PAG-003 (parcial), RN-PAG-007/008
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/27963e9
