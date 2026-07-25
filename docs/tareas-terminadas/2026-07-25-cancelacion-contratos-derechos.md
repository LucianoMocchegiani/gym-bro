# Cancelación de contratos (pierde derechos)

**Fecha:** 2026-07-25  
**Roadmap:** E3 — Cancelación pack mixto (pierde todo)  
**Commit:** `e6bf8cb` — feat(api): cancel active contracts and revoke pack rights  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/e6bf8cb

## Resumen

Staff cancela cualquier contratación `ACTIVE` (ACCESS / CREDITS / MIXED): `CANCELLED`, sin acceso libre y créditos en 0. El Payment sigue `APPROVED`. Motivo opcional en auditoría.

## Cambios principales

- `PATCH /api/contracts/:contractId/status` (+ Super mirror)
- Audit `contract.cancel` con `reason` opcional
- Postman: Staff PATCH cancel contract

## Decisiones

- Cualquier pack activo, no solo MIXED
- Solo Staff + `members.write`
- Sin reembolso (`REFUNDED` / MP / afiliado → E5)

## Validación

- lint/build OK; ruta mapeada en Docker
- Prueba manual Postman (cancel + audit)

## Referencias

- CU-CON-002, RN-SER-009
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/e6bf8cb
