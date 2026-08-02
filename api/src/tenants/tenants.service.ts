import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Branch, Prisma, Role, Tenant, TenantStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AUDIT_ACTIONS, AuditActor } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuarkProvisionService } from '../quark/quark-provision.service';
import { SYSTEM_ROLE_SLUGS } from '../roles/permission-catalog';
import {
  RolesSeedService,
  SeededRoleSummary,
} from '../roles/roles-seed.service';
import { StaffService } from '../staff/staff.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { assertValidTenantSlug, normalizeTenantSlug } from './tenant-slug';
import {
  BranchSummary,
  OwnerSummary,
  PublicTenantSummary,
  RoleSummary,
  TenantQuarkSummary,
  TenantResponse,
} from './tenants.types';

const DEFAULT_BRANCH_NAME = 'Sede principal';

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
 * create = tenant + branch + roles seed + owner Admin + Quark soft-provision.
 */
@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesSeed: RolesSeedService,
    private readonly staffService: StaffService,
    private readonly audit: AuditService,
    private readonly quarkProvision: QuarkProvisionService,
  ) {}

  /**
   * Resuelve tenant por slug (login / subdominio).
   *
   * @throws {NotFoundException} Slug inexistente.
   * @throws {ForbiddenException} Tenant suspendido.
   */
  async findPublicBySlug(rawSlug: string): Promise<PublicTenantSummary> {
    const slug = normalizeTenantSlug(rawSlug);
    assertValidTenantSlug(slug);
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
   * Luego intenta provisioning Quark (soft-fail).
   *
   * @see CU-ROL-001
   * @see docs/12-acceso-quark-oid4-diseno.md
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
        const adminRole = roles.find(
          (r) => r.slug === SYSTEM_ROLE_SLUGS.admin,
        );
        if (!adminRole) {
          throw new Error('Admin system role missing after seed');
        }

        const ownerStaff = await tx.staffUser.create({
          data: {
            tenantId: created.id,
            email: ownerEmail,
            passwordHash,
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

      // No bloquear el alta: Quark puede tardar/colgarse (p. ej. BBS en Alpine).
      void this.tryProvisionQuark(tenant.id, actor);

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
          quarkStatus: response.quark.status,
        },
      });
      return response;
    } catch (error: unknown) {
      this.rethrowSlugConflict(error);
      throw error;
    }
  }

  /**
   * Reintenta crear issuer+verifier Quark para un tenant (Super).
   *
   * @remarks Soft-fail: siempre responde con el estado actualizado (READY o MISSING).
   */
  async provisionQuark(
    id: string,
    actor: AuditActor,
  ): Promise<TenantResponse> {
    await this.findTenantWithRelations(id);
    const before = await this.prisma.tenant.findUniqueOrThrow({
      where: { id },
      select: {
        quarkStatus: true,
        quarkIssuerWalletId: true,
        quarkVerifierWalletId: true,
        quarkLastError: true,
      },
    });

    await this.quarkProvision.provisionTenant(id);

    const response = await this.findOne(id);
    await this.audit.record({
      tenantId: id,
      actor,
      action: AUDIT_ACTIONS.tenantQuarkProvision,
      entityType: 'tenant',
      entityId: id,
      before: {
        quarkStatus: before.quarkStatus,
        issuerWalletId: before.quarkIssuerWalletId,
        verifierWalletId: before.quarkVerifierWalletId,
        lastError: before.quarkLastError,
      },
      after: {
        quarkStatus: response.quark.status,
        issuerWalletId: response.quark.issuerWalletId,
        verifierWalletId: response.quark.verifierWalletId,
        lastError: response.quark.lastError,
      },
    });
    return response;
  }

  /**
   * Lista todos los tenants (más recientes primero).
   */
  async findAll(): Promise<TenantResponse[]> {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: this.tenantInclude(),
    });
    return tenants.map((t) =>
      this.toResponse(t, t.branches[0] ?? null, this.mapRoles(t.roles), null),
    );
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

  private async tryProvisionQuark(
    tenantId: string,
    actor: AuditActor,
  ): Promise<void> {
    try {
      const result = await this.quarkProvision.provisionTenant(tenantId);
      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.tenantQuarkProvision,
        entityType: 'tenant',
        entityId: tenantId,
        before: null,
        after: {
          quarkStatus: result.status,
          issuerWalletId: result.issuerWalletId,
          verifierWalletId: result.verifierWalletId,
          lastError: result.lastError,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Unexpected Quark provision error tenant=${tenantId}: ${msg}`,
      );
    }
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
      quark: this.toQuarkSummary(tenant),
    };
  }

  private toQuarkSummary(tenant: Tenant): TenantQuarkSummary {
    return {
      status: tenant.quarkStatus,
      issuerWalletId: tenant.quarkIssuerWalletId,
      issuerDid: tenant.quarkIssuerDid,
      verifierWalletId: tenant.quarkVerifierWalletId,
      verifierDid: tenant.quarkVerifierDid,
      lastError: tenant.quarkLastError,
      provisionedAt: tenant.quarkProvisionedAt,
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
