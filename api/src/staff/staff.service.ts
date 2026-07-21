import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StaffUser } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SetStaffRolesDto } from './dto/staff.dto';
import { StaffUserDetail } from './staff.types';

type StaffWithRoles = StaffUser & {
  staffRoles: {
    role: {
      id: string;
      name: string;
      slug: string;
      isSystem: boolean;
    };
  }[];
};

/**
 * Asignación multi-rol de staff (RN-ROL-004 / CU-ROL-004).
 *
 * @remarks Los `roleIds` deben pertenecer al mismo tenant que el staff.
 */
@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reemplaza por completo los roles del staff.
   *
   * @param tenantId - Tenant esperado (path Super o JWT Staff).
   * @param staffUserId - Staff a actualizar.
   * @param dto - Lista de roleIds (puede ser vacía).
   */
  async setRoles(
    tenantId: string,
    staffUserId: string,
    dto: SetStaffRolesDto,
  ): Promise<StaffUserDetail> {
    const staff = await this.prisma.staffUser.findFirst({
      where: { id: staffUserId, tenantId },
    });
    if (!staff) {
      throw new NotFoundException(
        `Staff ${staffUserId} not found in tenant ${tenantId}`,
      );
    }

    const uniqueRoleIds = [...new Set(dto.roleIds)];
    if (uniqueRoleIds.length > 0) {
      const roles = await this.prisma.role.findMany({
        where: { tenantId, id: { in: uniqueRoleIds } },
        select: { id: true },
      });
      if (roles.length !== uniqueRoleIds.length) {
        throw new BadRequestException(
          'One or more roleIds do not belong to this tenant',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.staffUserRole.deleteMany({ where: { staffUserId } });
      if (uniqueRoleIds.length > 0) {
        await tx.staffUserRole.createMany({
          data: uniqueRoleIds.map((roleId) => ({ staffUserId, roleId })),
        });
      }
    });

    return this.findOne(tenantId, staffUserId);
  }

  /**
   * Detalle de staff con roles.
   */
  async findOne(
    tenantId: string,
    staffUserId: string,
  ): Promise<StaffUserDetail> {
    const staff = await this.prisma.staffUser.findFirst({
      where: { id: staffUserId, tenantId },
      include: {
        staffRoles: {
          include: {
            role: {
              select: { id: true, name: true, slug: true, isSystem: true },
            },
          },
          orderBy: { role: { slug: 'asc' } },
        },
      },
    });
    if (!staff) {
      throw new NotFoundException(
        `Staff ${staffUserId} not found in tenant ${tenantId}`,
      );
    }
    return this.toDetail(staff);
  }

  /**
   * Asigna roles dentro de una transacción (p. ej. create tenant + owner).
   */
  async assignRolesInTx(
    tx: Prisma.TransactionClient,
    staffUserId: string,
    roleIds: string[],
  ): Promise<void> {
    if (roleIds.length === 0) {
      return;
    }
    await tx.staffUserRole.createMany({
      data: roleIds.map((roleId) => ({ staffUserId, roleId })),
    });
  }

  private toDetail(staff: StaffWithRoles): StaffUserDetail {
    return {
      id: staff.id,
      tenantId: staff.tenantId,
      email: staff.email,
      name: staff.name,
      active: staff.active,
      roles: staff.staffRoles.map((sr) => ({
        id: sr.role.id,
        name: sr.role.name,
        slug: sr.role.slug,
        isSystem: sr.role.isSystem,
      })),
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
    };
  }
}
