# Comprobante detallado, grilla única de movimientos y staff en MP

**Fecha:** 2026-08-30
**Roadmap:** E5 / E11 — caja, comprobantes, reportes
**Commit:** `f71df1a` — feat(caja): grilla unica de movimientos y staff en cobros MP
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/f71df1a

## Resumen

Cierres y Reportes usan la misma grilla: una fila por cobro o devolución de cart, con tipo, staff y comprobante. El comprobante lista los servicios del pack. En Mercado Pago el staff que armó el link queda en `transactions` y el webhook lo copia a `cash_movements`.

## Cambios principales

- Líneas de comprobante/reportes compartidas (`payment-line` + servicios del pack).
- `MoneyMovementsTable` reutilizada en `/arqueo` y `/reportes`; sin expand de ítems.
- Reportes incluye egresos (devoluciones).
- `transactions.recorded_by_staff_id` + migración `20260830220000_transaction_recorded_by_staff`.
- Script de limpieza de cobros de prueba (`limpiar-cobros-dev.sql`).

## Decisiones

- El detalle de líneas vive en el comprobante, no en filas expandibles.
- `cash_movements` sigue siendo el libro de caja (CASH y MP); rename diferido.

## Validación

- Typecheck API y web OK.
- Migración aplicada en Postgres local.
- Prueba manual: cobro CASH/MP, grilla, comprobante con servicios, staff en MP nuevo.

## Referencias

- CU-PAG-001/002/003/005; RN-PAG-009.
- Deuda de nombre: `docs/99-backlog-post-mvp.md` (renombrar `cash_movements`).
- Commit: `f71df1a` / https://github.com/LucianoMocchegiani/gym-bro/commit/f71df1a
