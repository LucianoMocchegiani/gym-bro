import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { FileStorageModule } from '../file-storage/file-storage.module';
import { RolesModule } from '../roles/roles.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

/**
 * Gastos del local: etiquetas por gym, asientos y comprobantes en R2.
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule, FileStorageModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
