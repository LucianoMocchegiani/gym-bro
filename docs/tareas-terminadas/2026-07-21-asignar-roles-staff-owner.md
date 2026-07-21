# Asignar roles a staff + owner al crear tenant

**Fecha:** 2026-07-21  
**Roadmap:** E1 — Asignar roles a staff (multi-rol)  
**Commit:** `93d1239` — feat(api): assign staff roles and create tenant owner  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/93d1239

## Resumen

Quedó la relación N:N `staff_user_roles`, endpoints Super/Staff para reemplazar roles (`PUT .../roles`), y el `POST /tenants` con owner (email/password) que nace como staff Admin del gym. Seed demo asigna Admin a `admin@demo.gym`. También `docs/credenciales-demo.md`.

## Cambios principales

- Migración `20260721150000_staff_user_roles`
- Módulo `staff/` (GET staff + PUT roles)
- Create tenant exige `ownerEmail` / `ownerPassword`
- Seed completo: branch, roles, staff↔Admin

## Decisiones

- Owner se crea junto al tenant (no identidad global previa)
- PUT reemplaza el set completo de `roleIds`
- Sin filtro fino `staff.write` aún

## Validación

- Lint/build + `prisma generate`
- Commit y push a `main`

## Referencias

- CU-ROL-001 / CU-ROL-004, RN-ROL-004
- [Credenciales demo](../credenciales-demo.md)
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/93d1239
