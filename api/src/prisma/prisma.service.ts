import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma compartido por la API.
 *
 * @remarks Conecta al arrancar el módulo y cierra al destruirlo.
 * No aplica filtro multi-tenant: eso vive en repositorios / middleware (E0+).
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Abre el pool de conexiones hacia PostgreSQL.
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /**
   * Cierra conexiones al apagar Nest.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
