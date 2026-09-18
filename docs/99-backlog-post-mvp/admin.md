# Backlog — Admin

**Índice:** [99-backlog-post-mvp.md](../99-backlog-post-mvp.md)

| Ítem | Estado | Notas |
|------|--------|--------|
| Multi-sede en UX Admin | Pendiente | Filtro sede en sesiones, afiliados, reportes. Modelo S2 ya existe. Ver también [sesiones-packs.md](./sesiones-packs.md) |
| Asistente chat (MCP) | C7 casi cerrado | Falta tope de uso (P4). [17](../17-roadmap-chat-mcp.md) · [18](../18-prioridades-cierre-mvp.md) |
| Asistente: ver capturas de la guía | Pendiente | Hoy `get_help` topic `guia` es solo texto. Falta pasar las PNG de `/docs` al modelo (visión) para describir la pantalla. |
| Tickets de reclamo (IA, estilo ML / MP) | Pendiente | Post-MVP. Hilo de reclamo (cobro, acceso, pack, etc.) que **la IA lleva** (clasifica, pide datos, propone cierre) y escala a staff/Faciliter si no cierra. Referencia: reclamos Mercado Libre / Mercado Pago. Hoy el contacto es mail vía `get_help` topic `soporte`. Afiliado abre desde la app: [app-afiliado.md](./app-afiliado.md). Sin CU ni diseño todavía. |
| Vencimientos (cola recepción) | Corte 1 en código | Nav **Operación** (`/vencimientos`). `GET /expirations` (`members.read`). No es entidad nueva ni reporte: lista sobre `endsAt` MONTHLY + mandato débito + tolerancia. Filtros: 7 días / en tolerancia / débito / a mano. Acciones: ficha, Caja, Débitos. Recordatorio WhatsApp/mail y job E2/E3 = [E8](../11-roadmap-mvp.md). Wireframe §7. |

Rutinas y plantillas de notificación Admin: [roadmap E7/E8](../11-roadmap-mvp.md).

[Índice post-MVP](../99-backlog-post-mvp.md)
