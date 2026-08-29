import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { WebhookPaymentService } from './webhook-payment.service';
import { MpWebhookProcessResult } from './payment.types';

/**
 * Webhooks de pago (Mercado Pago).
 *
 * @remarks Sin JWT. `tenantId` en query (notification_url de Preference).
 */
@Controller('webhooks/payment')
export class PaymentWebhookController {
  constructor(private readonly webhookPayment: WebhookPaymentService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  handle(
    @Query('tenantId', ParseUUIDPipe) tenantId: string,
    @Query('topic') topic: string | undefined,
    @Query('id') id: string | undefined,
    @Body()
    body: {
      type?: string;
      action?: string;
      data?: { id?: string | number };
      topic?: string;
      id?: string | number;
    },
  ): Promise<MpWebhookProcessResult> {
    return this.webhookPayment.handleNotification(tenantId, body ?? {}, {
      topic,
      id,
    });
  }
}
