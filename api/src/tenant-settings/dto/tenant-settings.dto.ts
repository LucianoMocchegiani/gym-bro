import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Actualización parcial de configuración del gym (RN-TEN-005 / RN-TEN-006 / RN-RES-006).
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

  /** Permitir reserva/crédito entre `startsAt` y `endsAt` (CU-RES-006). */
  @IsOptional()
  @IsBoolean()
  allowLateSessionEntry?: boolean;
}
