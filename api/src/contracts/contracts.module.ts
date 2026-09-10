import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { KuatiaModule } from '../kuatia/kuatia.module';
import { RolesModule } from '../roles/roles.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

/**
 * Contrataciones (CU-CON-001).
 *
 * @remarks
 * El pago CASH se confirma en Caja. STUB ya no crea cobros.
 * MP se confirma vía webhook → WebhookPaymentService → ContractsService.confirmFromApprovedPayment.
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule, KuatiaModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
