import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLE_SLUGS } from './permission-catalog';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { RolesSeedService } from './roles-seed.service';
import { RoleDetail } from './roles.types';

type RoleWithPermissions = Role & {
  rolePermissions: { permission: { code: string } }[];
};

/**
 * CRUD de roles por tenant (custom + edición de Profesor).
 *
 * @remarks CU-ROL-003 / RN-ROL-002. El rol `admin` no se edita.
 * Super opera con `tenantId` de path; staff con tenant del JWT.
 */
@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesSeed: RolesSeedService,
  ) {}

  /**
   * Crea un rol custom (`isSystem=false`) con permisos del catálogo.
   *
   * @throws {NotFoundException} Tenant inexistente.
   * @throws {BadRequestException} Códigos de permiso inválidos.
   * @throws {ConflictException} Nombre o slug duplicado.
   */
  async create(tenantId: string, dto: CreateRoleDto): Promise<RoleDetail> {
    await this.assertTenantExists(tenantId);
    await this.rolesSeed.ensurePermissionCatalog();

    const name = dto.name.trim();
    const slug = await this.allocateSlug(tenantId, this.slugify(name));
    const permissionIds = await this.resolvePermissionIds(dto.permissionCodes);

    try {
      const role = await this.prisma.role.create({
        data: {
          tenantId,
          name,
          slug,
          isSystem: false,
          rolePermissions: {
            create: permissionIds.map((permissionId) => ({ permissionId })),
          },
        },
        include: {
          rolePermissions: { include: { permission: true } },
        },
      });
      return this.toDetail(role);
    } catch (error: unknown) {
      this.rethrowUniqueConflict(error);
      throw error;
    }
  }

  /**
   * Actualiza nombre y/o permisos de un rol (no Admin).
   *
   * @throws {ForbiddenException} Si el rol es `admin`.
   * @throws {NotFoundException} Rol inexistente o de otro tenant.
   */
  async update(
    tenantId: string,
    roleId: string,
    dto: UpdateRoleDto,
  ): Promise<RoleDetail> {
    if (dto.name === undefined && dto.permissionCodes === undefined) {
      throw new BadRequestException('Provide name and/or permissionCodes');
    }

    const role = await this.findRoleInTenant(tenantId, roleId);

    if (role.slug === SYSTEM_ROLE_SLUGS.admin) {
      throw new ForbiddenException('The Admin system role cannot be modified');
    }

    await this.rolesSeed.ensurePermissionCatalog();

    const data: Prisma.RoleUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        if (dto.permissionCodes !== undefined) {
          const permissionIds = await this.resolvePermissionIds(
            dto.permissionCodes,
          );
          await tx.rolePermission.deleteMany({ where: { roleId } });
          await tx.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({
              roleId,
              permissionId,
            })),
          });
        }

        if (Object.keys(data).length > 0) {
          await tx.role.update({ where: { id: roleId }, data });
        }
      });
    } catch (error: unknown) {
      this.rethrowUniqueConflict(error);
      throw error;
    }

    return this.getRoleDetail(tenantId, roleId);
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

  private async findRoleInTenant(
    tenantId: string,
    roleId: string,
  ): Promise<Role> {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found in tenant`);
    }
    return role;
  }

  private async getRoleDetail(
    tenantId: string,
    roleId: string,
  ): Promise<RoleDetail> {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
      include: {
        rolePermissions: { include: { permission: true } },
      },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found in tenant`);
    }
    return this.toDetail(role);
  }

  private async resolvePermissionIds(codes: string[]): Promise<string[]> {
    const unique = [...new Set(codes.map((c) => c.trim()).filter(Boolean))];
    if (unique.length === 0) {
      throw new BadRequestException('permissionCodes must not be empty');
    }

    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: unique } },
    });
    if (permissions.length !== unique.length) {
      const found = new Set(permissions.map((p) => p.code));
      const missing = unique.filter((c) => !found.has(c));
      throw new BadRequestException(
        `Unknown permission codes: ${missing.join(', ')}`,
      );
    }
    return permissions.map((p) => p.id);
  }

  /**
   * Normaliza nombre a slug (`recepcion`, `coach-senior`).
   */
  private slugify(name: string): string {
    const base = name
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

    if (!base) {
      throw new BadRequestException('Role name produces an empty slug');
    }

    if (
      base === SYSTEM_ROLE_SLUGS.admin ||
      base === SYSTEM_ROLE_SLUGS.profesor
    ) {
      throw new BadRequestException(
        `Slug "${base}" is reserved for system roles`,
      );
    }

    return base;
  }

  private async allocateSlug(tenantId: string, base: string): Promise<string> {
    let candidate = base;
    let suffix = 2;
    while (
      await this.prisma.role.findFirst({
        where: { tenantId, slug: candidate },
        select: { id: true },
      })
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private toDetail(role: RoleWithPermissions): RoleDetail {
    return {
      id: role.id,
      tenantId: role.tenantId,
      name: role.name,
      slug: role.slug,
      isSystem: role.isSystem,
      permissionCodes: role.rolePermissions.map((rp) => rp.permission.code),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  private rethrowUniqueConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Role name or slug already exists in tenant');
    }
  }
}
