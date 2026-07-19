import { Injectable, NotFoundException } from '@nestjs/common';
import { Tenant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';
import { TenantResponse } from './tenants.types';

/**
 * Casos de uso de tenants a nivel plataforma (Super Admin).
 *
 * @remarks RN-TEN-002: crear/gestionar tenants es exclusivo de Super.
 * Suspender status queda fuera de este servicio hasta la tarea E1 correspondiente.
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
   * Actualiza el nombre del tenant.
   *
   * @throws {NotFoundException} Si no existe.
   */
  async update(id: string, dto: UpdateTenantDto): Promise<TenantResponse> {
    await this.findOne(id);
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { name: dto.name.trim() },
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
