# Estado de cuenta staff y afiliado

**Fecha:** 2026-07-25  
**Roadmap:** E2 — Estado de cuenta (staff) + Estado de cuenta (afiliado)  
**Commit:** `b34c0c4` — feat(api): add member account status for staff and affiliate  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/b34c0c4

## Resumen

Quedó lectura de estado de cuenta: ficha, contratos (ACTIVE primero), pagos recientes, summary de acceso/créditos. Deuda placeholder `AL_DIA` y `reservations: []` hasta E5/E4.

## Cambios principales

- `GET /api/members/:memberId/account` + Super mirror
- `GET /api/me/account` (Member)
- Query opcional `?status=` sobre contratos
- Postman Members: Staff/Member account

## Decisiones

- Staff + afiliado en la misma entrega
- Placeholders deuda/reservas para no romper clientes después
- Summary siempre sobre contratos ACTIVE (aunque se filtre el listado)

## Validación

- lint/build OK
- Prueba manual Postman / Docker

## Referencias

- CU-AFI-004, CU-AFI-005
- Commit: https://github.com/LucianoMocchegiani/gym-bro/commit/b34c0c4
