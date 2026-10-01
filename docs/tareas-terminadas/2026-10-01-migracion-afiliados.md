# Migración de afiliados (planilla + zip) y contraseña temporal

**Fecha:** 2026-10-01
**Roadmap:** P5 — Migración ([18](../18-prioridades-cierre-mvp.md))
**Commit:** `a1eca02` — feat(members): migración de afiliados (planilla + zip) y contraseña temporal
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/a1eca02ae92e7879f18dec519e769079e5c891b2

## Resumen

Admin → Afiliados → **Importar** trae socios de otro sistema: planilla xlsx/csv (ficha) y zip con fotos de perfil y carpeta por DNI o mail. El navegador parsea y manda lotes de 200; re-subir es idempotente. Altas nuevas con `ChangeMe123!` marcada temporal; crear/cambiar contraseña en app y web. El asistente explica el flujo (topic `migracion`). Guía de prueba local: `local/en-testeo/probar-migracion-afiliados.md` (no versionada).

## Cambios principales

- Prisma: `member_imports`, `identities.password_temporary`, permiso peligroso `members.import`
- API `/member-imports`: preview, start, rows, match, photo, folder, finish (una auditoría `member.import`)
- Auth: `GET /auth/password`, `POST /auth/set-password`; change-password para Staff/Member/Identity revoca sesiones; Google/Apple borra la temporal
- Web: pantalla Importar (mapeo heurístico guardado por gym, vista previa, CONFIRMAR, CSV de resultados); Cuenta con crear/cambiar contraseña
- Mobile: Ajustes → cambiar/crear contraseña + aviso de temporal
- MCP/chat-api: artículo `migracion`, link a Importar con ambos permisos

## Decisiones

- Sin mail → omitida; socio existente (mail, DNI normalizado o cuenta) → omitido sin pisar.
- Zip: socio con foto o carpeta → no se le carga nada.
- Cuenta existente en otro gym: su contraseña no se toca. Sin reinicio desde staff.
- Sin job en servidor: la pestaña queda abierta; reintento por lote.

## Validación

- `tsc` + eslint en api, web, mcp y chat-api; `dart analyze`
- Guía manual con archivos de ejemplo en `local/en-testeo/migracion-ejemplo/` (socios.csv, archivos.zip)

## Referencias

- RN-MIG-001..005 ([04](../04-reglas-de-negocio.md) §6c) · [09](../09-esquema-db.md) §4.9d
- Commit: `a1eca02` / https://github.com/LucianoMocchegiani/gym-bro/commit/a1eca02ae92e7879f18dec519e769079e5c891b2
