# Admin devoluciones staff

**Fecha:** 2026-08-13  
**Roadmap:** E10 — Devoluciones staff (thin gap)  
**Commit:** `7a3a35a` — feat(web): Admin devoluciones staff (cola + ejecutar refund)  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/7a3a35a

## Resumen

Staff con `transaction_items.refund` puede listar solicitudes y ejecutar devoluciones desde Admin: cola `/devoluciones` (PENDING/EXECUTED/REJECTED) y devolución directa por `transactionItemId` (doble cobro). Atajo desde pagos APPROVED en ficha afiliado.

## Cambios principales

- Cliente `web/lib/api/refunds.ts` (`GET /refund-requests`, `POST /transaction-items/:id/refunds`)
- Página `/devoluciones` + nav Operación + atajo Inicio
- Link **Devolver** en pagos recientes de `/afiliados/[id]`
- Roadmap E10 + README web

## Decisiones

- Confirmación tipada `DEVOLVER` (acción irreversible)
- Sin rechazo staff en UI (la API no lo expone; solo política afiliado → REJECTED)
- Prefill `?paymentId=` para doble cobro / directa

## Validación

- `eslint` en archivos nuevos OK; `next build` incluye `/devoluciones`
- Prueba manual: cobro Caja → Devolver / Ejecutar desde solicitud → OK

## Referencias

- CU-PAG-005 / CU-PAG-007, RN-PAG-011
- Commit: `7a3a35a` / https://github.com/LucianoMocchegiani/gym-bro/commit/7a3a35a
