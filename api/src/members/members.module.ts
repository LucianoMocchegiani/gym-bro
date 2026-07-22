import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { SuperMembersController } from './super-members.controller';

/**
 * Afiliados: alta, ficha, status y listado (E2).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule],
  controllers: [MembersController, SuperMembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
