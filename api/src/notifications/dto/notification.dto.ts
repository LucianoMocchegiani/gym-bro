import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum } from 'class-validator';
import { NotificationEventCode } from '@prisma/client';

export class UpdateNotificationPreferenceDto {
  @IsEnum(NotificationEventCode)
  eventCode!: NotificationEventCode;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  emailEnabled!: boolean;
}
