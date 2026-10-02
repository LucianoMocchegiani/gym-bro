# Importar números del aparato ZKTeco

**Fecha:** 2026-10-02
**Roadmap:** P5 — Migración (`docs/18-prioridades-cierre-mvp.md`) · P1 — Acceso ZKTeco
**Commit:** `f6b160d` — feat(member-import): importar numeros del aparato ZKTeco
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/f6b160d

## Resumen

En un gym con acceso ZKTeco, Afiliados → Importar suma el paso "3. Números del aparato ZKTeco": una planilla con DNI o mail del socio y el número que ya tiene en el aparato crea sus vínculos de acceso de forma masiva. Así los socios migrados entran con el mismo número que usaban, sin cargarlos uno por uno.

## Cambios principales

- Prisma: `MemberImportKind` + `ACCESS_CODES` (migración `20261002200000_member_import_access_codes`).
- API: `POST /member-imports/access-codes/preview` (no escribe) y `POST /member-imports/:id/access-codes` (lotes de 200, idempotente), con `MemberImportAccessCodesService`; 409 si el gym no usa ZKTeco. Finish y auditoría `member.import` reutilizados.
- Web: `AccessCodesImportPanel` (mapeo de columnas sugerido, revisión con contadores y CSV, confirmación, reintento por lote), visible solo en gym ZKTeco; tipo "Números de acceso" en Últimas importaciones.

## Decisiones

- Socio por DNI normalizado y, si no, por mail; tiene que estar importado antes. Solo afiliados (el staff se vincula desde su ficha).
- Ya vinculado al mismo socio → omitido; de otra persona, socio inexistente, número inválido o repetido en la planilla → error. Un socio puede tener varios números.

## Validación

- `tsc` y eslint en `api` y `web`.
- Prueba de punta a punta contra API temporal + base local (`local/e2e-import-numeros.ps1`, 21/21): 409 en gym Kuatia, revisión con cada motivo de error, revisión sin escritura, alta + cierre 2/0/5, re-subida omitida, corrida cerrada rechaza lotes, historial `ACCESS_CODES`, eventos ZKTeco resuelven al socio importado.
- Prueba manual de la web a cargo del usuario (`local/en-testeo/probar-importar-numeros-zkteco.md`). Deploy: `prisma migrate deploy`.

## Referencias

- [04-reglas-de-negocio.md](../04-reglas-de-negocio.md) (RN-MIG-006) · [06-arquitectura.md](../06-arquitectura.md) §11b · [09-esquema-db.md](../09-esquema-db.md) §4.9d · [08-casos-prueba-manuales.md](../08-casos-prueba-manuales.md) (A6–A10) · [Contrato ZKTeco](./2026-10-02-acceso-zkteco-contrato.md)
- Commit: `f6b160d`
