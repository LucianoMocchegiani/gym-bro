import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { NotificationEventCode } from '@prisma/client';

export class UpdateNotificationPreferenceDto {
  @IsEnum(NotificationEventCode)
  eventCode!: NotificationEventCode;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  emailEnabled!: boolean;
}

/**
 * Alta/edición de plantilla staff (CU-NOT-002).
 *
 * @remarks `active: false` corta in-app y email (RN-NOT-003).
 */
export class UpsertNotificationTemplateDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  active!: boolean;
}
