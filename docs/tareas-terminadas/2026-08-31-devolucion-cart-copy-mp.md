# Devolución por cart en Arqueo y copy de ítems MP

**Fecha:** 2026-08-31
**Roadmap:** E5 — pagos y caja
**Commit:** `a876630` — feat(caja): devolucion por cart en arqueo y copy de items MP
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/a876630

## Resumen

En Cierres el staff devuelve ítems de un cobro (CASH o MP) con un picker: un egreso, un comprobante `REFUND`. `/devoluciones` queda solo para la cola de solicitudes del afiliado. Los ítems de la Preference de Mercado Pago usan el mismo copy que el comprobante GymBro (pack = nombre + servicios/créditos; drop-in = servicio · sede · horario).

## Cambios principales

- `POST /api/transactions/:transactionId/refunds` (lote); el endpoint por ítem queda como wrapper.
- Un comprobante `REFUND` por ejecución; unique de cobro parcial por `transaction_id`.
- MP: un refund del pago del cart (suma); si falla, egreso local + `mp_refund_manual_pending`.
- Grilla: INCOME por cart, OUTCOME por `receipt_id` del lote; Devolver solo en `/arqueo`.
- Preference MP: `title`/`description` alineados al comprobante (`mp-item-copy`).

## Decisiones

- Devolver solo en Arqueo, no en Reportes.
- Unidad de UX = el cart; internamente se revierten derechos ítem a ítem.
- El modal de MP lista sobre todo `title`, por eso pack lleva servicios y drop-in lleva sede/horario en el título.
- Refund API con cuenta MP de prueba puede dar 401; producción live no está verificada.

## Validación

- `npx tsc --noEmit` en API OK.
- Migraciones aplicadas en Postgres local.
- Prueba manual: devolución CASH/MP en Cierres; copy de ítems en un cobro MP nuevo.

## Referencias

- CU-PAG-001 / CU-PAG-005; RN-PAG-009 / RN-PAG-011.
- `docs/05-casos-de-uso/pagos-caja.md`, `docs/09-esquema-db.md`.
- Commit: `a876630` / https://github.com/LucianoMocchegiani/gym-bro/commit/a876630
