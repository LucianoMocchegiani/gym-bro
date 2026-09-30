import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ExpirationNotifyJob } from './expiration-notify.job';
import { ExpirationsController } from './expirations.controller';
import { ExpirationsService } from './expirations.service';

/**
 * Cola operativa de vencimientos (Admin `/vencimientos`) + cron N1 E2/E3.
 */
@Module({
  imports: [AuthModule, RolesModule, NotificationsModule],
  controllers: [ExpirationsController],
  providers: [ExpirationsService, ExpirationNotifyJob],
})
export class ExpirationsModule {}
