# Listados Admin unificados (AdminList)

**Fecha:** 2026-08-14
**Roadmap:** UX Admin — Listados unificados
**Commit:** `28d8658` — feat(web): unificar listados Admin con AdminList
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/28d8658

## Resumen

Se extrajo `ListToolbar`, `DataTable` y paginación a `web/components/AdminList.tsx` y se migraron los catálogos principales (afiliados, staff, servicios, packs, roles, sesiones, auditoría, Super tenants) a ese idioma de grilla. En sesiones quedó una sola toolbar (vista + estado).

## Cambios principales

- Componente compartido `AdminList`
- Migración de 8 listados Admin/Super
- Toolbar única en Sesiones (Sesiones/Recurrencias + filtro estado)
- Roadmap: ítem de listados unificados marcado

## Validación

- `npx tsc --noEmit` en `web` OK
- Revisión manual de toolbar única en sesiones

## Referencias

- `web/components/AdminList.tsx`
- Commit: `28d8658` / https://github.com/LucianoMocchegiani/gym-bro/commit/28d8658
