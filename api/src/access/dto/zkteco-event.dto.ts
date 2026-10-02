import {
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/** Número de usuario de un aparato de puerta (PIN / User ID). */
export const ACCESS_EXTERNAL_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

/**
 * Evento de un aparato ZKTeco: "el usuario X se identificó en el torno".
 *
 * @remarks Lo envía el puente del gym (fuera de Nest). La huella o tarjeta nunca
 * llega: solo el número de usuario. Idempotencia por serie + usuario + hora.
 */
export class ZktecoEventDto {
  /** Número de usuario en el aparato (PIN). */
  @IsString()
  @Matches(ACCESS_EXTERNAL_ID_PATTERN, {
    message: 'userId: 1 a 32 letras, números, guion o guion bajo',
  })
  userId!: string;

  /** Hora del evento según el aparato (ISO 8601). */
  @IsISO8601()
  occurredAt!: string;

  /** Número de serie del aparato. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  deviceSerial?: string;
}
