import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { UpdateNotificationPreferenceDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';
import type {
  NotificationDetail,
  NotificationPreferenceDetail,
} from './notifications.types';

/**
 * Bandeja in-app del afiliado (CU-NOT-005) y opt-out de email (CU-NOT-003).
 */
@Controller()
@RequireTenantAuth()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('me/notifications')
  listMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<NotificationDetail[]> {
    this.assertMember(user);
    return this.notifications.listMine(tenantId, user.userId);
  }

  @Patch('me/notifications/:id/read')
  markRead(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationDetail> {
    this.assertMember(user);
    return this.notifications.markRead(tenantId, user.userId, id);
  }

  @Get('me/notification-preferences')
  getPref(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<NotificationPreferenceDetail> {
    this.assertMember(user);
    return this.notifications.getEmailPreference(tenantId, user.userId);
  }

  @Patch('me/notification-preferences')
  setPref(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceDetail> {
    this.assertMember(user);
    return this.notifications.setEmailPreference(
      tenantId,
      user.userId,
      dto.emailEnabled,
    );
  }

  private assertMember(user: AuthUser): void {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
  }
}
