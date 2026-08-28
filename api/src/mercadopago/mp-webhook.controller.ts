import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { MpWebhookProcessResult } from './mp-checkout.types';
import { MpWebhookService } from './mp-webhook.service';

/**
 * Webhooks Mercado Pago (público).
 *
 * @remarks CU-PAG-001. Sin JWT. `tenantId` en query (notification_url de Preference).
 */
@Controller('webhooks/mercadopago')
export class MpWebhookController {
  constructor(private readonly webhooks: MpWebhookService) {}

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
    return this.webhooks.handleNotification(tenantId, body ?? {}, {
      topic,
      id,
    });
  }
}
