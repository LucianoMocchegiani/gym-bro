import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { PermissionGuard } from '../guards/permission.guard';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Exige permisos de producto en el staff autenticado (unión de roles).
 *
 * @remarks Combinar con `@RequireTenantAuth()` en el controller.
 * Permisos `dangerous` se otorgan solo si el rol los tiene asignados (RN-ROL-007).
 * @example `@RequirePermission('roles.write')`
 */
export function RequirePermission(...codes: string[]) {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, codes),
    UseGuards(PermissionGuard),
  );
}
