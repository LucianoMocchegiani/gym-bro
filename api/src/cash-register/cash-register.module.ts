import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { SuperCashRegisterController } from './super-cash-register.controller';

/**
 * Caja del día y movimientos CASH (E5 parcial).
 */
@Module({
  imports: [AuthModule, RolesModule],
  controllers: [CashRegisterController, SuperCashRegisterController],
  providers: [CashRegisterService],
  exports: [CashRegisterService],
})
export class CashRegisterModule {}
