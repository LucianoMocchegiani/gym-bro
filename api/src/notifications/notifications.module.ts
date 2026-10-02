import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { MAIL_PORT } from './mail.port';
import { NotificationTemplatesController } from './notification-templates.controller';
import { NotificationsController } from './notifications.controller';
import {
  NotificationDispatcher,
  NotificationsService,
} from './notifications.service';
import { ResendMailAdapter } from './resend-mail.adapter';
import { StubMailAdapter } from './stub-mail.adapter';

/**
 * N1: dispatcher, bandeja socio, MailPort (stub | resend).
 */
@Module({
  imports: [AuthModule, RolesModule],
  controllers: [NotificationsController, NotificationTemplatesController],
  providers: [
    NotificationsService,
    NotificationDispatcher,
    {
      provide: MAIL_PORT,
      useFactory: (config: ConfigService) => {
        const driver = (config.get<string>('MAIL_DRIVER') ?? 'stub').toLowerCase();
        if (driver === 'resend') {
          return new ResendMailAdapter(config);
        }
        return new StubMailAdapter();
      },
      inject: [ConfigService],
    },
  ],
  exports: [NotificationDispatcher, MAIL_PORT],
})
export class NotificationsModule {}
