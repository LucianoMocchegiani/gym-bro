# Arqueo de caja del día

**Fecha:** 2026-07-26  
**Roadmap:** E5 — Arqueo  
**Commit:** `d653019` — feat(api): add cash day reconciliation (arqueo)  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/d653019

## Resumen

Staff declara efectivo contado (`declaredAmount`); el sistema guarda esperado (suma CASH del día), diferencia y nota. Un arqueo por día operativo (BA). GET day incluye `reconciliation`. No bloquea cobros posteriores.

## Cambios principales

- Tabla `cash_reconciliations` + `POST /cash-register/day/reconcile`
- Audit `cash.reconcile`; docs / Postman / roadmap

## Decisiones

- 1 arqueo/día → 409 si ya existe
- Solo hoy o pasado; declarado ≥ 0
- Permiso `cashier.operate`

## Validación

- migrate + lint/build OK
- Prueba: esperado 8000 / declarado 7500 → diff −500; segundo POST → 409

## Referencias

- CU-PAG-003, RN-PAG-007/008
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/d653019
