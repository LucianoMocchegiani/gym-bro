import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  ParseEnumPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { AccessAttemptResult } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { AccessVerifyService } from './access-verify.service';
import { VerifyAccessDto } from './dto/verify-access.dto';
import { AccessAttemptDetail, AccessVerifyResult } from './access.types';

/**
 * Verificación de ingreso e historial (CU-ACC-001 / CU-ACC-005).
 *
 * @remarks Staff con `access.verify`. Pase manual fuera de este slice.
 */
@Controller()
@RequireTenantAuth()
export class AccessVerifyController {
  constructor(private readonly accessVerify: AccessVerifyService) {}

  /**
   * Evalúa presentación QR/credencial y registra el intento.
   */
  @Post('access/verify')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('access.verify')
  verify(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifyAccessDto,
  ): Promise<AccessVerifyResult> {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    return this.accessVerify.verify(tenantId, dto, user.userId);
  }

  /**
   * Lista intentos del gym (más recientes primero).
   */
  @Get('access-attempts')
  @RequirePermission('access.verify')
  list(
    @CurrentTenant() tenantId: string,
    @Query('memberId', new ParseUUIDPipe({ optional: true }))
    memberId?: string,
    @Query(
      'result',
      new ParseEnumPipe(AccessAttemptResult, { optional: true }),
    )
    result?: AccessAttemptResult,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<AccessAttemptDetail[]> {
    return this.accessVerify.listAttempts(tenantId, {
      memberId,
      result,
      limit,
    });
  }
}
