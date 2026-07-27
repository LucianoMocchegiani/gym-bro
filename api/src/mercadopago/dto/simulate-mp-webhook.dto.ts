import { IsIn, IsUUID } from 'class-validator';

/**
 * Simula resultado de cobro MP en modo stub (solo non-prod).
 */
export class SimulateMpWebhookDto {
  @IsUUID()
  paymentId!: string;

  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';
}
