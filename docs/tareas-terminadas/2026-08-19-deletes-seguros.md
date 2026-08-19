# Deletes seguros con reglas de integridad (API + web + Postman)

**Fecha:** 2026-08-19
**Roadmap:** Post-roadmap
**Commit:** `7654aea` — feat(api)(web): deletes seguros con reglas de integridad y postman sync
**Remote:** https://github.com/LucianoMocchegiani/gym-bro/commit/7654aea

## Resumen

Baja/baja/eliminación segura de packs, servicios, sesiones, afiliados, roles, staff y tenants, con reglas de integridad: borrado físico solo cuando no hay referencias o historial; si lo hay, se bloquea con mensaje (recomendando la baja/desactivación existente) o se aplica la política elegida (pack con contratos → baja automática; tenant → confirmación ELIMINAR + slug; roles de sistema → 403).

## Decisiones (cuestionario aprobado)

- **Híbrido**: hard delete si no hay referencias/historial; bloqueo + recomendación de usar la baja/estado existente cuando las hay.
- **Pack con contrataciones**: doble confirmación; al confirmar queda dado de baja (`active=false`, "dejará de funcionar el mes siguiente") + sync Kuatia.
- **Afiliado/Staff con historial**: bloquear y recomendar dar de baja/desactivar; sin historial → borrado físico.
- **Tenant** (super): confirmación fuerte escribiendo `ELIMINAR` + el slug.
- **Roles**: de sistema (admin/profesor, `isSystem`) nunca se eliminan (403 `ROLE_IS_SYSTEM`); custom se eliminan aunque estén asignados a staff.
- **Sesión**: cualquier reserva (aun cancelada) bloquea el borrado.

## Cambios principales

- **API** (`remove()` + `DELETE` en controllers staff/super de cada módulo):
  - Packs: `PACK_HAS_CONTRACTS` (409) con `?confirm=deactivate` → baja automática + audit `packDeactivate`/`packDelete`.
  - Servicios: `SERVICE_IN_USE` (409) por packComponents/sessions/recurrenceRules/creditBalances.
  - Sesiones: `SESSION_HAS_RESERVATIONS` (409).
  - Afiliados: `MEMBER_HAS_HISTORY` (409) por payments/contracts/reservations/waitlist/refunds/receipts/access/credentialOffers/cashMovements/accessAttempts; ruta `members/:memberId` con `members.deactivate`.
  - Roles: 403 `ROLE_IS_SYSTEM`; custom se borran aunque estén asignados.
  - Staff: `STAFF_HAS_ACTIVITY` (409).
  - Tenants: `DeleteTenantDto` (`confirmWord`, `slug`); delete físico en cascada + audit `tenantDelete`.
  - `audit.types.ts`: nuevas AUDIT_ACTIONS de delete.
  - Lint: `npx eslint src --ext .ts --fix` (solo formato en kuaatia-staff-offer, me-permissions, roles.module).
- **Web**:
  - `web/lib/api/*`: funciones `deletePack(packId, confirm?)`, `deleteService`, `deleteSession`, `deleteMember`, `deleteRole`, `deleteStaff`, `deleteTenant`.
  - `DeleteRowButton.tsx` (nuevo): botón 🗑 + `ConfirmDialog` con `confirmWord=ELIMINAR`.
  - `ConfirmDialog.tsx`: soporte `confirmWord2` (slug en tenant).
  - Grillas (packs, servicios, sesiones, afiliados, roles, staff) y `TenantEditPanel` (tenant): botón eliminar + manejo de 409/403 con mensaje; flujo doble confirmación del pack.
  - `.err-msg` en globals.css.
- **Postman**: sync de endpoints DELETE (packs ×2, servicios, sesiones, afiliados, roles, staff, tenant) + variable `createdTenantSlug`.

## Validación

- API: `npm run build` OK; `npm run lint` OK.
- Web: `npm run build` OK; `npm run lint` = baseline 13 (11 errores + 2 warnings preexistentes, sin nuevos).
- Postman: JSON parseado OK (`ConvertFrom-Json`).

## Referencias

- Commit: `7654aea` / https://github.com/LucianoMocchegiani/gym-bro/commit/7654aea