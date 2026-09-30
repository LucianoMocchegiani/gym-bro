import { Body, Controller, Get, Param, ParseEnumPipe, Patch } from '@nestjs/common';
import { NotificationEventCode } from '@prisma/client';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { UpsertNotificationTemplateDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';
import type { NotificationTemplateDetail } from './notifications.types';

/**
 * Plantillas de aviso del gym (CU-NOT-002).
 *
 * @remarks Lectura `tenant.settings.read`; escritura `tenant.settings.write`.
 * RN-NOT-003 (activo) y RN-NOT-007 (texto editable).
 */
@Controller('notification-templates')
@RequireTenantAuth()
export class NotificationTemplatesController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @RequirePermission('tenant.settings.read')
  list(
    @CurrentTenant() tenantId: string,
  ): Promise<NotificationTemplateDetail[]> {
    return this.notifications.listTemplates(tenantId);
  }

  @Patch(':eventCode')
  @RequirePermission('tenant.settings.write')
  upsert(
    @CurrentTenant() tenantId: string,
    @Param('eventCode', new ParseEnumPipe(NotificationEventCode))
    eventCode: NotificationEventCode,
    @Body() dto: UpsertNotificationTemplateDto,
  ): Promise<NotificationTemplateDetail> {
    return this.notifications.upsertTemplate(tenantId, eventCode, {
      subject: dto.subject,
      body: dto.body,
      active: dto.active,
    });
  }
}
