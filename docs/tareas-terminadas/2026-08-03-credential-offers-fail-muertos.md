# Offer OID4VCI FAILED desde wallet (muerto/vencido)

**Fecha:** 2026-08-03  
**Roadmap:** Quark paso 3b — cierre bandeja offers muertos  
**Commit:** `7cbaa70` — feat(mobile,api): mark dead OID4VCI offers as FAILED  
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/7cbaa70

## Resumen

Si el afiliado acepta un offer y el issuer responde vencido/inválido (p. ej. tras restart), la app marca `FAILED` vía `POST /me/credential-offers/:id/fail`. Sale de la bandeja; se conserva `offerUri` y `lastError` para staff. Timeout/red no marcan `FAILED`.

## Cambios principales

- API `markFailedByMember` + DTO `reason` opcional
- Flutter: detección de error inválido → fail + reload bandeja
- Postman fail + docs 06/09/11/12 / mobile README

## Decisiones

- Solo 404 / not found / expired / invalid → `FAILED`
- Conservar `offerUri` (auditoría); `lastError` solo staff

## Validación

- Accept offer muerto → snackbar + sale de bandeja; staff ve `FAILED` + `lastError`
- Postman request fail

## Referencias

- [12-acceso-quark-oid4-diseno.md](../12-acceso-quark-oid4-diseno.md)
- Commit: `7cbaa70` / https://github.com/LucianoMocchegiani/gym-bro/commit/7cbaa70
