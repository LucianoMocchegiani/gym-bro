# Backlog — Pagos y caja

**Índice:** [99-backlog-post-mvp.md](../99-backlog-post-mvp.md)

| Ítem | Estado | Notas |
|------|--------|--------|
| Facturación electrónica AFIP | Pendiente | MVP = comprobante interno |
| Más medios de pago (además de MP + efectivo) | Pendiente | |
| Contracargos / chargebacks automatizados | Pendiente | |
| Liquidación si GymBro cobrara en el medio | Pendiente | Hoy cobra el gym (MP del tenant) |
| Arqueo / contabilidad avanzada | Pendiente | MVP ya tiene arqueo básico |
| Gastos operativos y compra de mercadería | Pendiente | No cuelgan de `transactions`. Documento `expense` / `purchase` → `cash_movements` `OUTCOME`. Venta de producto = línea de carrito. **Categoría de caja:** hoy se deriva de `kind` (Venta/Devolución). Con compra/gastos hay que persistir categoría (`SALE` / `REFUND` / `PURCHASE` / gastos) — `kind` solo dice ingreso/egreso |
| Débito automático (packs MONTHLY) | Implementado (probar) | **P2 cierre MVP.** Tarjeta + job. UI Caja (`/caja?memberId=&vista=debitos`). RN-PAG-013..016, CU-PAG-008..010. [18](../18-prioridades-cierre-mvp.md) · pruebas P9 en `08`. |
| Observabilidad de un cobro | Pendiente | Ver de un vistazo: transacción, ítems, si creó contratos/reservas y el recibo (nota local Caja) |

MP sandbox → live sigue en el [roadmap MVP E5](../11-roadmap-mvp.md), no acá.

[Índice post-MVP](../99-backlog-post-mvp.md)
