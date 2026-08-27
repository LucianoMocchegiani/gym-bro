import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Service, ServiceType } from '@prisma/client';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import {
  ListResult,
  normalizeListQuery,
  resolveOrderField,
  toListResult,
} from '../common/list';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateServiceDto,
  ListServicesQueryDto,
  UpdateServiceDto,
} from './dto/service.dto';
import { ServiceDetail } from './services.types';

/** Whitelist de orden para {@link ServicesService.list}. */
const SERVICE_ORDER_FIELDS = ['createdAt', 'name', 'type'] as const;

/**
 * CRUD de servicios del catálogo (CU-SER-001 / RN-SER-001..003).
 *
 * @remarks Packs y sesiones quedan fuera de esta entrega.
 */
@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Lista servicios del tenant (paginado; más recientes primero por defecto).
   *
   * @remarks `q` busca en name (contains, case-insensitive).
   */
  async list(
    tenantId: string,
    query: ListServicesQueryDto = {},
  ): Promise<ListResult<ServiceDetail>> {
    await this.assertTenantExists(tenantId);
    const n = normalizeListQuery(query);
    const orderField = resolveOrderField(
      n.orderBy,
      SERVICE_ORDER_FIELDS,
      'createdAt',
    );
    const where: Prisma.ServiceWhereInput = {
      tenantId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(n.q ? { name: { contains: n.q, mode: 'insensitive' } } : {}),
    };
    const [services, total] = await this.prisma.$transaction([
      this.prisma.service.findMany({
        where,
        orderBy: { [orderField]: n.order },
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.service.count({ where }),
    ]);
    return toListResult(
      services.map((s) => this.toDetail(s)),
      total,
      n.page,
      n.pageSize,
    );
  }

  /**
   * Detalle de un servicio del tenant.
   */
  async findOne(tenantId: string, serviceId: string): Promise<ServiceDetail> {
    const service = await this.findInTenant(tenantId, serviceId);
    return this.toDetail(service);
  }

  /**
   * Crea un servicio `ACCESO_LIBRE` o `POR_SESIONES`.
   */
  async create(
    tenantId: string,
    dto: CreateServiceDto,
    actor: AuditActor,
  ): Promise<ServiceDetail> {
    await this.assertTenantExists(tenantId);
    const branchId = dto.branchId ?? null;
    if (branchId) {
      await this.assertBranchInTenant(tenantId, branchId);
    }
    const dropInPrice = this.resolveDropInPrice(dto.type, dto.dropInPrice);

    const service = await this.prisma.service.create({
      data: {
        tenantId,
        type: dto.type,
        name: dto.name.trim(),
        description: this.normalizeOptional(dto.description),
        imageUrl: dto.imageUrl ?? null,
        dropInPrice,
        branchId,
        active: dto.active ?? true,
      },
    });
    const detail = this.toDetail(service);
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.serviceCreate,
      entityType: 'service',
      entityId: service.id,
      before: null,
      after: this.auditSnapshot(detail),
    });
    return detail;
  }

  /**
   * Actualiza nombre, descripción, sucursal, drop-in y/o active (no el type).
   */
  async update(
    tenantId: string,
    serviceId: string,
    dto: UpdateServiceDto,
    actor: AuditActor,
  ): Promise<ServiceDetail> {
    if (
      dto.name === undefined &&
      dto.description === undefined &&
      dto.imageUrl === undefined &&
      dto.branchId === undefined &&
      dto.active === undefined &&
      dto.dropInPrice === undefined
    ) {
      throw new BadRequestException(
        'Provide name, description, imageUrl, branchId, dropInPrice and/or active',
      );
    }

    const before = await this.findInTenant(tenantId, serviceId);
    const data: Prisma.ServiceUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      data.description = this.normalizeOptional(dto.description);
    }
    if (dto.imageUrl !== undefined) {
      data.imageUrl = dto.imageUrl ?? null;
    }
    if (dto.active !== undefined) {
      data.active = dto.active;
    }
    if (dto.dropInPrice !== undefined) {
      data.dropInPrice = this.resolveDropInPrice(before.type, dto.dropInPrice);
    }
    if (dto.branchId !== undefined) {
      if (dto.branchId === null) {
        data.branch = { disconnect: true };
      } else {
        await this.assertBranchInTenant(tenantId, dto.branchId);
        data.branch = { connect: { id: dto.branchId } };
      }
    }

    const service = await this.prisma.service.update({
      where: { id: serviceId },
      data,
    });
    const detail = this.toDetail(service);
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.serviceUpdate,
      entityType: 'service',
      entityId: serviceId,
      before: this.auditSnapshot(this.toDetail(before)),
      after: this.auditSnapshot(detail),
    });
    return detail;
  }

  /**
   * Eliminación segura de un servicio del catálogo.
   *
   * @remarks Si el servicio está en uso (packs, sesiones, reglas de
   * recurrencia o saldos de crédito) → bloqueo con recomendación de dar de
   * baja (`active=false`). Sin uso → borrado físico.
   * @throws {ConflictException} `SERVICE_IN_USE` si tiene referencias.
   */
  async remove(
    tenantId: string,
    serviceId: string,
    actor: AuditActor,
  ): Promise<{ deleted: true }> {
    const service = await this.findInTenant(tenantId, serviceId);

    const useCounts = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        _count: {
          select: {
            packComponents: true,
            sessions: true,
            recurrenceRules: true,
            creditBalances: true,
          },
        },
      },
    });
    const counts = useCounts?._count ?? {
      packComponents: 0,
      sessions: 0,
      recurrenceRules: 0,
      creditBalances: 0,
    };
    const hasUse =
      counts.packComponents > 0 ||
      counts.sessions > 0 ||
      counts.recurrenceRules > 0 ||
      counts.creditBalances > 0;

    if (hasUse) {
      const reasons: string[] = [];
      if (counts.packComponents > 0) {
        reasons.push(`${counts.packComponents} pack(s)`);
      }
      if (counts.sessions > 0) {
        reasons.push(`${counts.sessions} sesión(es)`);
      }
      if (counts.recurrenceRules > 0) {
        reasons.push(`${counts.recurrenceRules} regla(s) de recurrencia`);
      }
      if (counts.creditBalances > 0) {
        reasons.push(`${counts.creditBalances} saldo(s) de crédito`);
      }
      throw new ConflictException({
        statusCode: 409,
        message: `No se puede eliminar: el servicio está en uso (${reasons.join(', ')}). Dalo de baja desde editar.`,
        code: 'SERVICE_IN_USE',
        counts,
      });
    }

    await this.prisma.service.delete({ where: { id: serviceId } });
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.serviceDelete,
      entityType: 'service',
      entityId: serviceId,
      before: this.auditSnapshot(this.toDetail(service)),
      after: null,
    });
    return { deleted: true };
  }

  private async assertTenantExists(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }
  }

  private async assertBranchInTenant(
    tenantId: string,
    branchId: string,
  ): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException(
        `Branch ${branchId} does not belong to this tenant`,
      );
    }
  }

  private async findInTenant(
    tenantId: string,
    serviceId: string,
  ): Promise<Service> {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId },
    });
    if (!service) {
      throw new NotFoundException(`Service ${serviceId} not found in tenant`);
    }
    return service;
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  /**
   * Resuelve precio drop-in: solo `POR_SESIONES`; ACCESO_LIBRE no admite precio.
   */
  private resolveDropInPrice(
    type: ServiceType,
    dropInPrice: number | null | undefined,
  ): number | null {
    if (dropInPrice === undefined || dropInPrice === null) {
      return null;
    }
    if (type !== ServiceType.POR_SESIONES) {
      throw new BadRequestException(
        'dropInPrice is only allowed for POR_SESIONES services',
      );
    }
    return dropInPrice;
  }

  private toDetail(service: Service): ServiceDetail {
    return {
      id: service.id,
      tenantId: service.tenantId,
      type: service.type,
      name: service.name,
      description: service.description,
      imageUrl: service.imageUrl ?? null,
      dropInPrice: service.dropInPrice,
      active: service.active,
      branchId: service.branchId,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  private auditSnapshot(detail: ServiceDetail): Prisma.InputJsonValue {
    return {
      type: detail.type,
      name: detail.name,
      description: detail.description,
      dropInPrice: detail.dropInPrice,
      active: detail.active,
      branchId: detail.branchId,
    };
  }
}
