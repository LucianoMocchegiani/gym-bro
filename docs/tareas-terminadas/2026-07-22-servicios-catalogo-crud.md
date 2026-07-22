# CRUD servicios ACCESO_LIBRE y POR_SESIONES

**Fecha:** 2026-07-22  
**Roadmap:** E3 — CRUD servicio `ACCESO_LIBRE`; CRUD servicio `POR_SESIONES`  
**Commit:** `84033c6` — feat(api): add catalog services CRUD for gym tenants  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/84033c6

## Resumen

Quedó el catálogo de servicios por tenant: create/list/get/update con tipos `ACCESO_LIBRE` y `POR_SESIONES`, baja lógica (`active`), permiso `catalog.write`, rutas Super/Staff, auditoría y carpeta Postman Services. Packs quedan para la siguiente tanda.

## Cambios principales

- Migración `20260722140000_services` + enum `ServiceType`
- Módulo `services/`
- Docs esquema/roadmap/README + Postman

## Decisiones

- `type` inmutable tras el alta
- Lectura y mutación con `catalog.write` en MVP
- Sin packs/componentes en esta entrega

## Validación

- migrate deploy + lint/build
- Manual vía Postman Services
- Push a `main`

## Referencias

- CU-SER-001, RN-SER-001..003
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/84033c6
