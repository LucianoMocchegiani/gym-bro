import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
import { AccessCredentialsService } from './access-credentials.service';
import { AccessCredentialDetail } from './access.types';

/**
 * Credenciales de vínculo Member/Staff (E6 / RN-ACC-002).
 *
 * @remarks Sin `POST /access/verify` en este slice.
 */
@Controller()
@RequireTenantAuth()
export class AccessCredentialsController {
  constructor(private readonly access: AccessCredentialsService) {}

  /**
   * Credencial ACTIVE del afiliado autenticado.
   *
   * @throws {NotFoundException} Sin credencial ACTIVE.
   */
  @Get('me/access-credential')
  async getMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AccessCredentialDetail> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    const row = await this.access.getActiveForMember(tenantId, user.userId);
    if (!row) {
      throw new NotFoundException('No active access credential');
    }
    return row;
  }

  /**
   * Emite o reemite la credencial del afiliado autenticado.
   */
  @Post('me/access-credential/issue')
  @HttpCode(HttpStatus.CREATED)
  issueMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AccessCredentialDetail> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.access.issue(tenantId, user.userId, {
      profileType: 'MEMBER',
      userId: user.userId,
    });
  }

  @Get('members/:memberId/access-credentials')
  @RequirePermission('members.read')
  listForMember(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<AccessCredentialDetail[]> {
    return this.access.listForMember(tenantId, memberId);
  }

  @Post('members/:memberId/access-credentials/issue')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('members.write')
  issueForMember(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<AccessCredentialDetail> {
    return this.access.issue(tenantId, memberId, toAuditActor(user));
  }

  @Post('members/:memberId/access-credentials/revoke')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('members.write')
  revokeForMember(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<AccessCredentialDetail> {
    return this.access.revoke(tenantId, memberId, toAuditActor(user));
  }
}
