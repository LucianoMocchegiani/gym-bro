# Transferencia y descuento por pago sin comisión en Caja

**Fecha:** 2026-10-04
**Roadmap:** Pagos / Caja (CU-PAG-002, RN-PAG-020)
**Commit:** `99c085b` — feat(caja): transferencia y descuento por pago sin comision (RN-PAG-020)
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/99c085b

## Resumen

Las transferencias se cargaban como efectivo y ensuciaban el Cierre, y el gym no podía bajarle el precio a quien paga sin Mercado Pago (que no le genera comisión). Ahora Caja tiene el medio **Transferencia** y un **descuento** para efectivo y transferencia, precargado con el default del gym (7,6 % = comisión MP al instante con IVA) y editable por venta. La ayuda del chat explica la comisión de MP por plazo, cómo poner la plata al instante y da los links oficiales.

## Cambios principales

- Migración `20261005120000_transfer_and_cash_discount`: `PaymentMethod.TRANSFER`; `tenant_settings.cash_discount_bps` / `transfer_discount_bps` (default 760); `transaction_items.list_amount` / `discount_bps`; `transactions.transfer_reference`.
- `POST …/transaction-items/cash/cart` (gym y plataforma) acepta `method`, `discountPercent` y `transferReference`. `CashPaymentService` aplica el % por ítem (`cash-discount.ts`: redondeo al peso, mínimo $1) y audita `payment.discount_override` si difiere del default.
- `GET /cash/discount-defaults` (staff) para que Caja precargue el %. `PATCH /tenant-settings` suma `cashDiscountPercent` / `transferDiscountPercent`.
- Comprobante: referencia y, por línea, precio de lista + %. Grilla de movimientos: «Transferencia», referencia y %. Reportes: `byMethod.TRANSFER` y `totalDiscounts`. El Cierre ya trataba la transferencia como digital.
- Web: Config → Operación (dos %), Caja (medio Transferencia, Descuento, Referencia, total con descuento en el botón), Reportes.
- MCP: `get_reports_summary` con transferencias y descuentos; ayuda `caja`, `packs` y `mercadopago` (tarifas por plazo, ≈ 7,6 % al instante, Costos y cuotas, links oficiales); aliases `transferencia`, `descuento`, `comision`.
- App: etiqueta «Transferencia» en comprobante e historial.

## Decisiones

- Un solo % por venta, aplicado a cada ítem; tope 99 %; redondeo al peso (los montos son pesos enteros).
- Cualquiera que cobra en Caja puede cambiar el %; queda auditado si difiere del default.
- Sin `discountPercent` en el body se cobra precio de lista (apps viejas).
- Link MP, débito y prueba de plataforma sin descuento; devoluciones devuelven lo cobrado.
- Caja de `admin` igual que un gym, con su Config.
- Caja de la app del staff queda para después (`local/mis-tickets/ticket-app-caja-transferencia-descuento.md`).

## Validación

- API, web y MCP: `tsc` OK. ESLint sin errores nuevos (quedan los previos de `cash-payment.service`, `transaction.service` y `caja/page.tsx`). Sin tests automáticos.
- Prueba manual: `local/en-testeo/caja-transferencia-descuento.md` y `local/en-testeo/ayuda-comision-mp.md` (casos P3t–P3v de `08`).

## Referencias

- RN-PAG-020, CU-PAG-002, `06` §7.3, `08` P3t–P3v, `09` (enum, `tenant_settings`, `transaction_items`, `transactions`, migraciones), `16` (`get_reports_summary`), guía «Config → Operación», «Caja» y «Mercado Pago», Postman (tenant settings, cash cart, «Staff GET cash discount defaults»).
- Fuentes MP: https://www.mercadopago.com.ar/herramientas-para-vender/check-out · https://www.mercadopago.com.ar/ayuda/19032 · https://www.mercadopago.com.ar/costs-section
- Commit: `99c085b` / https://github.com/LucianoMocchegiani/gym-bro/commit/99c085b
