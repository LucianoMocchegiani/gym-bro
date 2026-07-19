import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Branch, Prisma, Tenant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { BranchSummary, TenantResponse } from './tenants.types';

const DEFAULT_BRANCH_NAME = 'Sede principal';

type TenantWithDefaultBranch = Tenant & {
  branches: Branch[];
};

/**
 * Casos de uso de tenants a nivel plataforma (Super Admin).
 *
 * @remarks RN-TEN-002: crear/gestionar/suspender tenants es exclusivo de Super.
 * RN-TEN-003 / S2: al crear tenant se seedéa una sucursal default.
 */
@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea un gym ACTIVE + sucursal default en la misma transacción.
   *
   * @param dto - Nombre del tenant.
   * @returns Tenant con `defaultBranch`.
   * @see CU-ROL-001 (sucursal inicial)
   */
  async create(dto: CreateTenantDto): Promise<TenantResponse> {
    const { tenant, branch } = await this.prisma.$transaction(async (tx) => {
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
      return { tenant: created, branch: defaultBranch };
    });

    return this.toResponse(tenant, branch);
  }

  /**
   * Lista todos los tenants (más recientes primero), con sede default si existe.
   */
  async findAll(): Promise<TenantResponse[]> {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        branches: { where: { isDefault: true }, take: 1 },
      },
    });
    return tenants.map((t) => this.toResponse(t, t.branches[0] ?? null));
  }

  /**
   * Obtiene un tenant por id.
   *
   * @throws {NotFoundException} Si no existe.
   */
  async findOne(id: string): Promise<TenantResponse> {
    const tenant = await this.findTenantWithDefaultBranch(id);
    return this.toResponse(tenant, tenant.branches[0] ?? null);
  }

  /**
   * Actualiza nombre y/o status (suspender / reactivar).
   *
   * @remarks Idempotente en status: setear el mismo valor actual → 200 sin error.
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

  private async findTenantWithDefaultBranch(
    id: string,
  ): Promise<TenantWithDefaultBranch> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        branches: { where: { isDefault: true }, take: 1 },
      },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    return tenant;
  }

  private toResponse(
    tenant: Tenant,
    defaultBranch: Branch | null,
  ): TenantResponse {
    return {
      id: tenant.id,
      name: tenant.name,
      status: tenant.status,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      defaultBranch: defaultBranch ? this.toBranchSummary(defaultBranch) : null,
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
