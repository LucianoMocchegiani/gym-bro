# MCP lectura amplia + ayuda (C6)

**Fecha:** 2026-09-07
**Roadmap:** C6 — chat/MCP (`docs/17-roadmap-chat-mcp.md`)
**Commit:** `1b6dc14` — feat(mcp): tools B/C/D de lectura y get_help
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/1b6dc14

## Resumen

Sidecar MCP con tools B/C/D de solo lectura: reportes (periodos BA), devoluciones, débitos, catálogo, roles, auditoría slim y `get_help`. El drawer muestra una línea por tool. Sin writes.

## Cambios principales

- `get_reports_summary`, `list_refund_requests`, `list_debit_mandates`, `list_services`, `list_packs`, `get_pack`, `list_roles`, `get_role`, `search_audit_events`, `get_help`.
- Artículos en `mcp/help/*.md` (10 topics).
- Smoke: 17 tools + reportes sin args (mes actual) + help packs.
- Labels en `web/lib/chat/tool-label.ts`.

## Decisiones

- Sin `period` ni `from`/`to` → mes calendario actual BA; “mes anterior” = `last_month`.
- Comparar períodos = dos llamadas. Sin `compare_reports`.
- Devoluciones slim: Nest no trae `memberName`/`amount` → `id`, `memberId`, `status`, `createdAt`.

## Validación

- `npm run typecheck` en `mcp/` y `npx tsc --noEmit` en `web/`.
- Smoke y drawer: OK del usuario (Admin seed + “mes anterior”).

## Referencias

- [16-chat-mcp-diseno.md](../16-chat-mcp-diseno.md) · [17-roadmap-chat-mcp.md](../17-roadmap-chat-mcp.md) · [mcp/README.md](../../mcp/README.md)
- Commit: `1b6dc14` / https://github.com/LucianoMocchegiani/gym-bro/commit/1b6dc14
