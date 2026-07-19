# Sucursal seed (S2, 1 visible)

**Fecha:** 2026-07-19  
**Roadmap:** E1 — Sucursal seed (S2, 1 visible)  
**Commit:** `c03ecb8` — feat(api): seed default branch when creating a tenant  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/c03ecb8

## Resumen

Quedó el modelo `Branch` (`branches`) y el seed de **Sede principal** (`isDefault`) al crear un tenant vía `POST /api/tenants`. Las respuestas Super incluyen `defaultBranch`. Sin CRUD de sucursales ni backfill del tenant demo.

## Cambios principales

- Prisma `Branch` + migración `20260719180000_branches`
- Create tenant en transacción con branch default
- Sync `docs/09-esquema-db.md`, Postman, roadmap

## Decisiones

- Campos: `name`, `active`, `isDefault`
- Seed solo en create (no en `prisma:seed` demo)
- Sin CRUD multi-sede

## Validación

- `migrate deploy` + `prisma generate` en contenedor
- POST create → `defaultBranch` con nombre `Sede principal`
- Health OK tras regenerar client
- Commit y push a `main`

## Referencias

- RN-TEN-003 / S2, CU-ROL-001 (sucursal inicial)
- [Esquema DB](../09-esquema-db.md)
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/c03ecb8
