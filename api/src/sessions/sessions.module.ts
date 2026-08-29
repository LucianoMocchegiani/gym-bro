import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { TenantSettingsModule } from '../tenant-settings/tenant-settings.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { RecurrenceRulesController } from './recurrence-rules.controller';
import { RecurrenceRulesService } from './recurrence-rules.service';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionValidationService } from './session-validation.service';
import { SuperRecurrenceRulesController } from './super-recurrence-rules.controller';
import { SuperSessionsController } from './super-sessions.controller';

/**
 * Sesiones puntuales y recurrencia semanal (E4 / CU-SER-003..004).
 */
@Module({
  imports: [AuthModule, RolesModule, AuditModule, WaitlistModule, TenantSettingsModule],
  controllers: [
    SessionsController,
    SuperSessionsController,
    RecurrenceRulesController,
    SuperRecurrenceRulesController,
  ],
  providers: [SessionsService, RecurrenceRulesService, SessionValidationService],
  exports: [SessionsService, RecurrenceRulesService, SessionValidationService],
})
export class SessionsModule {}
