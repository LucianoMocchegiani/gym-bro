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
import { ListQueryDto, ListResult } from '../common/list';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CreateContractDto, UpdateContractStatusDto } from './dto/contract.dto';
import { ContractsService } from './contracts.service';
import { ContractDetail } from './contracts.types';

/**
 * Contrataciones del gym (staff) y lectura propia (afiliado).
 *
 * @remarks CU-CON-001 / CU-CON-002 / RN-SER-009.
 * Create/cancel: `members.write`. List/get staff: `members.read`.
 */
@Controller()
@RequireTenantAuth()
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  /**
   * Contrata un pack para un afiliado (pago stub/caja aprobado).
   */
  @Post('members/:memberId/contracts')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('members.write')
  createForMember(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: CreateContractDto,
  ): Promise<ContractDetail> {
    return this.contractsService.createForMember(
      tenantId,
      memberId,
      dto,
      toAuditActor(user),
    );
  }

  @Get('members/:memberId/contracts')
  @RequirePermission('members.read')
  listByMember(
    @CurrentTenant() tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Query() query: ListQueryDto,
  ): Promise<ListResult<ContractDetail>> {
    return this.contractsService.listByMember(tenantId, memberId, query);
  }

  @Get('contracts/:contractId')
  @RequirePermission('members.read')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('contractId', ParseUUIDPipe) contractId: string,
  ): Promise<ContractDetail> {
    return this.contractsService.findOne(tenantId, contractId);
  }

  /**
   * Cancela contratación ACTIVE (pierde acceso libre y créditos).
   */
  @Patch('contracts/:contractId/status')
  @RequirePermission('members.write')
  updateStatus(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @Body() dto: UpdateContractStatusDto,
  ): Promise<ContractDetail> {
    return this.contractsService.updateStatus(
      tenantId,
      contractId,
      dto,
      toAuditActor(user),
    );
  }

  /**
   * Mis contrataciones (JWT member).
   */
  @Get('me/contracts')
  listMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: ListQueryDto,
  ): Promise<ListResult<ContractDetail>> {
    if (user.profileType !== 'MEMBER') {
      throw new ForbiddenException('Member profile required');
    }
    return this.contractsService.listByMember(tenantId, user.userId, query);
  }
}
