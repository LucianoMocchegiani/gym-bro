import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListResult } from '../common/list';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { AccessOid4VpService } from './access-oid4vp.service';
import { AccessVerifyService } from './access-verify.service';
import { ListAccessAttemptsQueryDto } from './dto/list-access-attempts.dto';
import { ManualPassDto } from './dto/manual-pass.dto';
import {
  AccessAttemptDetail,
  AccessOid4VpRequestResult,
  AccessOid4VpSessionResult,
  AccessVerifyResult,
} from './access.types';

/**
 * Puerta OID4VP, pase manual e historial (CU-ACC-001 / 004 / 005).
 */
@Controller()
@RequireTenantAuth()
export class AccessVerifyController {
  constructor(
    private readonly accessVerify: AccessVerifyService,
    private readonly oid4vp: AccessOid4VpService,
  ) {}

  /**
   * Crea un request OID4VP (QR de puerta, modo afiliado escanea).
   *
   * @remarks CU-ACC-001 / RN-ACC-003. El QR es `requestUri`.
   */
  @Post('access/oid4vp/request')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('access.verify')
  createOid4VpRequest(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AccessOid4VpRequestResult> {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    return this.oid4vp.createRequest(tenantId);
  }

  /**
   * Poll de sesión OID4VP; al completar evalúa ingreso (idempotente).
   */
  @Get('access/oid4vp/session/:verificationSessionId')
  @RequirePermission('access.verify')
  getOid4VpSession(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('verificationSessionId') verificationSessionId: string,
  ): Promise<AccessOid4VpSessionResult> {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    return this.oid4vp.getSession(
      tenantId,
      verificationSessionId,
      user.userId,
    );
  }

  /**
   * Pase manual: ingreso permitido pese a reglas automáticas (RN-ACC-006).
   */
  @Post('members/:memberId/access/manual-pass')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('access.manual_pass')
  manualPass(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: ManualPassDto,
  ): Promise<AccessVerifyResult> {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    return this.accessVerify.manualPass(tenantId, memberId, dto, user.userId);
  }

  /**
   * Lista intentos del gym (paginado; más recientes primero por defecto).
   *
   * @remarks Incluye nombre/email del afiliado. `from`/`to` = YYYY-MM-DD (BA).
   */
  @Get('access-attempts')
  @RequirePermission('access.verify')
  list(
    @CurrentTenant() tenantId: string,
    @Query() query: ListAccessAttemptsQueryDto,
  ): Promise<ListResult<AccessAttemptDetail>> {
    return this.accessVerify.listAttempts(tenantId, query);
  }
}
