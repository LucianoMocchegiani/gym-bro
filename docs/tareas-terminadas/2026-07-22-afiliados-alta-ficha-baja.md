# Alta / editar ficha / baja-suspensión de afiliados

**Fecha:** 2026-07-22  
**Roadmap:** E2 — Alta afiliado; Editar ficha; Baja / suspensión  
**Commit:** `16c5d6c` — feat(api): add member CRUD with status and ficha fields  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/16c5d6c

## Resumen

Quedó el módulo `members/` con list/get/create/update de ficha y cambio de status (`ACTIVE` / `SUSPENDED` / `INACTIVE`), permiso peligroso `members.deactivate`, auditoría y login de afiliado solo si está ACTIVE. Credencial SSI y estado de cuenta quedan pendientes.

## Cambios principales

- Migración `20260721200000_members_ficha_status` (`phone`, `document`, `branch_id`, `MemberStatus`)
- Staff `/api/members` y Super `/api/tenants/:tenantId/members`
- Auth member/refresh exige `ACTIVE`
- Postman carpeta Members

## Decisiones

- Password inicial la define el staff en el alta
- Baja/suspensión = flag `members.deactivate` (dangerous)
- Sin stub SSI en esta tanda

## Validación

- migrate deploy + seed + lint/build
- Manual: CRUD + suspend → login 401
- Push a `main`

## Referencias

- CU-AFI-001..003, RN-ROL-007/008
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/16c5d6c
