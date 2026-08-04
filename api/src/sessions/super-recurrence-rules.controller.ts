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
import { RequireSuperAuth } from '../auth/decorators/require-super-auth.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { ListResult } from '../common/list';
import {
  CreateRecurrenceRuleDto,
  DeactivateRecurrenceRuleDto,
  ListRecurrenceRulesQueryDto,
} from './dto/recurrence-rule.dto';
import { RecurrenceRulesService } from './recurrence-rules.service';
import { RecurrenceRuleDetail } from './recurrence-rules.types';

/**
 * Reglas semanales de sesiones por tenant para Super Admin.
 */
@Controller('tenants/:tenantId/session-recurrence-rules')
@RequireSuperAuth()
export class SuperRecurrenceRulesController {
  constructor(private readonly recurrenceRules: RecurrenceRulesService) {}

  @Get()
  list(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query() query: ListRecurrenceRulesQueryDto,
  ): Promise<ListResult<RecurrenceRuleDetail>> {
    return this.recurrenceRules.list(tenantId, query);
  }

  @Get(':ruleId')
  findOne(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ): Promise<RecurrenceRuleDetail> {
    return this.recurrenceRules.findOne(tenantId, ruleId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRecurrenceRuleDto,
  ): Promise<RecurrenceRuleDetail> {
    return this.recurrenceRules.create(tenantId, dto, toAuditActor(user));
  }

  @Patch(':ruleId/status')
  deactivate(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @CurrentUser() user: AuthUser,
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
