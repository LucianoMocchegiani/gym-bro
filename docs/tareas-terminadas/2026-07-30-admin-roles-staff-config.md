# Admin web — roles, staff y config gym

**Fecha:** 2026-07-30  
**Roadmap:** E10 — Roles y config gym  
**Commit:** `61f396a` — feat(web,api): add roles, staff and gym config admin UI  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/61f396a

## Resumen

UI Admin de roles, staff y configuración operativa (incl. Mercado Pago). Se cerró el hueco de API con `GET|POST /staff` (y equivalentes Super). Nav: Roles | Staff | Config.

## Cambios principales

- API: listado y alta de staff; auditoría `staff.create`
- Web: `/roles`, `/staff`, `/config`
- Postman: requests staff + variable `createdStaffId`

## Decisiones

- Checklist de permisos en front (espejo del catálogo API)
- Staff en navbar (no como acción suelta en Roles)

## Validación

- `npm run build` en `web/`; `nest build` en `api/`
- Manual: roles/staff/config en Admin; reinicio API para mapear rutas nuevas

## Referencias

- CU-ROL-003/004 · `web/README.md` · `docs/11-roadmap-mvp.md` · `postman/`
- Commit: `61f396a` / https://github.com/LucianoMocchegiani/gym-bro/commit/61f396a
