import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { SuperCashRegisterController } from './super-cash-register.controller';

/**
 * Caja del día, movimientos CASH y arqueo (E5).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule],
  controllers: [CashRegisterController, SuperCashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
