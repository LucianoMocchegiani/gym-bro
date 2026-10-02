import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { AccessIdentityLinksService } from './access-identity-links.service';
import { AccessZktecoService } from './access-zkteco.service';
import {
  AccessDoorConfig,
  AccessIdentityLinkDetail,
  ZktecoEventResult,
} from './access.types';
import { CreateAccessLinkDto } from './dto/create-access-link.dto';
import { ZktecoEventDto } from './dto/zkteco-event.dto';

/**
 * Puerta ZKTeco: eventos del aparato y vínculos número → socio/staff.
 *
 * @remarks RN-ACC-010 / RN-ACC-011. En este corte el puente del gym se
 * autentica como staff con `access.verify` (token de dispositivo: después).
 */
@Controller()
@RequireTenantAuth()
export class AccessZktecoController {
  constructor(
    private readonly zkteco: AccessZktecoService,
    private readonly links: AccessIdentityLinksService,
  ) {}

  /**
   * Sistema de puerta del gym (KUATIA | ZKTECO) para armar `/puerta` y fichas.
   *
   * @remarks Sin `tenant.settings.read`: el staff de puerta tiene que poder
   * leerlo aunque no administre la config.
   * @throws {ForbiddenException} Perfil no staff.
   */
  @Get('access/door')
  getDoor(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AccessDoorConfig> {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    return this.zkteco.getDoorConfig(tenantId);
  }

  /**
   * Evento "el usuario X se identificó en el torno" → allow/deny + abrir.
   *
   * @remarks Idempotente por serie + usuario + hora: un evento repetido devuelve
   * el mismo resultado con `duplicate=true` y `open=false`.
   * @throws {ConflictException} Si el gym no usa ZKTeco.
   */
  @Post('access/zkteco/events')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('access.verify')
  handleEvent(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ZktecoEventDto,
  ): Promise<ZktecoEventResult> {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    return this.zkteco.handleEvent(tenantId, dto, user.userId);
  }

  @Get('members/:memberId/access-links')
  @RequirePermission('members.read')
  listMemberLinks(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<AccessIdentityLinkDetail[]> {
    return this.links.list(tenantId, { kind: 'member', memberId });
  }

  @Post('members/:memberId/access-links')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('members.write')
  createMemberLink(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: CreateAccessLinkDto,
  ): Promise<AccessIdentityLinkDetail> {
    return this.links.create(
      tenantId,
      { kind: 'member', memberId },
      dto.externalId,
      toAuditActor(user),
    );
  }

  @Delete('members/:memberId/access-links/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('members.write')
  removeMemberLink(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ): Promise<void> {
    return this.links.remove(
      tenantId,
      { kind: 'member', memberId },
      linkId,
      toAuditActor(user),
    );
  }

  @Get('staff/:staffId/access-links')
  @RequirePermission('staff.read')
  listStaffLinks(
    @CurrentTenant() tenantId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ): Promise<AccessIdentityLinkDetail[]> {
    return this.links.list(tenantId, { kind: 'staff', staffUserId: staffId });
  }

  @Post('staff/:staffId/access-links')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('staff.write')
  createStaffLink(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() dto: CreateAccessLinkDto,
  ): Promise<AccessIdentityLinkDetail> {
    return this.links.create(
      tenantId,
      { kind: 'staff', staffUserId: staffId },
      dto.externalId,
      toAuditActor(user),
    );
  }

  @Delete('staff/:staffId/access-links/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('staff.write')
  removeStaffLink(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ): Promise<void> {
    return this.links.remove(
      tenantId,
      { kind: 'staff', staffUserId: staffId },
      linkId,
      toAuditActor(user),
    );
  }
}
