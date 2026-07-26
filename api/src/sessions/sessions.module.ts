import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { RecurrenceRulesController } from './recurrence-rules.controller';
import { RecurrenceRulesService } from './recurrence-rules.service';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SuperRecurrenceRulesController } from './super-recurrence-rules.controller';
import { SuperSessionsController } from './super-sessions.controller';

/**
 * Sesiones puntuales y recurrencia semanal (E4 / CU-SER-003..004).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule],
  controllers: [
    SessionsController,
    SuperSessionsController,
    RecurrenceRulesController,
    SuperRecurrenceRulesController,
  ],
  providers: [SessionsService, RecurrenceRulesService],
  exports: [SessionsService, RecurrenceRulesService],
})
export class SessionsModule {}
