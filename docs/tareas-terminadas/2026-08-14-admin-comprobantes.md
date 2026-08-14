# Comprobantes en Caja y ficha afiliado

**Fecha:** 2026-08-14  
**Roadmap:** E10 — Comprobantes (receipts)  
**Commit:** `56a7d8f` — feat(web): comprobantes en caja y ficha afiliado  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/56a7d8f

## Resumen

Staff puede ver el comprobante interno (`GB-######`) tras un cobro CASH, desde movimientos de caja y desde la ficha del afiliado.

## Cambios principales

- Cliente `web/lib/api/receipts.ts` + `ReceiptPanel`
- Caja: panel post-cobro + botón en ingresos
- Ficha: listado + link en pagos APPROVED
- `ContractDetail` web incluye `payment`

## Decisiones

- Panel en la misma pantalla (sin ruta dedicada ni PDF/email)

## Validación

- `tsc` web OK; prueba manual Caja / afiliado

## Referencias

- RN-PAG-009
- Commit: `56a7d8f` / https://github.com/LucianoMocchegiani/gym-bro/commit/56a7d8f
