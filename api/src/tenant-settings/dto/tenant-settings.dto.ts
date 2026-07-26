import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Actualización parcial de configuración del gym (RN-TEN-005 / RN-TEN-006).
 */
export class UpdateTenantSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  reservationCancellationHours?: number;

  @IsOptional()
  @IsIn(['AUTO_ASSIGN', 'MEMBER_CONFIRM', 'STAFF_CONFIRM'])
  waitlistMode?: 'AUTO_ASSIGN' | 'MEMBER_CONFIRM' | 'STAFF_CONFIRM';
}
