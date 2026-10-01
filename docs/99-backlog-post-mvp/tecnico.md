# Backlog — Técnico

**Índice:** [99-backlog-post-mvp.md](../99-backlog-post-mvp.md)

| Ítem | Estado | Notas |
|------|--------|--------|
| Renombrar `cash_movements` | Pendiente | Quedó de cuando caja era solo efectivo. Hoy es el asiento del día CASH y MP (1 `INCOME`/`OUTCOME` por `transaction_item`). Candidatos: `register_movements` / `ledger_movements`. Rename + migración Prisma + docs/API |
| Rate limit + hardening | Pendiente | Límites por endpoint, k6, monitoreo (Sentry o similar), secrets vault. Ojo: `/member-imports/*` manda ráfagas de cientos de requests (1 por archivo); excluir o subir el tope |
| Chat + MCP como infra | C5 drawer | Burbuja Admin → `chat-api`. [16](../16-chat-mcp-diseno.md) · [17](../17-roadmap-chat-mcp.md) |
| Tope y costo OpenRouter | Prioridad cierre (P4) | Tope C7 + consumo para pricing. [18](../18-prioridades-cierre-mvp.md) · [17](../17-roadmap-chat-mcp.md) |
| Migración: DNI normalizado indexado | Pendiente (si hay gyms con decenas de miles de socios) | Hoy cada lote y cada `match` traen todos los `members.document` del tenant. Columna `document_normalized` + índice `(tenant_id, document_normalized)`. [Arquitectura §11b](../06-arquitectura.md) |
| Migración: altas masivas / worker | Pendiente (planillas de 10k+ filas) | Hoy 1 transacción por fila desde el navegador. `createMany` por lote o cola en servidor con progreso. [§11b](../06-arquitectura.md) |
| Migración: cupo de carpeta atómico | Pendiente (baja prioridad) | `assertItemQuota` es count + insert; la web lo respeta, un cliente directo en paralelo podría pasarse. [§11b](../06-arquitectura.md) |
| R2: limpieza de huérfanos | Pendiente (baja prioridad) | Upload antes que DB; si la API cae entre ambos queda el objeto. Job que compare prefijos contra la DB |
| Handoff de impersonación entre subdominios | Hecho · cookie un uso | `POST /auth/from-handoff`. QA web con HTTPS. [Arquitectura §5](../06-arquitectura.md) |

Deploy staging/prod y CI: [operaciones.md](./operaciones.md).

[Índice post-MVP](../99-backlog-post-mvp.md)
