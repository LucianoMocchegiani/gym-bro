# Texto de Débitos en la app sin Card Brick

**Fecha:** 2026-10-03
**Commit:** `690c1d8` — fix(mobile): texto de Debitos sin Card Brick (alta por link MP en el panel web)
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/690c1d85b7337073ccc966627acbb49973fe9863

## Resumen

La pestaña Débitos de Caja en la app (staff) decía que el alta se hacía «con tarjeta (Card Brick)» en el panel web. Ahora dice que el alta es un link de suscripción de Mercado Pago que se genera en Caja del panel web. La app sigue solo con cola, mandato y baja.

## Validación

- `dart analyze` y `dart format` sin cambios en `staff_caja_screen.dart`.
- Se ve con la próxima build de la app.

## Referencias

- RN-PAG-013, CU-PAG-010.
- Tickets locales: débito self-service desde la app y portal web del afiliado.
- Commit: `690c1d8` / https://github.com/LucianoMocchegiani/gym-bro/commit/690c1d85b7337073ccc966627acbb49973fe9863
