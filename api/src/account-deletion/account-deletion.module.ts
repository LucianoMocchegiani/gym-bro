import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DebitModule } from '../debit/debit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { AccountDeletionController } from './account-deletion.controller';
import { AccountDeletionService } from './account-deletion.service';

/** Eliminar cuenta Faciliter (app y web del apex). */
@Module({
  imports: [
    AuthModule,
    AuditModule,
    DebitModule,
    ReservationsModule,
    NotificationsModule,
  ],
  controllers: [AccountDeletionController],
  providers: [AccountDeletionService],
})
export class AccountDeletionModule {}
