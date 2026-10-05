# Estado en Mercado Pago de cada cobro

**Fecha:** 2026-10-04
**Roadmap:** Pagos / Mercado Pago (CU-PAG-003)
**Commit:** `9df9baa` — feat(payment): show live Mercado Pago payment status for MP sales
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/9df9baa

## Resumen

Un gym veía una venta aprobada en Faciliter pero no encontraba el ingreso en la app de Mercado Pago: el pago puede estar aprobado y la plata pendiente de liberación, y la app no siempre lo muestra. Ahora cada cobro MP tiene «Estado en Mercado Pago», que consulta el pago en el momento y muestra estado, comisiones, neto, liberación de la plata y si lo cobró la cuenta conectada.

## Cambios principales

- `GET /transactions/:id/mp-payment` (`members.read`, `MpPaymentStatusService`): lee `GET /v1/payments/{id}` con el token del tenant, sin persistir.
- El adaptador MP mapea `status_detail`, `date_approved`, `collector_id`, `transaction_details.net_received_amount`, `fee_details`, `money_release_date` y `money_release_status`.
- `collectorMatches` compara `collector_id` con `mercadopago_accounts.mp_user_id`.
- Web: botón con ícono de billetera en las filas MP de Cierre/Reportes y en el comprobante (staff, incluida la Caja). `MpPaymentStatus` muestra el detalle.

## Decisiones

- Consulta en vivo con botón; sin migración ni columna guardada.
- Si cobró otra cuenta, la venta se aprueba igual y el detalle lo avisa.
- Solo panel web; la app staff queda para después.
- Los planes Faciliter viejos cobrados en un gym no se consultan desde el gym (los cobró `admin`).

## Validación

- API y web: `tsc` OK; ESLint sin errores en los archivos nuevos (quedan 3 previos en `caja/page.tsx`). Sin tests automáticos.
- Prueba manual: `local/en-testeo/estado-cobro-mercado-pago.md` (caso P4b de `08`).

## Referencias

- CU-PAG-003, `06` §7.2, `08` P4b, guía «Cierre», ayuda MCP `mercadopago`, Postman «Staff GET transaction MP payment status».
- Commit: `9df9baa` / https://github.com/LucianoMocchegiani/gym-bro/commit/9df9baa
