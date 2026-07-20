import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Branch, Prisma, Role, Tenant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  RolesSeedService,
  SeededRoleSummary,
} from '../roles/roles-seed.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { BranchSummary, RoleSummary, TenantResponse } from './tenants.types';

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
 * @remarks RN-TEN-002: crear/gestionar/suspender tenants es exclusivo de Super.
 * RN-TEN-003 / S2: al crear tenant se seedéa sucursal default.
 * RN-ROL-002: al crear tenant se seedéan roles Admin y Profesor.
 */
@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesSeed: RolesSeedService,
  ) {}

  /**
   * Crea gym ACTIVE + sucursal default + roles sistema (misma transacción).
   *
   * @param dto - Nombre del tenant.
   * @returns Tenant con `defaultBranch` y `systemRoles`.
   * @see CU-ROL-001
   */
  async create(dto: CreateTenantDto): Promise<TenantResponse> {
    const permissions = await this.rolesSeed.ensurePermissionCatalog();

    const { tenant, branch, systemRoles } = await this.prisma.$transaction(
      async (tx) => {
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
        return { tenant: created, branch: defaultBranch, systemRoles: roles };
      },
    );

    return this.toResponse(tenant, branch, systemRoles);
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
      this.toResponse(t, t.branches[0] ?? null, this.mapRoles(t.roles)),
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
    );
  }

  /**
   * Actualiza nombre y/o status (suspender / reactivar).
   *
   * @throws {BadRequestException} Si el body no trae `name` ni `status`.
   * @throws {NotFoundException} Si no existe.
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
  ): TenantResponse {
    return {
      id: tenant.id,
      name: tenant.name,
      status: tenant.status,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      defaultBranch: defaultBranch ? this.toBranchSummary(defaultBranch) : null,
      systemRoles,
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
