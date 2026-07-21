import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Branch, Prisma, Role, Tenant } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLE_SLUGS } from '../roles/permission-catalog';
import {
  RolesSeedService,
  SeededRoleSummary,
} from '../roles/roles-seed.service';
import { StaffService } from '../staff/staff.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import {
  BranchSummary,
  OwnerSummary,
  RoleSummary,
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
 * create = tenant + branch + roles seed + owner Admin.
 */
@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesSeed: RolesSeedService,
    private readonly staffService: StaffService,
  ) {}

  /**
   * Crea gym ACTIVE + sede + roles + staff owner con rol Admin.
   *
   * @see CU-ROL-001
   */
  async create(dto: CreateTenantDto): Promise<TenantResponse> {
    const permissions = await this.rolesSeed.ensurePermissionCatalog();
    const passwordHash = await bcrypt.hash(dto.ownerPassword, 12);
    const ownerEmail = dto.ownerEmail.trim().toLowerCase();
    const ownerName = dto.ownerName?.trim() || null;

    const { tenant, branch, systemRoles, owner } =
      await this.prisma.$transaction(async (tx) => {
        const created = await tx.tenant.create({
          data: { name: dto.name.trim() },
        });
        const defaultBranch = await tx.branch.create({
          data: {
            tenantId: created.id,
            name: DEFAULT_BRANCH_NAME,
            active: true,
            isDefault: true,
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
          branch: defaultBranch,
          systemRoles: roles,
          owner: {
            id: ownerStaff.id,
            email: ownerStaff.email,
            name: ownerStaff.name,
          },
        };
      });

    return this.toResponse(tenant, branch, systemRoles, owner);
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
   * Actualiza nombre y/o status (suspender / reactivar).
   *
   * @see CU-ROL-002
   */
  async update(id: string, dto: UpdateTenantDto): Promise<TenantResponse> {
    if (dto.name === undefined && dto.status === undefined) {
      throw new BadRequestException('Provide name and/or status');
    }

    await this.findOne(id);

    const data: Prisma.TenantUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    await this.prisma.tenant.update({
      where: { id },
      data,
    });

    return this.findOne(id);
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

  private toResponse(
    tenant: Tenant,
    defaultBranch: Branch | null,
    systemRoles: RoleSummary[],
    owner: OwnerSummary | null,
  ): TenantResponse {
    return {
      id: tenant.id,
      name: tenant.name,
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
