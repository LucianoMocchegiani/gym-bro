import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Resolución de permisos efectivos del staff (unión de todos sus roles).
 *
 * @remarks RN-ROL-007: un permiso con `dangerous=true` actúa como flag peligroso;
 * basta con que el rol lo tenga asignado explícitamente.
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Códigos de permiso del staff en un tenant (deduplicados).
   */
  async getPermissionCodes(
    staffUserId: string,
    tenantId: string,
  ): Promise<Set<string>> {
    const rows = await this.prisma.staffUserRole.findMany({
      where: {
        staffUserId,
        role: { tenantId },
      },
      select: {
        role: {
          select: {
            rolePermissions: {
              select: { permission: { select: { code: true } } },
            },
          },
        },
      },
    });

    const codes = new Set<string>();
    for (const row of rows) {
      for (const rp of row.role.rolePermissions) {
        codes.add(rp.permission.code);
      }
    }
    return codes;
  }

  /**
   * True si el staff tiene el código requerido.
   */
  async hasPermission(
    staffUserId: string,
    tenantId: string,
    code: string,
  ): Promise<boolean> {
    const codes = await this.getPermissionCodes(staffUserId, tenantId);
    return codes.has(code);
  }
}
