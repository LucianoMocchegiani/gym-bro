import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { CreateContractDto, UpdateContractStatusDto } from './dto/contract.dto';
import { ContractsService } from './contracts.service';
import { ContractDetail } from './contracts.types';

/**
 * Contrataciones por tenant (Super Admin).
 */
@Controller('tenants/:tenantId')
@RequireSuperAuth()
export class SuperContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post('members/:memberId/contracts')
  @HttpCode(HttpStatus.CREATED)
  createForMember(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
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
  listByMember(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<ContractDetail[]> {
    return this.contractsService.listByMember(tenantId, memberId);
  }

  @Get('contracts/:contractId')
  findOne(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('contractId', ParseUUIDPipe) contractId: string,
  ): Promise<ContractDetail> {
    return this.contractsService.findOne(tenantId, contractId);
  }

  @Patch('contracts/:contractId/status')
  updateStatus(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('contractId', ParseUUIDPipe) contractId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateContractStatusDto,
  ): Promise<ContractDetail> {
    return this.contractsService.updateStatus(
      tenantId,
      contractId,
      dto,
      toAuditActor(user),
    );
  }
}
