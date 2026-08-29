# Checkout MP pack y drop-in desde Caja

**Fecha:** 2026-08-14
**Roadmap:** E10 — Checkout MP desde Admin (staff)
**Commit:** `8371b03` — feat(web): checkout MP pack y drop-in desde Caja
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/8371b03

## Resumen

En `/caja` el staff elige medio Efectivo o Mercado Pago para pack y drop-in. Con MP se crea Preference, se abre el link y se puede copiar; el contrato/reserva se confirma al webhook APPROVED.

## Cambios principales

- Cliente `startStaffMpPackCheckout` / `startStaffMpDropInCheckout`
- UI Caja: medio CASH | MP + abrir/copiar URL
- Roadmap, wireframe §11, CU-PAG-001, pruebas P3b/P3c

## Decisiones

- UI en Caja (no ficha afiliado)
- Pack + drop-in en el mismo thin
- Abrir pestaña + copiar link

## Validación

- `npx tsc --noEmit` en `web`

## Referencias

- CU-PAG-001 · `POST /members/:id/transaction-items/mp/checkout` · drop-in
- Commit: `8371b03` / https://github.com/LucianoMocchegiani/gym-bro/commit/8371b03
