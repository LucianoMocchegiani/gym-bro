# Admin web — dashboard mínimo

**Fecha:** 2026-07-30  
**Roadmap:** E10 — Dashboard mínimo  
**Commit:** `48c7a20` — feat(web): add admin minimum dashboard home  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/48c7a20

## Resumen

Home Admin en `/`: KPIs del día (caja, activos, puerta ALLOWED, sesiones) y atajos a módulos. Login y logo apuntan a Inicio. Deuda agregada queda para E11.

## Cambios principales

- `/` dashboard + nav Inicio
- Redirect post-login a `/`
- `listAccessAttempts` admite filtro `result`

## Validación

- `npm run lint` + `npm run build` en `web/`

## Referencias

- Wireframe §7 · `docs/11-roadmap-mvp.md` · `web/README.md`
- Commit: `48c7a20` / https://github.com/LucianoMocchegiani/gym-bro/commit/48c7a20
