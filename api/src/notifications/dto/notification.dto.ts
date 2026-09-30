import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class UpdateNotificationPreferenceDto {
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  emailEnabled!: boolean;
}
