import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

/**
 * Actualización parcial de configuración del gym.
 *
 * @remarks RN-TEN-004/005/006/007 / RN-RES-006.
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

  /** Días de atraso de deuda con ingreso aún permitido (RN-TEN-004). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  debtToleranceDays?: number;

  /** Permitir más de un ingreso ALLOWED por día (RN-TEN-007). */
  @IsOptional()
  @IsBoolean()
  multiEntryEnabled?: boolean;

  /** Tope diario cuando multi-ingreso está habilitado. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  multiEntryMaxPerDay?: number;

  /** Sistema de puerta: QR con la app (Kuatia) o aparato ZKTeco (RN-ACC-010). */
  @IsOptional()
  @IsIn(['KUATIA', 'ZKTECO'])
  accessProvider?: 'KUATIA' | 'ZKTECO';

  /** Descuento por defecto en Caja al cobrar en efectivo, en % (RN-PAG-020). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99)
  cashDiscountPercent?: number;

  /** Descuento por defecto en Caja al cobrar por transferencia, en %. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99)
  transferDiscountPercent?: number;
}
