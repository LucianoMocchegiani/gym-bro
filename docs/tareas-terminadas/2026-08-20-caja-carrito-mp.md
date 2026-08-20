# Caja: carrito con Mercado Pago y un solo link (modelo MercadoLibre)

**Fecha:** 2026-08-20
**Roadmap:** Post-roadmap
**Commit:** `b1d77d8` — feat(api)(web): caja carrito MP con un solo link (modelo MercadoLibre)
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/b1d77d8

## Resumen

En `/caja` el staff agrega packs y servicios (drop-in) al carrito y cobra por Mercado Pago con el **modelo MercadoLibre**: se crea **una Preference con `items[]` → un solo link con el total → un solo pago**. Al webhook APPROVED se confirma un contrato/reserva por cada payment del carrito. El checkout single-item de pack/drop-in se mantiene intacto para el flujo member/mobile.

## Cambios principales

- **API**: modelo `CartCheckout` + `payments.cartId`; migración `20260820090000_cart_checkout`. `POST /members/:memberId/payments/mp/cart` (`members.write`) con `items[]` y reuso por idempotencia. Webhook reescrito: `applyRemoteStatus` cae a carrito si el refId no es payment; `applyRemoteStatusCart` marca cart + payments y `ensureCartRights` confirma contratos/reservas. `simulate` acepta `cartId`.
- **Web**: `caja/page.tsx` con flujo single-link (1 ventana, 1 URL copiable, vacía carrito); "+" deshabilitado en servicios sin `dropInPrice` con tooltip explicativo. `MemberPicker` nuevo con búsqueda, quita el foco al seleccionar y marca ✓.
- **Postman**: request staff de carrito + simulate con `cartId`; variable `mpCartId`.

## Decisiones

- `mp_payment_id` se guarda **solo en `cart_checkouts`** (los payments del carrito no lo replican) porque `payments.mp_payment_id` es UNIQUE y un carrito comparte un único pago MP.
- **Refund de carrito MP no soportado** (limitación conocida, a resolver en iteración de devoluciones).
- Los endpoints single-item del backend se conservan para member/mobile; solo el adapter de Preference pasó a armar `items: [...]`.

## Validación

- API: `nest build` + ESLint OK. Web: `next build` OK; `npm run lint` = baseline 13 preexistente, sin nuevos.
- Migración aplicada y DB en sync (`prisma migrate diff` vacío); Prisma Client regenerado en host y dentro del contenedor `gymbro-api`.

## Referencias

- CU-PAG-001; `docs/05-casos-de-uso/pagos-caja.md`; `docs/09-esquema-db.md` (4.15g `cart_checkouts`).
- Postman GymBro API — carpeta Mercado Pago.