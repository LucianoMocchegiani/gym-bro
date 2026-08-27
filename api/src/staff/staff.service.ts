import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StaffUser } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import {
  ListQueryDto,
  ListResult,
  normalizeListQuery,
  resolveOrderField,
  toListResult,
} from '../common/list';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto, SetStaffRolesDto } from './dto/staff.dto';
import { StaffUserDetail } from './staff.types';

/** Whitelist de orden para {@link StaffService.list}. */
const STAFF_ORDER_FIELDS = ['createdAt', 'name', 'email'] as const;

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
 * Staff del gym: listado, alta y asignación multi-rol (RN-ROL-004 / CU-ROL-004).
 *
 * @remarks Los `roleIds` deben pertenecer al mismo tenant que el staff.
 */
@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Lista staff del tenant (paginado; más recientes primero por defecto).
   *
   * @remarks `q` busca en email y name (contains, case-insensitive).
   */
  async list(
    tenantId: string,
    query: ListQueryDto = {},
  ): Promise<ListResult<StaffUserDetail>> {
    const n = normalizeListQuery(query);
    const orderField = resolveOrderField(
      n.orderBy,
      STAFF_ORDER_FIELDS,
      'createdAt',
    );
    const where: Prisma.StaffUserWhereInput = {
      tenantId,
      ...(n.q
        ? {
            OR: [
              { email: { contains: n.q, mode: 'insensitive' } },
              { name: { contains: n.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.staffUser.findMany({
        where,
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
        orderBy: { [orderField]: n.order },
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.staffUser.count({ where }),
    ]);
    return toListResult(
      rows.map((s) => this.toDetail(s)),
      total,
      n.page,
      n.pageSize,
    );
  }

  /**
   * Alta de staff con password y roles opcionales.
   *
   * @throws {ConflictException} Email ya usado en el tenant.
   * @throws {BadRequestException} roleIds de otro tenant.
   */
  async create(
    tenantId: string,
    dto: CreateStaffDto,
    actor: AuditActor,
  ): Promise<StaffUserDetail> {
    const email = dto.email.trim().toLowerCase();
    const uniqueRoleIds = [...new Set(dto.roleIds ?? [])];
    if (uniqueRoleIds.length > 0) {
      await this.assertRolesInTenant(tenantId, uniqueRoleIds);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const staff = await this.prisma.$transaction(async (tx) => {
        const created = await tx.staffUser.create({
          data: {
            tenantId,
            email,
            passwordHash,
            name: dto.name?.trim() || null,
            active: true,
          },
        });
        if (uniqueRoleIds.length > 0) {
          await this.assignRolesInTx(tx, created.id, uniqueRoleIds);
        }
        return created;
      });

      const detail = await this.findOne(tenantId, staff.id);
      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.staffCreate,
        entityType: 'staff_user',
        entityId: staff.id,
        before: null,
        after: {
          email: detail.email,
          name: detail.name,
          roleIds: detail.roles.map((r) => r.id),
        },
      });
      return detail;
    } catch (error: unknown) {
      this.rethrowUniqueConflict(error);
      throw error;
    }
  }

  /**
   * Reemplaza por completo los roles del staff.
   *
   * @param tenantId - Tenant esperado (path Super o JWT Staff).
   * @param staffUserId - Staff a actualizar.
   * @param dto - Lista de roleIds (puede ser vacía).
   * @param actor - Quién realiza el cambio (auditoría).
   */
  async setRoles(
    tenantId: string,
    staffUserId: string,
    dto: SetStaffRolesDto,
    actor: AuditActor,
  ): Promise<StaffUserDetail> {
    const staff = await this.prisma.staffUser.findFirst({
      where: { id: staffUserId, tenantId },
    });
    if (!staff) {
      throw new NotFoundException(
        `Staff ${staffUserId} not found in tenant ${tenantId}`,
      );
    }

    const before = await this.findOne(tenantId, staffUserId);
    const uniqueRoleIds = [...new Set(dto.roleIds)];
    if (uniqueRoleIds.length > 0) {
      await this.assertRolesInTenant(tenantId, uniqueRoleIds);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.staffUserRole.deleteMany({ where: { staffUserId } });
      if (uniqueRoleIds.length > 0) {
        await tx.staffUserRole.createMany({
          data: uniqueRoleIds.map((roleId) => ({ staffUserId, roleId })),
        });
      }
    });

    const after = await this.findOne(tenantId, staffUserId);
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.staffRolesSet,
      entityType: 'staff_user',
      entityId: staffUserId,
      before: { roleIds: before.roles.map((r) => r.id) },
      after: { roleIds: after.roles.map((r) => r.id) },
    });
    return after;
  }

  /**
   * Eliminación segura de un staff (flag peligroso).
   *
   * @remarks Si el staff tiene actividad (accesos registrados o como sujeto,
   * movimientos de caja, arqueos, devoluciones resueltas, sesiones/reglas como
   * instructor u ofertas de credencial) → bloqueo con recomendación de
   * desactivar (`active=false`). Sin actividad → borrado físico.
   * @throws {ConflictException} `STAFF_HAS_ACTIVITY` si tiene actividad.
   */
  async remove(
    tenantId: string,
    staffUserId: string,
    actor: AuditActor,
  ): Promise<{ deleted: true }> {
    const staff = await this.prisma.staffUser.findFirst({
      where: { id: staffUserId, tenantId },
    });
    if (!staff) {
      throw new NotFoundException(
        `Staff ${staffUserId} not found in tenant ${tenantId}`,
      );
    }

    const counts = await this.prisma.staffUser.findUnique({
      where: { id: staffUserId },
      select: {
        _count: {
          select: {
            accessAttemptsAsSubject: true,
            accessAttemptsRecorded: true,
            cashMovementsRecorded: true,
            cashReconciliations: true,
            refundRequestsResolved: true,
            instructedSessions: true,
            instructedRecurrenceRules: true,
            staffCredentialOffers: true,
          },
        },
      },
    });
    const c = counts?._count ?? {
      accessAttemptsAsSubject: 0,
      accessAttemptsRecorded: 0,
      cashMovementsRecorded: 0,
      cashReconciliations: 0,
      refundRequestsResolved: 0,
      instructedSessions: 0,
      instructedRecurrenceRules: 0,
      staffCredentialOffers: 0,
    };
    const hasActivity = Object.values(c).some((n) => n > 0);

    if (hasActivity) {
      const reasons: string[] = [];
      if (c.accessAttemptsAsSubject > 0)
        reasons.push(`${c.accessAttemptsAsSubject} acceso(s) como sujeto`);
      if (c.accessAttemptsRecorded > 0)
        reasons.push(`${c.accessAttemptsRecorded} acceso(s) registrados`);
      if (c.cashMovementsRecorded > 0)
        reasons.push(`${c.cashMovementsRecorded} movimiento(s) de caja`);
      if (c.cashReconciliations > 0)
        reasons.push(`${c.cashReconciliations} arqueo(s)`);
      if (c.refundRequestsResolved > 0)
        reasons.push(`${c.refundRequestsResolved} devolución(es) resueltas`);
      if (c.instructedSessions > 0)
        reasons.push(`${c.instructedSessions} sesión(es) como instructor`);
      if (c.instructedRecurrenceRules > 0)
        reasons.push(`${c.instructedRecurrenceRules} regla(s) de recurrencia`);
      if (c.staffCredentialOffers > 0)
        reasons.push(`${c.staffCredentialOffers} oferta(s) de credencial`);
      throw new ConflictException({
        statusCode: 409,
        message: `No se puede eliminar: el staff tiene actividad (${reasons.join(', ')}). Desactivalo desde el listado.`,
        code: 'STAFF_HAS_ACTIVITY',
        counts: c,
      });
    }

    await this.prisma.staffUser.delete({ where: { id: staffUserId } });
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.staffDelete,
      entityType: 'staff_user',
      entityId: staffUserId,
      before: { email: staff.email, name: staff.name, active: staff.active },
      after: null,
    });
    return { deleted: true };
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

  private async assertRolesInTenant(
    tenantId: string,
    roleIds: string[],
  ): Promise<void> {
    const roles = await this.prisma.role.findMany({
      where: { tenantId, id: { in: roleIds } },
      select: { id: true },
    });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException(
        'One or more roleIds do not belong to this tenant',
      );
    }
  }

  private rethrowUniqueConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Staff email already exists in tenant');
    }
  }

  private toDetail(staff: StaffWithRoles): StaffUserDetail {
    return {
      id: staff.id,
      tenantId: staff.tenantId,
      email: staff.email,
      name: staff.name,
      imageUrl: staff.imageUrl ?? null,
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
