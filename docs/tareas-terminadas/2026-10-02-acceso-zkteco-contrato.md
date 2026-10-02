# Contrato de puerta por gym y acceso ZKTeco simulado

**Fecha:** 2026-10-02
**Roadmap:** P1 — Molinetes / hardware de puerta (`docs/18-prioridades-cierre-mvp.md`)
**Commit:** `7c91301` — feat(access): contrato de puerta y acceso ZKTeco simulado
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/7c91301

## Resumen

Cada gym elige su sistema de puerta: QR con la app (Kuatia, default) o acceso ZKTeco. Las reglas de ingreso de Faciliter (reserva, acceso libre, deuda, multi-ingreso, staff) son las mismas para cualquier sistema y cada intento guarda su canal. ZKTeco se prueba sin hardware: el puente manda eventos a la API, que resuelve el número del aparato por vínculo o DNI, decide y pide abrir (hoy solo se registra). En un gym ZKTeco no se emite nada a Kuatia.

## Cambios principales

- Prisma: enum `AccessProvider`, `tenant_settings.access_provider`, `access_attempts.channel` (pases manuales viejos → `manual`), tabla `access_identity_links` (número → socio **o** staff, único por gym).
- `AccessVerifyService.evaluateSubject`: entrada única para Kuatia OID4VP, ZKTeco y pase manual.
- `access-providers/`: puerto de emisión (Kuatia emite, ZKTeco no-op; packs y contratos lo usan) y puerto de apertura (`LogDoorActuatorAdapter`).
- `POST /access/zkteco/events` (idempotente por serie + número + hora), `GET /access/door`, CRUD de vínculos en socios y staff (auditado). QR OID4VP y offers manuales → 409 en gym ZKTeco.
- Web: selector Puerta en Config, "Acceso ZKTeco" en Afiliados/Staff, `/puerta` sin QR con últimos ingresos en gym ZKTeco, columna Canal en el historial.
- `AuditModule` con `forwardRef(AuthModule)` (import circular que no dejaba arrancar la API).

## Decisiones

- Un sistema por gym; el diseño admite varios (gym pass necesitará Kuatia en todos).
- Vínculos en tabla propia, no en la ficha; respaldo por `members.document`. El staff necesita vínculo.
- El puente se autentica como staff con `access.verify`; token de dispositivo, relé real, huella y QR para ZKTeco en la app quedan en backlog.
- "Acceso ZKTeco" en lugar de "molinete": el aparato puede ser molinete, puerta o lector.
- `kuatia/` sigue como módulo aparte (emisión, bandeja de la app, gym pass). Reordenar adapters en `access-providers/kuatia|zkteco` quedó en backlog.

## Validación

- `tsc` y eslint en `api` y `web`.
- Prueba de punta a punta contra API temporal + base local (`local/e2e-zkteco.ps1`, 24/24): provider por gym, 409 en Kuatia/ZKTeco cruzados, evento por DNI con mismas reglas y canal `zkteco`, duplicado sin abrir, `sin_vinculo`, vínculos staff/socio, 409 por número repetido, apertura simulada solo en permitidos, restauración a Kuatia.
- Prueba manual de la web a cargo del usuario (`local/en-testeo/probar-zkteco.md`). Deploy: `prisma migrate deploy` (`20261002180000_access_provider_zkteco`).

## Diagrama

```text
Kuatia OID4VP ─┐                                  ┌─ access_attempts (+ channel)
ZKTeco evento ─┼─► socio | staff ─► evaluateSubject ┤
Pase manual ───┘                                  └─ allow + ZKTeco → DoorActuatorPort.open
```

## Referencias

- [04-reglas-de-negocio.md](../04-reglas-de-negocio.md) (RN-ACC-010/011) · [acceso-qr.md](../05-casos-de-uso/acceso-qr.md) (CU-ACC-006/008/009) · [06-arquitectura.md](../06-arquitectura.md) §6.5 · [09-esquema-db.md](../09-esquema-db.md) · [08-casos-prueba-manuales.md](../08-casos-prueba-manuales.md) (X14–X20) · [19-puerta-molinete-hw-sw.md](../19-puerta-molinete-hw-sw.md)
- Commit: `7c91301`
