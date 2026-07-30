# Admin web — afiliados + UI unificada

**Fecha:** 2026-07-30  
**Roadmap:** E10 — Afiliados (+ shell compartido con puerta)  
**Commit:** `7244c67` — feat(web): add admin members module and unify door UI  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/7244c67

## Resumen

Módulo Admin de afiliados (listado, alta, ficha, status y estado de cuenta) y unificación visual con puerta: mismo shell, paneles y grillas. Sesión Staff estable vía snapshot cacheado en `useSyncExternalStore`.

## Cambios principales

- Rutas `/afiliados`, `/afiliados/nuevo`, `/afiliados/[id]`
- `AdminShell` + `Panel` / `AdminGrid`; puerta reusa el mismo layout
- Cliente API members + labels de status
- Fix loop de sesión (`getSnapshot` cacheado)

## Validación

- `npm run lint` + `npm run build` en `web/`
- Prueba manual: login → afiliados CRUD/status/cuenta; puerta coherente en UI

## Referencias

- CU-AFI-001..005 · `web/README.md` · `docs/11-roadmap-mvp.md`
- Commit: `7244c67` / https://github.com/LucianoMocchegiani/gym-bro/commit/7244c67
