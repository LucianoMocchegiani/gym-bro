import { Injectable } from '@nestjs/common';
import { Permission, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PERMISSION_CATALOG,
  PROFESOR_PERMISSION_CODES,
  SYSTEM_ROLE_SLUGS,
} from './permission-catalog';

type Tx = Prisma.TransactionClient;

export type SeededRoleSummary = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  permissionCodes: string[];
};

/**
 * Asegura el catálogo global de permisos y siembra roles sistema por tenant.
 *
 * @remarks RN-ROL-002 / CU-ROL-001. No asigna roles a StaffUser (tarea posterior).
 */
@Injectable()
export class RolesSeedService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert idempotente de todos los permisos del catálogo de producto.
   */
  async ensurePermissionCatalog(
    tx: Tx | PrismaService = this.prisma,
  ): Promise<Permission[]> {
    const permissions: Permission[] = [];
    for (const def of PERMISSION_CATALOG) {
      const permission = await tx.permission.upsert({
        where: { code: def.code },
        create: {
          code: def.code,
          description: def.description,
          dangerous: def.dangerous,
        },
        update: {
          description: def.description,
          dangerous: def.dangerous,
        },
      });
      permissions.push(permission);
    }
    return permissions;
  }

  /**
   * Crea roles Admin y Profesor del tenant con sus permisos.
   *
   * @param tx - Cliente de la transacción del create tenant.
   * @param tenantId - Gym recién creado.
   * @param permissions - Filas del catálogo (ya upsertadas).
   */
  async seedSystemRolesForTenant(
    tx: Tx,
    tenantId: string,
    permissions: Permission[],
  ): Promise<SeededRoleSummary[]> {
    const byCode = new Map(permissions.map((p) => [p.code, p]));

    const admin = await this.createSystemRole(
      tx,
      tenantId,
      'Admin',
      SYSTEM_ROLE_SLUGS.admin,
      permissions.map((p) => p.id),
    );

    const profesorPermissionIds = PROFESOR_PERMISSION_CODES.map((code) => {
      const permission = byCode.get(code);
      if (!permission) {
        throw new Error(`Missing permission in catalog: ${code}`);
      }
      return permission.id;
    });

    const profesor = await this.createSystemRole(
      tx,
      tenantId,
      'Profesor',
      SYSTEM_ROLE_SLUGS.profesor,
      profesorPermissionIds,
    );

    return [
      this.toSummary(
        admin,
        permissions.map((p) => p.code),
      ),
      this.toSummary(profesor, [...PROFESOR_PERMISSION_CODES]),
    ];
  }

  private async createSystemRole(
    tx: Tx,
    tenantId: string,
    name: string,
    slug: string,
    permissionIds: string[],
  ): Promise<Role> {
    return tx.role.create({
      data: {
        tenantId,
        name,
        slug,
        isSystem: true,
        rolePermissions: {
          create: permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
    });
  }

  private toSummary(role: Role, permissionCodes: string[]): SeededRoleSummary {
    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
      isSystem: role.isSystem,
      permissionCodes,
    };
  }
}
