# Auditoría de acciones críticas + perfiles afiliado/staff

**Fecha:** 2026-07-21  
**Roadmap:** E1 — Auditoría de acciones críticas; Perfiles separados afiliado vs staff  
**Commit:** `2629d79` — feat(api): add audit events for critical tenant actions  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/2629d79

## Resumen

Quedó `audit_events` append-only con permiso `audit.read`, listado Super/Staff y registro desde create/update tenant, create/update roles y assign staff roles. Se marcó como cumplida la separación de perfiles (ya existente en auth/tablas).

## Cambios principales

- Migración `20260721190000_audit_events`
- Módulo `audit/` (`AuditService`, GET Staff/Super)
- Hooks en tenants / roles / staff
- Permiso `audit.read` + sync Admin; Postman carpeta Audit

## Decisiones

- Lectura con `audit.read` (no `reports.read`)
- E1 escribe solo mutaciones ya existentes; dominio futuro reutiliza el servicio
- Perfiles: tilde de cierre (StaffUser/Member + logins separados)

## Validación

- migrate deploy + seed + lint/build
- Manual: mutación + `GET /api/audit-events` con Admin demo
- Push a `main`

## Referencias

- RN-ROL-008 / CU-ROL-007, RN-ROL-005 / CU-ROL-005
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/2629d79
