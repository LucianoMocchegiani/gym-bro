import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SuperSessionsController } from './super-sessions.controller';

/**
 * Sesiones puntuales de calendario (E4 / CU-SER-003).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule],
  controllers: [SessionsController, SuperSessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
