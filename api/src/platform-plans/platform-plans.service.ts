import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus, ContractType } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

const MODULE_KEY = /^[a-z][a-z0-9-]{0,39}$/;

@Injectable()
export class PlatformPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string) {
    const admin = await this.requireAdminTenant(tenantId);
    const packs = await this.prisma.pack.findMany({
      where: { tenantId: admin.id, originServiceId: null },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        price: true,
        billingPeriod: true,
        active: true,
      },
    });
    const modules = await this.prisma.platformPlanModule.findMany({
      where: { packId: { in: packs.map(({ id }) => id) } },
    });
    const byPackId = new Map<string, string[]>();
    for (const entry of modules) byPackId.set(entry.packId, entry.modules);
    return packs.map((pack) => ({ ...pack, modules: byPackId.get(pack.id) ?? [] }));
  }

  async updateModules(
    tenantId: string,
    packId: string,
    modules: string[],
    actor: { profileType: 'STAFF' | 'MEMBER' | 'IDENTITY'; userId: string },
  ) {
    const admin = await this.requireAdminTenant(tenantId);
    if (
      modules.length === 0 ||
      modules.some((module) => !MODULE_KEY.test(module)) ||
      new Set(modules).size !== modules.length
    ) {
      throw new BadRequestException('modules must be unique module keys');
    }
    const pack = await this.prisma.pack.findFirst({
      where: { id: packId, tenantId: admin.id, originServiceId: null },
      select: { id: true },
    });
    if (!pack) throw new NotFoundException('Platform plan not found');

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.platformPlanModule.findUnique({ where: { packId } });
      const updated = await tx.platformPlanModule.upsert({
        where: { packId },
        create: { packId, modules },
        update: { modules },
      });
      await this.audit.recordInTx(tx, {
        tenantId: admin.id,
        actor,
        action: 'platform_plan.modules.update',
        entityType: 'platform_plan',
        entityId: packId,
        before: before ? { modules: before.modules } : null,
        after: { modules: updated.modules },
      });
      return { packId: updated.packId, modules: updated.modules };
    });
  }

  async getTenantModules(tenantId: string): Promise<string[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true },
    });
    if (!tenant) return [];
    if (tenant.slug === 'admin') return ['club', 'ecommerce'];

    const admin = await this.prisma.tenant.findUnique({
      where: { slug: 'admin' },
      select: { id: true },
    });
    if (!admin) return ['club'];

    const now = new Date();
    const live = await this.prisma.contract.findFirst({
      where: {
        tenantId,
        contractType: ContractType.TENANT,
        status: ContractStatus.ACTIVE,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { startsAt: 'desc' },
      select: { packId: true },
    });
    const last = live ?? (await this.prisma.contract.findFirst({
      where: { tenantId, contractType: ContractType.TENANT },
      orderBy: { endsAt: 'desc' },
      select: { packId: true },
    }));
    if (!last) return ['club'];

    const pack = await this.prisma.pack.findUnique({
      where: { id: last.packId },
      select: { tenantId: true },
    });
    if (pack?.tenantId !== admin.id) return ['club'];

    const plan = await this.prisma.platformPlanModule.findUnique({
      where: { packId: last.packId },
      select: { modules: true },
    });
    return plan?.modules ?? [];
  }

  private async requireAdminTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true },
    });
    if (tenant?.slug !== 'admin') {
      throw new ForbiddenException('Platform plans can only be managed by admin');
    }
    return tenant;
  }
}
