import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Branch, ContractStatus, ContractType, Prisma, Role, Tenant, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import {
  ListResult,
  normalizeListQuery,
  resolveOrderField,
  toListResult,
} from '../common/list';
import { IdentityService } from '../auth/identity.service';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLE_SLUGS } from '../roles/permission-catalog';
import {
  RolesSeedService,
  SeededRoleSummary,
} from '../roles/roles-seed.service';
import { StaffService } from '../staff/staff.service';
import {
  CreateTenantDto,
  DeleteTenantDto,
  ListTenantsQueryDto,
  UpdateTenantDto,
} from './dto/tenant.dto';
import { PlatformTrialService } from './platform-trial.service';
import { assertValidTenantSlug, normalizeTenantSlug } from './tenant-slug';
import {
  BranchSummary,
  OwnerSummary,
  PlatformDashboardKpis,
  PlatformTenantSummary,
  PlatformTrialEligibility,
  PublicTenantSummary,
  RoleSummary,
  TenantResponse,
  GymPlanView,
} from './tenants.types';

const DEFAULT_BRANCH_NAME = 'Sede principal';

/** Whitelist de orden para {@link TenantsService.findAll}. */
const TENANT_ORDER_FIELDS = ['createdAt', 'name', 'slug'] as const;

type TenantWithRelations = Tenant & {
  branches: Branch[];
  roles: (Role & {
    rolePermissions: { permission: { code: string } }[];
  })[];
};

/**
 * Casos de uso de tenants a nivel plataforma (Super Admin).
 *
 * @remarks RN-TEN-002 / RN-TEN-003 / RN-ROL-002 / CU-ROL-001:
 * create = tenant + branch + roles seed + owner Admin.
 * Kuatia: wallets compartidos vía env (consola Kuatia); sin bind por tenant.
 */
@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesSeed: RolesSeedService,
    private readonly staffService: StaffService,
    private readonly audit: AuditService,
    private readonly identities: IdentityService,
    private readonly platformTrial: PlatformTrialService,
  ) {}

  /**
   * Resuelve tenant por slug (login / subdominio).
   *
   * @throws {NotFoundException} Slug inexistente.
   * @throws {ForbiddenException} Tenant suspendido.
   */
  async findPublicBySlug(rawSlug: string): Promise<PublicTenantSummary> {
    const slug = normalizeTenantSlug(rawSlug);
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      throw new NotFoundException(`Tenant slug "${slug}" not found`);
    }
    if (tenant.status === TenantStatus.SUSPENDED) {
      throw new ForbiddenException('Tenant is suspended');
    }
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
    };
  }

  /**
   * Crea gym ACTIVE + sede + roles + staff owner con rol Admin.
   *
   * @see CU-ROL-001
   */
  async create(
    dto: CreateTenantDto,
    actor: AuditActor,
  ): Promise<TenantResponse> {
    const slug = normalizeTenantSlug(dto.slug);
    assertValidTenantSlug(slug);
    const permissions = await this.rolesSeed.ensurePermissionCatalog();
    const passwordHash = await bcrypt.hash(dto.ownerPassword, 12);
    const ownerEmail = dto.ownerEmail.trim().toLowerCase();
    const ownerName = dto.ownerName?.trim() || null;

    try {
      const { tenant, owner } = await this.prisma.$transaction(async (tx) => {
        const created = await tx.tenant.create({
          data: { name: dto.name.trim(), slug },
        });
        await tx.branch.create({
          data: {
            tenantId: created.id,
            name: DEFAULT_BRANCH_NAME,
            active: true,
            isDefault: true,
          },
        });
        await tx.tenantSettings.create({
          data: {
            tenantId: created.id,
            reservationCancellationHours: 6,
          },
        });
        const roles = await this.rolesSeed.seedSystemRolesForTenant(
          tx,
          created.id,
          permissions,
        );
        const adminRole = roles.find((r) => r.slug === SYSTEM_ROLE_SLUGS.admin);
        if (!adminRole) {
          throw new Error('Admin system role missing after seed');
        }

        const identity = await this.identities.ensure(tx, {
          email: ownerEmail,
          passwordHash,
          name: ownerName,
        });
        await tx.tenant.update({
          where: { id: created.id },
          data: { ownerIdentityId: identity.id },
        });
        const ownerStaff = await tx.staffUser.create({
          data: {
            tenantId: created.id,
            identityId: identity.id,
            email: ownerEmail,
            name: ownerName,
            active: true,
          },
        });
        await this.staffService.assignRolesInTx(tx, ownerStaff.id, [
          adminRole.id,
        ]);

        return {
          tenant: created,
          owner: {
            id: ownerStaff.id,
            email: ownerStaff.email,
            name: ownerStaff.name,
          },
        };
      });

      const response = await this.findOne(tenant.id);
      response.owner = owner;
      await this.audit.record({
        tenantId: tenant.id,
        actor,
        action: AUDIT_ACTIONS.tenantCreate,
        entityType: 'tenant',
        entityId: tenant.id,
        before: null,
        after: {
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          ownerEmail: owner.email,
        },
      });
      return response;
    } catch (error: unknown) {
      this.rethrowSlugConflict(error);
      throw error;
    }
  }

  /**
   * Alta de gym cuyo dueño ya es una Identity (self-serve).
   *
   * @remarks Sin password nuevo: el staff Admin usa la misma cuenta.
   */
  async provisionFromIdentity(
    identityId: string,
    input: { name: string; slug: string },
  ): Promise<{ tenantId: string; slug: string }> {
    const slug = normalizeTenantSlug(input.slug);
    assertValidTenantSlug(slug);
    const identity = await this.prisma.identity.findUnique({
      where: { id: identityId },
      select: { id: true, email: true, name: true },
    });
    if (!identity) {
      throw new NotFoundException(`Identity ${identityId} not found`);
    }
    const permissions = await this.rolesSeed.ensurePermissionCatalog();
    try {
      const tenant = await this.prisma.$transaction(async (tx) => {
        const created = await tx.tenant.create({
          data: {
            name: input.name.trim(),
            slug,
            ownerIdentityId: identity.id,
          },
        });
        await tx.branch.create({
          data: {
            tenantId: created.id,
            name: DEFAULT_BRANCH_NAME,
            active: true,
            isDefault: true,
          },
        });
        await tx.tenantSettings.create({
          data: {
            tenantId: created.id,
            reservationCancellationHours: 6,
          },
        });
        const roles = await this.rolesSeed.seedSystemRolesForTenant(
          tx,
          created.id,
          permissions,
        );
        const adminRole = roles.find((r) => r.slug === SYSTEM_ROLE_SLUGS.admin);
        if (!adminRole) {
          throw new Error('Admin system role missing after seed');
        }
        const ownerStaff = await tx.staffUser.create({
          data: {
            tenantId: created.id,
            identityId: identity.id,
            email: identity.email,
            name: identity.name,
            active: true,
          },
        });
        await this.staffService.assignRolesInTx(tx, ownerStaff.id, [
          adminRole.id,
        ]);
        return created;
      });
      await this.audit.record({
        tenantId: tenant.id,
        actor: { profileType: 'IDENTITY', userId: identityId },
        action: AUDIT_ACTIONS.tenantCreate,
        entityType: 'tenant',
        entityId: tenant.id,
        before: null,
        after: {
          name: tenant.name,
          slug: tenant.slug,
          via: 'platform-signup',
        },
      });
      return { tenantId: tenant.id, slug: tenant.slug };
    } catch (error: unknown) {
      this.rethrowSlugConflict(error);
      throw error;
    }
  }

  /**
   * Lista tenants (paginado; más recientes primero por defecto).
   *
   * @remarks `q` busca en name y slug.
   */
  async findAll(
    query: ListTenantsQueryDto = {},
  ): Promise<ListResult<TenantResponse>> {
    const n = normalizeListQuery(query);
    const orderField = resolveOrderField(
      n.orderBy,
      TENANT_ORDER_FIELDS,
      'createdAt',
    );
    const where: Prisma.TenantWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(n.q
        ? {
            OR: [
              { name: { contains: n.q, mode: 'insensitive' } },
              { slug: { contains: n.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [tenants, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        orderBy: { [orderField]: n.order },
        skip: n.skip,
        take: n.take,
        include: this.tenantInclude(),
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return toListResult(
      tenants.map((t) =>
        this.toResponse(t, t.branches[0] ?? null, this.mapRoles(t.roles), null),
      ),
      total,
      n.page,
      n.pageSize,
    );
  }

  /**
   * Lista de tenants para el dashboard de plataforma (staff del tenant `admin`).
   *
   * @remarks Vista resumen (`PlatformTenantSummary`), no `TenantResponse`: el
   * selector de gyms no necesita roles ni owner. Paginada y con `q` por
   * name/slug para el TenantPicker.
   */
  async platformList(
    query: ListTenantsQueryDto,
  ): Promise<ListResult<PlatformTenantSummary>> {
    const normalized = normalizeListQuery(query);
    const where: Prisma.TenantWhereInput = {
      slug: { not: 'admin' },
    };
    if (query.status) {
      where.status = query.status;
    }
    if (normalized.q) {
      where.OR = [
        { name: { contains: normalized.q, mode: 'insensitive' } },
        { slug: { contains: normalized.q, mode: 'insensitive' } },
      ];
    }
    const orderBy = resolveOrderField(
      normalized.orderBy,
      ['name', 'slug', 'createdAt'] as const,
      'name',
    );
    const [items, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: { [orderBy]: normalized.order },
        skip: normalized.skip,
        take: normalized.take,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          _count: { select: { members: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);
    const results = items.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      memberCount: t._count.members,
    }));
    return toListResult(results, total, normalized.page, normalized.pageSize);
  }

  /**
   * Conteos del inicio de plataforma (gyms, sin el tenant `admin`).
   *
   * @remarks `withoutActiveTenantContract` = tenants ACTIVE sin contrato
   * `TENANT` vigente (equivalente a “sin pack” del gym).
   */
  async platformKpis(): Promise<PlatformDashboardKpis> {
    const gyms = { slug: { not: 'admin' } };
    const [activeGyms, withoutActiveTenantContract] = await Promise.all([
      this.prisma.tenant.count({
        where: { ...gyms, status: TenantStatus.ACTIVE },
      }),
      this.prisma.tenant.count({
        where: {
          ...gyms,
          status: TenantStatus.ACTIVE,
          contracts: {
            none: {
              contractType: ContractType.TENANT,
              status: ContractStatus.ACTIVE,
            },
          },
        },
      }),
    ]);
    return { activeGyms, withoutActiveTenantContract };
  }

  /**
   * Si Caja puede otorgar 30 días de prueba a este gym.
   */
  getPlatformTrialEligibility(
    billingTenantId: string,
  ): Promise<PlatformTrialEligibility> {
    return this.platformTrial.evaluate(billingTenantId);
  }

  /**
   * Plan Faciliter del gym (staff del propio tenant).
   *
   * @throws {BadRequestException} Tenant `admin`.
   */
  async getGymPlan(tenantId: string, staffUserId: string): Promise<GymPlanView> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        ownerIdentityId: true,
      },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }
    if (tenant.slug === 'admin') {
      throw new BadRequestException(
        'El tenant de plataforma no tiene un plan Faciliter',
      );
    }

    const staff = await this.prisma.staffUser.findFirst({
      where: { id: staffUserId, tenantId },
      select: { identityId: true },
    });
    const isOwner = Boolean(
      tenant.ownerIdentityId &&
        staff &&
        staff.identityId === tenant.ownerIdentityId,
    );

    const now = new Date();
    const current = await this.prisma.contract.findFirst({
      where: {
        tenantId,
        contractType: ContractType.TENANT,
        status: ContractStatus.ACTIVE,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      include: {
        pack: {
          select: {
            id: true,
            name: true,
            components: { include: { service: { select: { name: true } } } },
          },
        },
      },
      orderBy: { endsAt: 'desc' },
    });

    const latest =
      current ??
      (await this.prisma.contract.findFirst({
        where: {
          tenantId,
          contractType: ContractType.TENANT,
        },
        include: {
          pack: {
            select: {
              id: true,
              name: true,
              components: { include: { service: { select: { name: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }));

    const eligibility = await this.platformTrial.evaluate(tenantId);
    const serviceNames =
      latest?.pack.components.map((c) => c.service.name) ?? [];

    let status: GymPlanView['status'] = 'none';
    if (current) {
      status = current.isPlatformTrial ? 'trial' : 'active';
    } else if (latest) {
      status = 'expired';
    }

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      status,
      packId: latest?.pack.id ?? null,
      packName: latest?.pack.name ?? null,
      serviceNames,
      startsAt: latest?.startsAt.toISOString() ?? null,
      endsAt: latest?.endsAt?.toISOString() ?? null,
      isPlatformTrial: current?.isPlatformTrial ?? false,
      isOwner,
      platformTrialEligible: eligibility.eligible,
    };
  }

  /**
   * Obtiene un tenant por id.
   *
   * @throws {NotFoundException} Si no existe.
   */
  async findOne(id: string): Promise<TenantResponse> {
    const tenant = await this.findTenantWithRelations(id);
    return this.toResponse(
      tenant,
      tenant.branches[0] ?? null,
      this.mapRoles(tenant.roles),
      null,
    );
  }

  /**
   * Actualiza nombre, slug y/o status (suspender / reactivar).
   *
   * @see CU-ROL-002
   */
  async update(
    id: string,
    dto: UpdateTenantDto,
    actor: AuditActor,
  ): Promise<TenantResponse> {
    if (
      dto.name === undefined &&
      dto.status === undefined &&
      dto.slug === undefined
    ) {
      throw new BadRequestException('Provide name, slug and/or status');
    }

    const beforeTenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, status: true },
    });
    if (!beforeTenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }

    const data: Prisma.TenantUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.slug !== undefined) {
      const slug = normalizeTenantSlug(dto.slug);
      assertValidTenantSlug(slug);
      data.slug = slug;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    try {
      await this.prisma.tenant.update({
        where: { id },
        data,
      });
    } catch (error: unknown) {
      this.rethrowSlugConflict(error);
      throw error;
    }

    const response = await this.findOne(id);
    await this.audit.record({
      tenantId: id,
      actor,
      action: AUDIT_ACTIONS.tenantUpdate,
      entityType: 'tenant',
      entityId: id,
      before: {
        name: beforeTenant.name,
        slug: beforeTenant.slug,
        status: beforeTenant.status,
      },
      after: {
        name: response.name,
        slug: response.slug,
        status: response.status,
      },
    });
    return response;
  }

  /**
   * Eliminación física de un tenant (Super Admin, cascada total).
   *
   * @remarks Confirmación estricta: `confirmWord` debe ser `ELIMINAR` y
   * `slug` debe coincidir con el del tenant. Registra auditoría antes de
   * borrar (el evento se elimina con el tenant).
   * @throws {BadRequestException} Si no coincide el confirmWord o el slug.
   */
  async remove(
    id: string,
    dto: DeleteTenantDto,
    actor: AuditActor,
  ): Promise<{ deleted: true }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }

    if (dto.confirmWord.trim().toUpperCase() !== 'ELIMINAR') {
      throw new BadRequestException('confirmWord must be ELIMINAR');
    }
    if (dto.slug.trim().toLowerCase() !== tenant.slug.toLowerCase()) {
      throw new BadRequestException('slug does not match tenant slug');
    }

    await this.prisma.tenant.delete({ where: { id } });
    await this.audit.record({
      tenantId: id,
      actor,
      action: AUDIT_ACTIONS.tenantDelete,
      entityType: 'tenant',
      entityId: id,
      before: { name: tenant.name, slug: tenant.slug },
      after: null,
    });
    return { deleted: true };
  }

  private tenantInclude() {
    return {
      branches: { where: { isDefault: true }, take: 1 },
      roles: {
        where: { isSystem: true },
        orderBy: { slug: 'asc' as const },
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    };
  }

  private async findTenantWithRelations(
    id: string,
  ): Promise<TenantWithRelations> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: this.tenantInclude(),
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    return tenant;
  }

  private mapRoles(roles: TenantWithRelations['roles']): SeededRoleSummary[] {
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      slug: role.slug,
      isSystem: role.isSystem,
      permissionCodes: role.rolePermissions.map((rp) => rp.permission.code),
    }));
  }

  private rethrowSlugConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Tenant slug already exists');
    }
  }

  private toResponse(
    tenant: Tenant,
    defaultBranch: Branch | null,
    systemRoles: RoleSummary[],
    owner: OwnerSummary | null,
  ): TenantResponse {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      defaultBranch: defaultBranch ? this.toBranchSummary(defaultBranch) : null,
      systemRoles,
      owner,
    };
  }

  private toBranchSummary(branch: Branch): BranchSummary {
    return {
      id: branch.id,
      name: branch.name,
      active: branch.active,
      isDefault: branch.isDefault,
    };
  }
}
