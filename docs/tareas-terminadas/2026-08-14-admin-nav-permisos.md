# Nav e Inicio gated por permisos

**Fecha:** 2026-08-14  
**Roadmap:** E10 — Nav / páginas gated por permiso  
**Commit:** `69c015a` — feat(api,web): nav e Inicio gated por permisos del staff  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/69c015a

## Resumen

Staff solo ve en nav/atajos/KPIs de Inicio lo que permiten sus roles. `GET /me/permissions` alimenta la sesión; la API sigue siendo la autoridad (403).

## Cambios principales

- `GET /me/permissions` + Postman
- `nav-permissions` + filtro AdminShell / atajos / KPIs Inicio
- Cache `permissionCodes` en sesión Staff

## Decisiones

- Sin pantalla “Sin permiso” en client
- Puerta: `access.verify` o `access.manual_pass`; KPI puerta solo con `access.verify`

## Validación

- `tsc` API/web OK; prueba manual con rol restringido

## Referencias

- RN-ROL-007
- Commit: `69c015a` / https://github.com/LucianoMocchegiani/gym-bro/commit/69c015a
