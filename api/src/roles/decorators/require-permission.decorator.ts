import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { PermissionGuard } from '../guards/permission.guard';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Exige permisos de producto en el staff autenticado (unión de roles).
 *
 * @remarks Combinar con `@RequireTenantAuth()` en el controller.
 * Permisos `dangerous` se otorgan solo si el rol los tiene asignados (RN-ROL-007).
 *
 * @warning ORDEN DE DECORADORES — `UseGuards` **agrega** al array y los
 * decorators se aplican de abajo hacia arriba. Este decorator ya aporta
 * `PermissionGuard`, así que en un handler/clase que también declare sus
 * auth guards, `@RequirePermission` debe ir **ARRIBA**:
 *
 * ```ts
 * @RequirePermission('platform.impersonate')   // arriba
 * @UseGuards(JwtAuthGuard, PlatformTenantGuard)  // abajo
 * ```
 *
 * Si se invierte, `PermissionGuard` corre antes que `JwtAuthGuard`, ve
 * `request.user === undefined` y responde 401 aunque el token sea válido.
 *
 * @example `@RequirePermission('roles.write')`
 */
export function RequirePermission(...codes: string[]) {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, codes),
    UseGuards(PermissionGuard),
  );
}
