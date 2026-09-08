# Backlog — Técnico

**Índice:** [99-backlog-post-mvp.md](../99-backlog-post-mvp.md)

| Ítem | Estado | Notas |
|------|--------|--------|
| Renombrar `cash_movements` | Pendiente | Quedó de cuando caja era solo efectivo. Hoy es el asiento del día CASH y MP (1 `INCOME`/`OUTCOME` por `transaction_item`). Candidatos: `register_movements` / `ledger_movements`. Rename + migración Prisma + docs/API |
| Rate limit + hardening | Pendiente | Límites por endpoint, k6, monitoreo (Sentry o similar), secrets vault |
| Chat + MCP como infra | C5 drawer | Burbuja Admin → `chat-api`. [16](../16-chat-mcp-diseno.md) · [17](../17-roadmap-chat-mcp.md) |
| Tope y costo OpenRouter | Prioridad cierre (P4) | Tope C7 + consumo para pricing. [18](../18-prioridades-cierre-mvp.md) · [17](../17-roadmap-chat-mcp.md) |

Deploy staging/prod y CI: [operaciones.md](./operaciones.md).

[Índice post-MVP](../99-backlog-post-mvp.md)
