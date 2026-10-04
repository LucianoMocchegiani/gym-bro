# Ventas de planes Faciliter en admin

**Fecha:** 2026-10-04
**Roadmap:** Plan Faciliter / Caja de plataforma (P3)
**Commit:** `f85751a` — feat(payment): platform plan sales live in admin with billed gym
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/f85751a

## Resumen

Las ventas de planes Faciliter (Caja de `admin` en efectivo o MP, y cobros de la suscripción self-serve) quedaban en el tenant del gym: su caja, sus reportes y su numeración de comprobantes, y el gym podía devolverse el plan. Admin no las veía y la venta por MP desde su Caja no se completaba. Ahora la venta es de `admin` y el gym solo recibe el contrato del plan (RN-PAG-019).

## Cambios principales

- Migración `20261004200000_transactions_billed_tenant`: `transactions.billed_tenant_id` (gym facturado, SET NULL).
- Caja de `admin` (efectivo y MP) y `recordPlanPayment` del alta self-serve crean la transacción, el ingreso de caja y el comprobante en `admin`, con `billed_tenant_id` = gym.
- `ContractsService` crea el contrato TENANT en el gym facturado; `notifyPaymentApproved` avisa al dueño de ese gym.
- Venta MP de la Caja de `admin`: la transacción y la `notification_url` ahora son de `admin` (antes eran del gym y el webhook no la encontraba con el token de `admin`).
- Comprobantes de venta de plan con el nombre del gym.
- Grilla de Cierre/Reportes: `billedTenantName` (columna Cliente) y `refundable`; la herramienta MCP de caja y reportes devuelve el gym.
- Devoluciones: la API rechaza (403) devolver desde un gym un ítem con pack de otro tenant; la web oculta Devolver en esas filas.

## Decisiones

- Cobro, caja y comprobante en `admin`; el gym solo conserva el contrato.
- Devoluciones de planes solo desde `admin`, con su MP.
- Las ventas viejas que ya quedaron en gyms se dejan como están (sin Devolver).
- Fuera de alcance: el borrado de packs de `admin` y los contadores de contratos de reportes siguen contando los contratos TENANT.

## Validación

- API, web y MCP: `tsc` OK; ESLint de los archivos tocados sin errores nuevos. Sin tests automáticos del flujo.
- Prueba manual pendiente: `local/en-testeo/ventas-plan-faciliter-admin.md` (casos P3m y P3p–P3s de `08`).
- Deploy: `prisma migrate deploy` y reinicio de API, web y MCP.

## Referencias

- RN-PAG-017, RN-PAG-019, CU-PAG-002, CU-PAG-005, `06` §7.3, `08` P3m y P3p–P3s, `09` §4.15g y §4.15h3, guía «Contratar Faciliter», ayuda MCP `plan`.
- Commit: `f85751a` / https://github.com/LucianoMocchegiani/gym-bro/commit/f85751a
