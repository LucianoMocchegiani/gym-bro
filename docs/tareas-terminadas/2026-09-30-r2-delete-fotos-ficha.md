# Borrar en R2 fotos de ficha al cambiar o quitar

**Fecha:** 2026-09-30
**Roadmap:** E2 / catálogo (fotos públicas)
**Commit:** `becb633` — feat(upload): borrar en R2 la foto anterior al cambiar o quitar ficha
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/becb63338534650577781c9853e1991bc429672b

## Resumen

Al quitar, reemplazar o borrar en físico socio, staff, servicio o pack, se elimina el objeto R2 de la URL anterior (`UploadService.deleteFile`). Los FILE de carpeta ya borraban R2 al eliminar el ítem.

## Cambios principales

- `replaceOwnedPublicImage` con chequeo de tenant y keys legacy
- Members, staff, services y packs llaman el helper tras update/delete
- Docs de arquitectura, R2 y prueba F6

## Decisiones

- No hay `DELETE /upload`; el delete va enganchado al CRUD
- Fallo de R2: log, no se revierte la DB

## Validación

- `nest build` en `api`
- Prueba de URL vieja 404 a cargo del usuario

## Referencias

- `docs/infraestructura/r2-cloudflare.md` · `docs/06-arquitectura.md` · F6 en `docs/08-casos-prueba-manuales.md`
- Commit: `becb633` / https://github.com/LucianoMocchegiani/gym-bro/commit/becb63338534650577781c9853e1991bc429672b
