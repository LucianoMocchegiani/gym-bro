# Comprobante interno (recibo)

**Fecha:** 2026-07-26
**Roadmap:** E5 — Comprobante interno (RN-PAG-009)
**Commit:** `4604121` — feat(api): emit internal receipts for CASH and STUB transaction_items
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/4604121

## Resumen

Tras un pago CASH o STUB aprobado (contrato o drop-in), se emite un comprobante interno 1:1 con código `GB-######` por tenant. El afiliado y el staff pueden consultarlo; no hay backfill ni email en N1.

## Cambios principales

- Tabla `receipts` + secuencia por tenant
- Emisión en TX al crear contrato y drop-in
- APIs Member/Staff para listar y obtener por pago o id

## Decisiones

- Solo CASH y STUB; sin factura fiscal ni email
- Pagos anteriores a la migración → 404 (sin backfill)
- Idempotencia: reusar `idempotencyKey` no crea recibo nuevo

## Validación

- Migración aplicada; lint/build OK
- Prueba manual Postman: contrato/drop-in emiten recibo; GET member/staff OK

## Referencias

- RN-PAG-009; `docs/09-esquema-db.md`; Postman GymBro API
- Commit: `4604121` / https://github.com/LucianoMocchegiani/gym-bro/commit/4604121
