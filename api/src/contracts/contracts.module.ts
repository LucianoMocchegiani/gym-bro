import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CashRegisterModule } from '../cash-register/cash-register.module';
import { KuatiaModule } from '../kuatia/kuatia.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { RolesModule } from '../roles/roles.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { SuperContractsController } from './super-contracts.controller';

/**
 * Contrataciones + pagos stub/caja (CU-CON-001) + offer Quark soft-fail.
 */
@Module({
  imports: [
    AuthModule,
    RolesModule,
    AuditModule,
    CashRegisterModule,
    ReceiptsModule,
    KuatiaModule,
  ],
  controllers: [ContractsController, SuperContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
