import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { WaitlistStatus } from '@prisma/client';
import { ListQueryDto } from '../../common/list';

function toBoolean({ value }: { value: unknown }): unknown {
  if (value === true || value === 'true' || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === '0') {
    return false;
  }
  return value;
}

/**
 * Alta en lista de espera (CU-RES-004).
 */
export class JoinWaitlistDto {
  @IsUUID('4')
  sessionId!: string;
}

/**
 * Salir de la cola (solo LEFT).
 */
export class LeaveWaitlistDto {
  @Equals('LEFT')
  status!: 'LEFT';
}

/**
 * Query de listado de espera (CU-RES-004).
 *
 * @remarks Sin `q`. Por sesión: FIFO `createdAt` asc.
 * Sin `status` ni `allStatuses` → solo `WAITING` (contrato histórico).
 * `allStatuses=true` → ignora `status` y lista todas.
 */
export class ListWaitlistQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @IsEnum(WaitlistStatus)
  status?: WaitlistStatus;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  allStatuses?: boolean;
}
