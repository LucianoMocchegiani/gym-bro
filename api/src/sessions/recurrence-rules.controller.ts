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
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { ListResult } from '../common/list';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import {
  CreateRecurrenceRuleDto,
  DeactivateRecurrenceRuleDto,
  ListRecurrenceRulesQueryDto,
} from './dto/recurrence-rule.dto';
import { RecurrenceRulesService } from './recurrence-rules.service';
import { RecurrenceRuleDetail } from './recurrence-rules.types';

/**
 * Reglas semanales de sesiones para staff.
 *
 * @remarks CU-SER-004. Lectura y mutación requieren `sessions.write`.
 * `@RequirePermission` va en cada método (después de JWT/tenant), no a nivel clase.
 */
@Controller('session-recurrence-rules')
@RequireTenantAuth()
export class RecurrenceRulesController {
  constructor(private readonly recurrenceRules: RecurrenceRulesService) {}

  @Get()
  @RequirePermission('sessions.write')
  list(
    @CurrentTenant() tenantId: string,
    @Query() query: ListRecurrenceRulesQueryDto,
  ): Promise<ListResult<RecurrenceRuleDetail>> {
    return this.recurrenceRules.list(tenantId, query);
  }

  @Get(':ruleId')
  @RequirePermission('sessions.write')
  findOne(
    @CurrentTenant() tenantId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ): Promise<RecurrenceRuleDetail> {
    return this.recurrenceRules.findOne(tenantId, ruleId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('sessions.write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRecurrenceRuleDto,
  ): Promise<RecurrenceRuleDetail> {
    return this.recurrenceRules.create(tenantId, dto, toAuditActor(user));
  }

  @Patch(':ruleId/status')
  @RequirePermission('sessions.write')
  deactivate(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: DeactivateRecurrenceRuleDto,
  ): Promise<RecurrenceRuleDetail> {
    return this.recurrenceRules.deactivate(
      tenantId,
      ruleId,
      dto,
      toAuditActor(user),
    );
  }
}
