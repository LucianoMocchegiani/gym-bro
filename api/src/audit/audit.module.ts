import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
/**
 * EventoAuditoria: escritura desde servicios + GET Staff.
 */
@Module({
  imports: [AuthModule, forwardRef(() => RolesModule)],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
