# App staff: roster de sesiones y Caja

**Fecha:** 2026-09-18
**Roadmap:** E9 — app móvil (staff)
**Commit:** `76d3adc` — feat(mobile): staff roster and Caja cart
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/76d3adc3a831ea303ca065b76877f81a288e68d5

## Resumen

Staff anota crédito desde el calendario (día → roster) y cobra en Caja con el mismo carrito que Admin: efectivo o link MP. El picker de afiliado pagina de a 20 con «Cargar más». Tras MP se hace polling del código de comprobante; el panel detallado queda para el siguiente corte.

## Cambios principales

- Sesiones: `MonthCalendar` → día → roster (CREDIT / cancelar)
- Caja: catálogo y carrito en dos recuadros; medio CASH | MP; débitos ver/baja
- Combobox de afiliados (`GET /members`, pageSize 20)

## Decisiones

- Tabs Cobro | Débitos y Servicios | Packs se mantienen
- Alta de débito (Card Brick) sigue en la web
- Webhook MP no llega a la app: se espera el receipt por polling

## Validación

- `dart analyze` de Caja y sesiones: sin issues
- Prueba en dispositivo: picker, recuadros, cobro CASH/MP (link)

## Referencias

- CU-PAG-002, CU-RES (reserva staff), RN-ROL-005
- Commit: `76d3adc` / https://github.com/LucianoMocchegiani/gym-bro/commit/76d3adc3a831ea303ca065b76877f81a288e68d5
