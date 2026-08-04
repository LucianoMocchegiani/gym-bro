import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pack, Prisma, Service, ServiceType } from '@prisma/client';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import {
  ListResult,
  normalizeListQuery,
  resolveOrderField,
  toListResult,
} from '../common/list';
import { PrismaService } from '../prisma/prisma.service';
import { QuarkPackSyncService } from '../quark/quark-pack-sync.service';
import {
  CreatePackDto,
  ListPacksQueryDto,
  PackComponentInputDto,
  UpdatePackDto,
} from './dto/pack.dto';
import { PackComponentDetail, PackDetail, PackKind } from './packs.types';

/** Whitelist de orden para {@link PacksService.list}. */
const PACK_ORDER_FIELDS = ['createdAt', 'name', 'price'] as const;

type PackWithComponents = Pack & {
  components: {
    id: string;
    serviceId: string;
    creditAmount: number | null;
    service: Pick<Service, 'id' | 'name' | 'type' | 'active' | 'tenantId'>;
  }[];
};

/**
 * CRUD de packs del catálogo (CU-SER-002 / RN-SER-004..007).
 *
 * @remarks Tras create/update se sincroniza metadata OID4VCI en Quark (soft-fail).
 * Contratación y consumo de créditos quedan fuera de esta entrega.
 */
@Injectable()
export class PacksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly quarkPackSync: QuarkPackSyncService,
  ) {}

  /**
   * Lista packs del tenant con componentes (paginado; más recientes primero
   * por defecto).
   *
   * @remarks `q` busca en name (contains, case-insensitive).
   */
  async list(
    tenantId: string,
    query: ListPacksQueryDto = {},
  ): Promise<ListResult<PackDetail>> {
    await this.assertTenantExists(tenantId);
    const n = normalizeListQuery(query);
    const orderField = resolveOrderField(
      n.orderBy,
      PACK_ORDER_FIELDS,
      'createdAt',
    );
    const where: Prisma.PackWhereInput = {
      tenantId,
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(n.q ? { name: { contains: n.q, mode: 'insensitive' } } : {}),
    };
    const [packs, total] = await this.prisma.$transaction([
      this.prisma.pack.findMany({
        where,
        include: this.packInclude(),
        orderBy: { [orderField]: n.order },
        skip: n.skip,
        take: n.take,
      }),
      this.prisma.pack.count({ where }),
    ]);
    return toListResult(
      packs.map((p) => this.toDetail(p)),
      total,
      n.page,
      n.pageSize,
    );
  }

  /**
   * Detalle de un pack del tenant.
   */
  async findOne(tenantId: string, packId: string): Promise<PackDetail> {
    const pack = await this.findInTenant(tenantId, packId);
    return this.toDetail(pack);
  }

  /**
   * Crea pack + componentes en una transacción; luego sync Quark (soft-fail).
   */
  async create(
    tenantId: string,
    dto: CreatePackDto,
    actor: AuditActor,
  ): Promise<PackDetail> {
    await this.assertTenantExists(tenantId);
    const resolved = await this.resolveComponents(tenantId, dto.components);

    const pack = await this.prisma.$transaction(async (tx) => {
      const created = await tx.pack.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          description: this.normalizeOptional(dto.description),
          price: dto.price,
          billingPeriod: dto.billingPeriod,
          creditsExpireAt: this.parseExpireAt(dto.creditsExpireAt),
          active: dto.active ?? true,
          components: {
            create: resolved.map((c) => ({
              serviceId: c.serviceId,
              creditAmount: c.creditAmount,
            })),
          },
        },
        include: this.packInclude(),
      });
      return created;
    });

    await this.quarkPackSync.syncPackConfiguration(
      tenantId,
      pack.id,
      pack.name,
    );

    const detail = this.toDetail(
      await this.findInTenant(tenantId, pack.id),
    );
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.packCreate,
      entityType: 'pack',
      entityId: pack.id,
      before: null,
      after: this.auditSnapshot(detail),
    });
    return detail;
  }

  /**
   * Actualiza pack; si hay `components`, reemplaza el set completo.
   * Re-sincroniza metadata Quark (nombre / config) con soft-fail.
   */
  async update(
    tenantId: string,
    packId: string,
    dto: UpdatePackDto,
    actor: AuditActor,
  ): Promise<PackDetail> {
    if (
      dto.name === undefined &&
      dto.description === undefined &&
      dto.price === undefined &&
      dto.billingPeriod === undefined &&
      dto.creditsExpireAt === undefined &&
      dto.active === undefined &&
      dto.components === undefined
    ) {
      throw new BadRequestException(
        'Provide name, description, price, billingPeriod, creditsExpireAt, active and/or components',
      );
    }

    const before = await this.findInTenant(tenantId, packId);
    const resolved =
      dto.components !== undefined
        ? await this.resolveComponents(tenantId, dto.components)
        : null;

    const pack = await this.prisma.$transaction(async (tx) => {
      if (resolved) {
        await tx.packComponent.deleteMany({ where: { packId } });
        await tx.packComponent.createMany({
          data: resolved.map((c) => ({
            packId,
            serviceId: c.serviceId,
            creditAmount: c.creditAmount,
          })),
        });
      }

      const data: Prisma.PackUpdateInput = {};
      if (dto.name !== undefined) {
        data.name = dto.name.trim();
      }
      if (dto.description !== undefined) {
        data.description = this.normalizeOptional(dto.description);
      }
      if (dto.price !== undefined) {
        data.price = dto.price;
      }
      if (dto.billingPeriod !== undefined) {
        data.billingPeriod = dto.billingPeriod;
      }
      if (dto.creditsExpireAt !== undefined) {
        data.creditsExpireAt =
          dto.creditsExpireAt === null
            ? null
            : this.parseExpireAt(dto.creditsExpireAt);
      }
      if (dto.active !== undefined) {
        data.active = dto.active;
      }

      if (Object.keys(data).length > 0) {
        await tx.pack.update({ where: { id: packId }, data });
      }

      return tx.pack.findFirstOrThrow({
        where: { id: packId, tenantId },
        include: this.packInclude(),
      });
    });

    await this.quarkPackSync.syncPackConfiguration(
      tenantId,
      pack.id,
      pack.name,
    );

    const detail = this.toDetail(
      await this.findInTenant(tenantId, packId),
    );
    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.packUpdate,
      entityType: 'pack',
      entityId: packId,
      before: this.auditSnapshot(this.toDetail(before)),
      after: this.auditSnapshot(detail),
    });
    return detail;
  }

  private packInclude() {
    return {
      components: {
        include: {
          service: {
            select: {
              id: true,
              name: true,
              type: true,
              active: true,
              tenantId: true,
            },
          },
        },
        orderBy: { service: { name: 'asc' as const } },
      },
    };
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

  private async findInTenant(
    tenantId: string,
    packId: string,
  ): Promise<PackWithComponents> {
    const pack = await this.prisma.pack.findFirst({
      where: { id: packId, tenantId },
      include: this.packInclude(),
    });
    if (!pack) {
      throw new NotFoundException(`Pack ${packId} not found in tenant`);
    }
    return pack;
  }

  /**
   * Valida componentes (mismo tenant, activos, créditos coherentes, sin duplicados).
   */
  private async resolveComponents(
    tenantId: string,
    inputs: PackComponentInputDto[],
  ): Promise<{ serviceId: string; creditAmount: number | null }[]> {
    if (inputs.length === 0) {
      throw new BadRequestException('components must not be empty');
    }

    const serviceIds = inputs.map((c) => c.serviceId);
    const uniqueIds = new Set(serviceIds);
    if (uniqueIds.size !== serviceIds.length) {
      throw new BadRequestException('Duplicate serviceId in components');
    }

    const services = await this.prisma.service.findMany({
      where: { tenantId, id: { in: serviceIds } },
    });
    if (services.length !== serviceIds.length) {
      throw new BadRequestException(
        'One or more serviceIds do not belong to this tenant',
      );
    }

    const byId = new Map(services.map((s) => [s.id, s]));
    const resolved: { serviceId: string; creditAmount: number | null }[] = [];

    for (const input of inputs) {
      const service = byId.get(input.serviceId);
      if (!service) {
        throw new BadRequestException(
          `Service ${input.serviceId} not found in tenant`,
        );
      }
      if (!service.active) {
        throw new BadRequestException(
          `Service ${service.name} is inactive and cannot be used in a pack`,
        );
      }

      if (service.type === ServiceType.ACCESO_LIBRE) {
        if (input.creditAmount !== undefined) {
          throw new BadRequestException(
            `ACCESO_LIBRE service ${service.name} must not include creditAmount`,
          );
        }
        resolved.push({ serviceId: service.id, creditAmount: null });
        continue;
      }

      if (input.creditAmount === undefined || input.creditAmount < 1) {
        throw new BadRequestException(
          `POR_SESIONES service ${service.name} requires creditAmount >= 1`,
        );
      }
      resolved.push({
        serviceId: service.id,
        creditAmount: input.creditAmount,
      });
    }

    return resolved;
  }

  private inferKind(
    components: { service: { type: ServiceType } }[],
  ): PackKind {
    const hasAccess = components.some(
      (c) => c.service.type === ServiceType.ACCESO_LIBRE,
    );
    const hasCredits = components.some(
      (c) => c.service.type === ServiceType.POR_SESIONES,
    );
    if (hasAccess && hasCredits) {
      return 'MIXED';
    }
    if (hasCredits) {
      return 'CREDITS';
    }
    return 'ACCESS';
  }

  private parseExpireAt(value: string | undefined): Date | null {
    if (value === undefined) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('creditsExpireAt is invalid');
    }
    return date;
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private toDetail(pack: PackWithComponents): PackDetail {
    const components: PackComponentDetail[] = pack.components.map((c) => ({
      id: c.id,
      serviceId: c.serviceId,
      serviceName: c.service.name,
      serviceType: c.service.type,
      creditAmount: c.creditAmount,
    }));
    return {
      id: pack.id,
      tenantId: pack.tenantId,
      name: pack.name,
      description: pack.description,
      price: pack.price,
      billingPeriod: pack.billingPeriod,
      creditsExpireAt: pack.creditsExpireAt,
      active: pack.active,
      kind: this.inferKind(pack.components),
      components,
      quarkConfigurationId: pack.quarkConfigurationId,
      quarkVct: pack.quarkVct,
      quarkSyncedAt: pack.quarkSyncedAt,
      quarkLastError: pack.quarkLastError,
      createdAt: pack.createdAt,
      updatedAt: pack.updatedAt,
    };
  }

  private auditSnapshot(detail: PackDetail): Prisma.InputJsonValue {
    return {
      name: detail.name,
      price: detail.price,
      billingPeriod: detail.billingPeriod,
      creditsExpireAt: detail.creditsExpireAt?.toISOString() ?? null,
      active: detail.active,
      kind: detail.kind,
      quarkConfigurationId: detail.quarkConfigurationId,
      quarkSyncedAt: detail.quarkSyncedAt?.toISOString() ?? null,
      quarkLastError: detail.quarkLastError,
      components: detail.components.map((c) => ({
        serviceId: c.serviceId,
        creditAmount: c.creditAmount,
      })),
    };
  }
}
