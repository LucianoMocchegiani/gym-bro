# Admin web — caja + cliente API por dominio

**Fecha:** 2026-07-30  
**Roadmap:** E10 — Caja y cobros  
**Commit:** `bb8d0d9` — feat(web): add cash register UI and split API client by domain  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/bb8d0d9

## Resumen

Pantalla Admin `/caja`: día de negocio, cobro CASH (pack o drop-in), movimientos y arqueo. El cliente HTTP de `web/lib/api` se reorganizó por módulos Nest, con tipos en cada archivo.

## Cambios principales

- `/caja` + nav Caja
- Cobro pack/drop-in CASH; arqueo único por día
- `lib/api/{auth,members,access,cash-register,contracts,packs,sessions,reservations}`
- Eliminado `types.ts` monolítico / `billing-cash`

## Validación

- `npm run lint` + `npm run build` en `web/`

## Referencias

- CU-PAG-002/003 · `web/README.md` · `docs/11-roadmap-mvp.md`
- Commit: `bb8d0d9` / https://github.com/LucianoMocchegiani/gym-bro/commit/bb8d0d9
