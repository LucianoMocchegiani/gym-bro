import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Actualización parcial de configuración del gym (RN-TEN-005).
 */
export class UpdateTenantSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  reservationCancellationHours?: number;
}
