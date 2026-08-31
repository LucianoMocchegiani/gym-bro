# Cierre, solicitudes de devolución y categoría en grilla

**Fecha:** 2026-08-31
**Roadmap:** E5 / E9 / E10 — caja, app afiliado
**Commit:** `40c9441` — feat(caja): Cierre, solicitudes de devolucion y categoria en grilla
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/40c9441

## Resumen

Nav **Cierre** (`/arqueo`) y **Solicitudes de devolución** (`/devoluciones` = cola de `refund_requests` del afiliado). La grilla de Cierre/Reportes suma **Categoría** (Venta / Devolución) aparte de Tipo (Ingreso / Egreso). Flutter parsea `recentTransactionItems` para que el pedido desde Tienda → Pagos llegue a esa cola.

## Cambios principales

- `LedgerCategory` derivada de `kind` (`INCOME`→SALE, `OUTCOME`→REFUND).
- Flutter: `AccountRecentTransactionItem` + `recentTransactionItems`.
- Docs: categoría persistida (compra/gastos) anotada como post-MVP.

## Decisiones

- Categoría ≠ ingreso/egreso. Hoy se infiere; post-MVP columna en `cash_movements`.
- Staff Devolver en Cierre no crea solicitud; solo el afiliado pide.

## Validación

- `npx tsc --noEmit` API y web OK.
- Prueba manual: nav, columna categoría, solicitudes desde la app.

## Referencias

- CU-PAG-003 / CU-PAG-004 / CU-PAG-005; `docs/99-backlog-post-mvp.md`.
- Commit: `40c9441` / https://github.com/LucianoMocchegiani/gym-bro/commit/40c9441
