# Backlog — App afiliado

**Índice:** [99-backlog-post-mvp.md](../99-backlog-post-mvp.md)

## Hecho (E9, 2026-08-31)

- Tienda: packs + drop-in, `CatalogCard`, carrito MP (`POST /me/transaction-items/mp/cart`).
- Historial: un comprobante por transacción + solicitar devolución.
- Sesiones: calendario mensual, crédito o drop-in al carrito, Mis clases.

## Pendiente

| Ítem | Estado | Notas |
|------|--------|--------|
| Historial de packs de otros períodos | Pendiente | Inicio solo vigencia **hoy** (`coverage=current`). UI + `coverage=all` o endpoint dedicado. No es el Historial de comprobantes (eso ya está) |
| Paginación de comprobantes | Pendiente | Hoy lista hasta 50 |
| Productos en Tienda | Pendiente | Misma `CatalogCard`; módulo shop → [producto.md](./producto.md) |
| Tickets de reclamo (IA) | Pendiente | Abrir un reclamo desde la app; la IA lleva el hilo (estilo ML/MP). Inbox Admin: [admin.md](./admin.md) |
| Identity + picker de gym | Corte A en código | Cuenta Faciliter (`identities`); login app email+password; lista de gyms; JWT de negocio al elegir. Wallet de la persona. Google/Apple después. Admin web sigue slug+pass. |

## Mejoras de UX (charla)

| Ítem | Estado | Notas |
|------|--------|--------|
| Devolución detrás de ⋮ | Pendiente | En Historial, no un botón grande “Solicitar devolución” en cada card |
| Ajustes como menú | Pendiente | Cuenta → pantalla cuenta; Wallet → solo reiniciar; Sistema → tema + API **solo en debug** |
| Ocultar detalles de API en Ajustes | Pendiente | Visible solo en build de desarrollo |

Rutinas y avisos de la app: [roadmap E7/E8](../11-roadmap-mvp.md).

[Índice post-MVP](../99-backlog-post-mvp.md)
