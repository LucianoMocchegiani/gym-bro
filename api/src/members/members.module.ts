import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ContractsModule } from '../contracts/contracts.module';
import { RolesModule } from '../roles/roles.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

/**
 * Afiliados: alta, ficha, status, estado de cuenta (E2).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule, ContractsModule],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
