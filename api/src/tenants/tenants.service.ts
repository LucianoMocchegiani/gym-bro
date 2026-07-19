import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Tenant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { TenantResponse } from './tenants.types';

/**
 * Casos de uso de tenants a nivel plataforma (Super Admin).
 *
 * @remarks RN-TEN-002: crear/gestionar/suspender tenants es exclusivo de Super.
 * Staff/Member de un tenant SUSPENDED fallan en login/refresh (`AuthService`).
 */
@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea un gym con estado ACTIVE.
   *
   * @param dto - Nombre del tenant.
   * @returns Tenant creado.
   */
  async create(dto: CreateTenantDto): Promise<TenantResponse> {
    const tenant = await this.prisma.tenant.create({
      data: { name: dto.name.trim() },
    });
    return this.toResponse(tenant);
  }

  /**
   * Lista todos los tenants (más recientes primero).
   */
  async findAll(): Promise<TenantResponse[]> {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return tenants.map((t) => this.toResponse(t));
  }

  /**
   * Obtiene un tenant por id.
   *
   * @throws {NotFoundException} Si no existe.
   */
  async findOne(id: string): Promise<TenantResponse> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    return this.toResponse(tenant);
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

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data,
    });
    return this.toResponse(tenant);
  }

  private toResponse(tenant: Tenant): TenantResponse {
    return {
      id: tenant.id,
      name: tenant.name,
      status: tenant.status,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }
}
