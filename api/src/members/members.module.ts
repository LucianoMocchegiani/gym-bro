import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ContractsModule } from '../contracts/contracts.module';
import { PaymentModule } from '../payment/payment.module';
import { RolesModule } from '../roles/roles.module';
import { UploadModule } from '../upload/upload.module';
import { IdentityMembersController } from './identity-members.controller';
import { MemberSignupService } from './member-signup.service';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

/**
 * Afiliados: alta (staff o web con pago previo), ficha, status, estado de cuenta (E2).
 */
@Module({
  imports: [
    AuthModule,
    RolesModule,
    AuditModule,
    ContractsModule,
    UploadModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [MembersController, IdentityMembersController],
  providers: [MembersService, MemberSignupService],
  exports: [MembersService, MemberSignupService],
})
export class MembersModule {}
