import { Equals, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ListQueryDto } from '../../common/list';

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
 * @remarks Sin `q`. Orden FIFO por `createdAt` asc (fijo).
 */
export class ListWaitlistQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'asc';
}
