import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Service, ServiceType } from '@prisma/client';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { ServiceDetail } from './services.types';

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
   * Lista servicios del tenant (más recientes primero).
   */
  async list(
    tenantId: string,
    options: { type?: ServiceType; active?: boolean } = {},
  ): Promise<ServiceDetail[]> {
    await this.assertTenantExists(tenantId);
    const services = await this.prisma.service.findMany({
      where: {
        tenantId,
        ...(options.type ? { type: options.type } : {}),
        ...(options.active !== undefined ? { active: options.active } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return services.map((s) => this.toDetail(s));
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

    const service = await this.prisma.service.create({
      data: {
        tenantId,
        type: dto.type,
        name: dto.name.trim(),
        description: this.normalizeOptional(dto.description),
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
   * Actualiza nombre, descripción, sucursal y/o active (no el type).
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
      dto.branchId === undefined &&
      dto.active === undefined
    ) {
      throw new BadRequestException(
        'Provide name, description, branchId and/or active',
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
    if (dto.active !== undefined) {
      data.active = dto.active;
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

  private toDetail(service: Service): ServiceDetail {
    return {
      id: service.id,
      tenantId: service.tenantId,
      type: service.type,
      name: service.name,
      description: service.description,
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
      active: detail.active,
      branchId: detail.branchId,
    };
  }
}
