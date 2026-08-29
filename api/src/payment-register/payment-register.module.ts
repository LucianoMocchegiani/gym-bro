import { Module } from '@nestjs/common';
import { PaymentRegisterController } from './payment-register.controller';
import { PaymentRegisterService } from './register.service';
import { AuditModule } from '../audit/audit.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [AuditModule, RolesModule],
  controllers: [PaymentRegisterController],
  providers: [PaymentRegisterService],
  exports: [PaymentRegisterService],
})
export class PaymentRegisterModule {}
