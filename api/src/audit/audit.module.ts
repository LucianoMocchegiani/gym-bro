import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { SuperAuditController } from './super-audit.controller';

/**
 * EventoAuditoria: escritura desde servicios + GET Super/Staff.
 */
@Module({
  imports: [AuthModule, forwardRef(() => RolesModule)],
  controllers: [AuditController, SuperAuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
