import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DebitService } from './debit.service';

/**
 * Cobra mandatos con vencimiento hoy (timezone BA), una vez por hora.
 *
 * @remarks RN-PAG-015. Un intento por día: el fallo corre `nextChargeOn` +1.
 */
@Injectable()
export class DebitJobService {
  private readonly logger = new Logger(DebitJobService.name);

  constructor(private readonly debit: DebitService) {}

  @Cron('20 * * * *', { timeZone: 'America/Argentina/Buenos_Aires' })
  async runDueCharges(): Promise<void> {
    const result = await this.debit.chargeDue();
    if (result.attempted === 0) {
      return;
    }
    this.logger.log(
      `debit job attempted=${result.attempted} ok=${result.ok} failed=${result.failed}`,
    );
  }
}
