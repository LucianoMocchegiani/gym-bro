import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Expone {@link PrismaService} de forma global para módulos de dominio.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
