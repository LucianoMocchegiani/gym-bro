# Modales packs/sesiones + limpieza UX Admin

**Fecha:** 2026-08-14
**Roadmap:** E10 — UX Admin (packs / sesiones + cleanup)
**Commit:** `81b9514` — feat(web): modales packs/sesiones y limpieza UX Admin
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/81b9514

## Resumen

Packs: alta y editar en modal comfortable. Sesiones: Datos / Roster / Waitlist + alta (puntual/recurrente) en modal. Limpieza de exports muertos, prop `wide`, títulos duplicados (`embedded`) y editor de componentes de pack compartido.

## Cambios principales

- `PackCreateForm`, `PackEditPanel`, `PackComponentsEditor`
- `SessionCreateForm`, `SessionDatosPanel`, `SessionRosterPanel`, `SessionWaitlistPanel`
- Redirects `/packs/nuevo`, `/sesiones/nuevo`
- Cleanup: `memberStatusLabel`, `AdminModal.wide`, clases fantasma, `embedded`

## Decisiones

- Pack: un solo modal editar (datos + componentes + Kuatia)
- Sesión: tres iconos + ampliar cupo dentro de Datos
- Altas también en modal

## Validación

- `npx tsc --noEmit` OK (`web`)

## Referencias

- CU-SER-002/003/004, CU-RES-004
- Commit: `81b9514` / https://github.com/LucianoMocchegiani/gym-bro/commit/81b9514
