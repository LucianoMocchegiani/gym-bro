import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { SuperStaffController } from './super-staff.controller';

/**
 * Staff del gym (Staff JWT) + listado Super para impersonate.
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule],
  controllers: [StaffController, SuperStaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
