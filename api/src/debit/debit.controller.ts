import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { ListResult } from '../common/list';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { DebitService } from './debit.service';
import {
  DebitEnrollResult,
  DebitMandateDetail,
  MemberDebitView,
} from './debit.types';
import { EnrollDebitMandateDto } from './dto/enroll-debit-mandate.dto';
import { ListDebitMandatesDto } from './dto/list-debit-mandates.dto';
import { UpdateDebitMandateDto } from './dto/update-debit-mandate.dto';

/**
 * Débito automático MONTHLY — solo Caja (`cashier.operate`).
 *
 * @remarks CU-PAG-008..010 / RN-PAG-013..016.
 */
@Controller()
@RequireTenantAuth()
export class DebitController {
  constructor(private readonly debit: DebitService) {}

  @Get('debit-mandates')
  @RequirePermission('cashier.operate')
  list(
    @CurrentTenant() tenantId: string,
    @Query() query: ListDebitMandatesDto,
  ): Promise<ListResult<DebitMandateDetail>> {
    return this.debit.list(tenantId, query);
  }

  @Get('members/:memberId/debit-mandate')
  @RequirePermission('cashier.operate')
  getMemberView(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<MemberDebitView> {
    return this.debit.getMemberView(tenantId, memberId);
  }

  @Post('members/:memberId/debit-mandates')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('cashier.operate')
  enroll(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: EnrollDebitMandateDto,
  ): Promise<DebitEnrollResult> {
    if (user.profileType !== 'STAFF') {
      throw new ForbiddenException('Staff profile required');
    }
    return this.debit.enroll(
      tenantId,
      memberId,
      user.userId,
      toAuditActor(user),
      dto,
    );
  }

  @Post('debit-mandates/:mandateId/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('cashier.operate')
  cancel(
    @CurrentTenant() tenantId: string,
    @Param('mandateId', ParseUUIDPipe) mandateId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DebitMandateDetail> {
    return this.debit.cancel(tenantId, mandateId, toAuditActor(user));
  }

  @Patch('debit-mandates/:mandateId')
  @RequirePermission('cashier.operate')
  updatePack(
    @CurrentTenant() tenantId: string,
    @Param('mandateId', ParseUUIDPipe) mandateId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateDebitMandateDto,
  ): Promise<DebitMandateDetail> {
    return this.debit.updatePack(
      tenantId,
      mandateId,
      dto.packId,
      toAuditActor(user),
    );
  }

  @Post('debit-mandates/:mandateId/charge')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('cashier.operate')
  charge(
    @CurrentTenant() tenantId: string,
    @Param('mandateId', ParseUUIDPipe) mandateId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<DebitEnrollResult> {
    return this.debit.charge(
      tenantId,
      mandateId,
      toAuditActor(user),
      'staff',
    );
  }
}
