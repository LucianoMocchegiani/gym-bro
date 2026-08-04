import { SessionStatus } from '@prisma/client';
import {
  Equals,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { ListQueryDto } from '../../common/list';

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

/**
 * Ampliar cupo de una sesión (CU-SER-005 / RN-SER-010).
 *
 * @remarks Solo permite subir `capacity` por encima del valor actual.
 * Bajar cupo (si ≥ bookedCount) sigue en {@link UpdateSessionDto}.
 */
export class ExpandSessionCapacityDto {
  @IsInt()
  @Min(1)
  capacity!: number;
}

/**
 * Query de listado de sesiones (CU-SER-003).
 *
 * @remarks Default histórico: `orderBy=startsAt`, `order=asc` (próximas
 * primero). `orderBy` acepta `startsAt` y `createdAt`.
 */
export class ListSessionsQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @IsUUID('4')
  serviceId?: string;

  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}
