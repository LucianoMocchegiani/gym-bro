import { SessionStatus } from '@prisma/client';
import {
  Equals,
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';

/**
 * Alta de sesión puntual publicada (CU-SER-003).
 */
export class CreateSessionDto {
  @IsUUID('4')
  serviceId!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsOptional()
  @IsUUID('4')
  instructorId?: string;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;
}

/**
 * Edición / cancelación de sesión.
 *
 * @remarks `status` solo acepta `CANCELLED` en esta entrega.
 * No se puede bajar `capacity` por debajo de `bookedCount`.
 */
export class UpdateSessionDto {
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  instructorId?: string | null;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @IsOptional()
  @Equals(SessionStatus.CANCELLED)
  status?: 'CANCELLED';
}
