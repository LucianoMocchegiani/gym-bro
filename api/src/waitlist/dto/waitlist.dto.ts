import { Equals, IsUUID } from 'class-validator';

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
