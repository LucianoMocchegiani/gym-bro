# Skeletons shimmer integrados en estados de carga async

**Fecha:** 2026-08-18
**Roadmap:** Post-roadmap (faltaGeneral — tarea #3 del orden de trabajo)
**Commit:** `066195d` — feat(web): skeletons shimmer integrados en estados de carga async
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/066195d

## Resumen

Todos los estados de carga de la web Admin pasaron de texto "Cargando…" a skeletons shimmer con la forma del contenido real. Primitiva `Skeleton` con variantes (tabla, form, panel, cards, página) integradas por defecto en componentes async: `DataTable` (todas las grillas), forms/paneles de edición, Caja, Reportes, Devoluciones, Config, Super y KPIs del Inicio.

## Cambios principales

- Nuevo `web/components/Skeleton.tsx`: `Skeleton` + `SkeletonTable`, `SkeletonForm`, `SkeletonPanel`, `SkeletonCards`, `PageSkeleton`.
- Nuevo `web/components/DashboardKpis.tsx`: KPIs del Inicio extraídos a componente con skeleton integrado.
- `DataTable` muestra `SkeletonTable` cuando `loading` (grillas Admin y Super).
- Skeletons en loading de: pack, rol, servicio, sesión (datos), roster, waitlist, ficha/cuenta afiliado, roles/credencial staff, config, super tenant, lista de intentos de Puerta.
- Caja y Reportes: skeleton de stat-cards + panel.
- Suspense fallbacks de 9 páginas → `PageSkeleton`.
- CSS: `.skeleton` con shimmer (var `--skeleton-shimmer` por tema).

## Decisiones

- Shimmer animado (no bloques estáticos).
- Integración automática: el componente async ya muestra skeleton cuando `loading` (sin props nuevas).
- KPIs del Inicio pasan a componente (`DashboardKpis`) como pedía el detalle.

## Validación

- `npm run lint`: sin errores nuevos (11 pre-existentes).
- `npm run build` OK.
- Prueba manual con red lenta en grillas, caja, reportes, modales e Inicio.

## Referencias

- Tarea #3 de `local/tareas flatantes/orden-de-trabajo.md` (`faltaGeneral.md`)
- Commit: `066195d` / https://github.com/LucianoMocchegiani/gym-bro/commit/066195d