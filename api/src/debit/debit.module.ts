import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentModule } from '../payment/payment.module';
import { RolesModule } from '../roles/roles.module';
import { DebitController } from './debit.controller';
import { DebitJobService } from './debit-job.service';
import { DebitService } from './debit.service';

/**
 * Débito automático MONTHLY (Caja + job).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule, PaymentModule],
  controllers: [DebitController],
  providers: [DebitService, DebitJobService],
  exports: [DebitService],
})
export class DebitModule {}
