# App afiliado: carrito MP, historial y calendario de sesiones

**Fecha:** 2026-08-31
**Roadmap:** E9 — App afiliado (Tienda / Sesiones)
**Commit:** `20fb1c5` — feat(mobile): carrito MP, historial y calendario de sesiones
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/20fb1c5

## Resumen

El afiliado paga packs y drop-in con el mismo carrito MP que Caja (`POST /me/transaction-items/mp/cart`). La Tienda es catálogo (Packs | Sesiones). El Historial lista un comprobante por transacción. Sesiones es un calendario mensual: el día abre las clases; con créditos reserva, sin créditos el drop-in va al carrito.

## Cambios principales

- API: cart MP Member; `imageUrl` / `serviceImageUrl` en catálogo.
- Flutter: carrito, `CatalogCard`, Historial (⋮), calendario + Mis clases.
- Docs, Postman y default API `https://api.faciliter.xyz`.

## Decisiones

- Sin cash desde el celular.
- Precio y badges de sesión: Tienda siempre; detalle del día solo sin créditos; Mis clases nunca.
- El día abre pantalla nueva (no lista bajo el calendario).

## Validación

- `fvm dart analyze` en sessions/tienda: 0 issues.
- Prueba en dispositivo: calendario, reserva/crédito, carrito drop-in, Historial ⋮.

## Referencias

- CU-PAG-001, CU-RES-001/004, RN-SER-008.
- Commit: `20fb1c5` / https://github.com/LucianoMocchegiani/gym-bro/commit/20fb1c5
