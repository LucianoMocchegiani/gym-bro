import { IsOptional, IsUUID } from 'class-validator';

/**
 * Alta de reserva con crédito (CU-RES-001 / CU-RES-002).
 *
 * @remarks `contractId` opcional: si falta, el sistema elige el saldo que vence antes.
 */
export class CreateReservationDto {
  @IsUUID('4')
  sessionId!: string;

  @IsOptional()
  @IsUUID('4')
  contractId?: string;
}
