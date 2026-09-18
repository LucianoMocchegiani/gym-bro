# Sidebar sin cartel de soporte; contacto vía MCP

**Fecha:** 2026-09-18
**Roadmap:** chat / MCP help
**Commit:** `dbfd3d7` — feat(chat): drop sidebar support card; MCP passes contact
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/dbfd3d7

## Resumen

Se quitó el cartel de Soporte del sidebar Admin. El mail de contacto queda en `get_help` topic `soporte` para que el chat lo pase si preguntan por un problema.

## Cambios principales

- Admin: sin bloque `.app-sidebar-support` ni `NavIconSupport`
- MCP: artículo `mcp/help/soporte.md` y topic en `get_help`
- Prompts staff/público apuntan a ese topic

## Decisiones

- Un solo mail: `faciliterapps@gmail.com`

## Validación

- Diff: sidebar cierra en nav; `TOPICS` incluye `soporte`

## Referencias

- `mcp/help/soporte.md`, `mcp/src/tools/help.ts`
- Commit: `dbfd3d7` / https://github.com/LucianoMocchegiani/gym-bro/commit/dbfd3d7
