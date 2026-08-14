# Credencial SSI staff para molinete

**Fecha:** 2026-08-14
**Roadmap:** E6/E10 — VC acceso staff (sin fichaje)
**Commit:** `65ae82c` — feat(api,web): credencial SSI staff para molinete
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/65ae82c

## Resumen

Staff puede recibir offer OID4VCI de acceso (`staff_{tenantId}`). La misma puerta OID4VP acepta pack afiliado o VC staff; allow `ok_staff` si el usuario está activo. Roles no van en la VC. Fichaje y wallet Flutter staff quedan en backlog.

## Cambios principales

- `staff_credential_offers` + `access_attempts.subject_staff_id`
- `POST/GET /staff/:id/credential-offers`; UI ficha staff
- DCQL credential_sets pack|staff; evaluate staff
- Docs 09/11/12/99 + Postman + pruebas X11/X12

## Decisiones

- Solo molinete (sin fichaje)
- Claims: staffId + nombre + tenantId
- Emisión Admin (URI); wallet staff diferida

## Validación

- `prisma generate` + `tsc` api/web
- Migración deploy en Compose; regenerar client en volumen Docker

## Referencias

- Commit: `65ae82c` / https://github.com/LucianoMocchegiani/gym-bro/commit/65ae82c
