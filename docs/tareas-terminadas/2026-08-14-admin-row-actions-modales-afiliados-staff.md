# Acciones icono y modales Ficha/Cuenta + Roles/Credencial

**Fecha:** 2026-08-14
**Roadmap:** E10 — UX Admin (grillas + modales)
**Commit:** `65ac0c9` — feat(web): acciones icono y modales Ficha/Cuenta y Roles/Credencial
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/65ac0c9

## Resumen

`RowActions` unifica iconos en grillas Admin. Afiliados abren Ficha y Estado de cuenta en modal comfortable; staff abre Roles asignados y Credencial de acceso. Paneles reutilizables; páginas detalle thin.

## Cambios principales

- `RowActions` + `AdminModal` size `comfortable`
- `MemberFichaPanel` / `MemberAccountPanel`; queries `?ficha=` / `?cuenta=`
- `StaffRolesPanel` / `StaffCredentialPanel`; queries `?roles=` / `?credencial=`
- Iconos en servicios, roles, packs, sesiones, tenants, devoluciones, auditoría
- CSS: iconos sin contenedor de botón

## Decisiones

- Sin “Ver todo” (ojo) en afiliados: Ficha + Cuenta alcanzan
- Staff: dos iconos (engranaje / llave), no un solo link a ficha

## Validación

- `npx tsc --noEmit` OK (`web`)
- Prueba manual: modales afiliados/staff + iconos alineados

## Referencias

- CU-AFI (ficha / estado de cuenta), CU-ROL-004
- Commit: `65ac0c9` / https://github.com/LucianoMocchegiani/gym-bro/commit/65ac0c9
