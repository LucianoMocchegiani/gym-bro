# Backlog — Admin

**Índice:** [99-backlog-post-mvp.md](../99-backlog-post-mvp.md)

| Ítem | Estado | Notas |
|------|--------|--------|
| Multi-sede en UX Admin | Pendiente | Filtro sede en sesiones, afiliados, reportes. Modelo S2 ya existe. Ver también [sesiones-packs.md](./sesiones-packs.md) |
| Asistente chat (MCP) | C7 casi cerrado | Falta tope de uso (P4). [17](../17-roadmap-chat-mcp.md) · [18](../18-prioridades-cierre-mvp.md) |
| Asistente: ver capturas de la guía | Pendiente | Hoy `get_help` topic `guia` es solo texto. Falta pasar las PNG de `/docs` al modelo (visión) para describir la pantalla. Distinto de actualizar el texto: `local/mis-tickets/ticket-guia-landing-mcp.md`. |
| Asistente: MCP de escritura (con confirmación) | Hecho (C8) | Crear/editar por propuesta + botón (RN-ASI, [16 §15](../16-chat-mcp-diseno.md)). Sigue fuera por seguridad: caja, devoluciones, débito, puerta, config, borrar/cancelar, uploads. |
| Tickets de reclamo (IA, estilo ML / MP) | Pendiente | Post-MVP. Hilo de reclamo (cobro, acceso, pack, etc.) que **la IA lleva** (clasifica, pide datos, propone cierre) y escala a staff/Faciliter si no cierra. Referencia: reclamos Mercado Libre / Mercado Pago. Hoy el contacto es mail vía `get_help` topic `soporte`. Afiliado abre desde la app: [app-afiliado.md](./app-afiliado.md). Sin CU ni diseño todavía. |
| Vencimientos (cola recepción) | Hecho | Nav **Operación** (`/vencimientos`). `GET /expirations` (`members.read`). Lista `endsAt` MONTHLY + mandato + tolerancia. Avisos = E8 (en código). Wireframe §7. |

Rutinas plantilla: [backlog](../99-backlog-post-mvp/rutinas.md). Bandeja admin de avisos operativos: [roadmap E8](../11-roadmap-mvp.md).

[Índice post-MVP](../99-backlog-post-mvp.md)
