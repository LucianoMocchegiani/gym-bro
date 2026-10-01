import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import type { ListResult } from '../common/list';
import { FOLDER_MAX_FILE_BYTES } from '../folder/folder.constants';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import {
  CreateExpenseDto,
  CreateExpenseLabelDto,
  ExpensesSummaryQueryDto,
  ListExpenseLabelsQueryDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
  UpdateExpenseLabelDto,
} from './dto/expense.dto';
import { ExpensesService } from './expenses.service';
import type {
  ExpenseDetail,
  ExpenseFileDetail,
  ExpenseLabelDetail,
  ExpensesSummary,
} from './expenses.types';

type MulterFile = {
  mimetype: string;
  size: number;
  buffer: Buffer;
  originalname: string;
};

/**
 * Gastos del local (Admin → Gastos).
 *
 * @remarks RN-GAS-001..006. Lectura `expenses.read`, cambios `expenses.write`.
 */
@Controller()
@RequireTenantAuth()
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get('expense-labels')
  @RequirePermission('expenses.read')
  listLabels(
    @CurrentTenant() tenantId: string,
    @Query() query: ListExpenseLabelsQueryDto,
  ): Promise<ExpenseLabelDetail[]> {
    return this.expenses.listLabels(tenantId, query.includeArchived === 'true');
  }

  @Post('expense-labels')
  @RequirePermission('expenses.write')
  createLabel(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateExpenseLabelDto,
  ): Promise<ExpenseLabelDetail> {
    return this.expenses.createLabel(tenantId, dto.name);
  }

  @Patch('expense-labels/:labelId')
  @RequirePermission('expenses.write')
  updateLabel(
    @CurrentTenant() tenantId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
    @Body() dto: UpdateExpenseLabelDto,
  ): Promise<ExpenseLabelDetail> {
    return this.expenses.updateLabel(tenantId, labelId, dto);
  }

  @Delete('expense-labels/:labelId')
  @RequirePermission('expenses.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteLabel(
    @CurrentTenant() tenantId: string,
    @Param('labelId', ParseUUIDPipe) labelId: string,
  ): Promise<void> {
    return this.expenses.deleteLabel(tenantId, labelId);
  }

  @Get('expenses/summary')
  @RequirePermission('expenses.read')
  summary(
    @CurrentTenant() tenantId: string,
    @Query() query: ExpensesSummaryQueryDto,
  ): Promise<ExpensesSummary> {
    return this.expenses.summary(tenantId, query.from, query.to);
  }

  @Get('expenses')
  @RequirePermission('expenses.read')
  list(
    @CurrentTenant() tenantId: string,
    @Query() query: ListExpensesQueryDto,
  ): Promise<ListResult<ExpenseDetail>> {
    return this.expenses.list(tenantId, query);
  }

  @Get('expenses/:expenseId')
  @RequirePermission('expenses.read')
  get(
    @CurrentTenant() tenantId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ): Promise<ExpenseDetail> {
    return this.expenses.get(tenantId, expenseId);
  }

  @Post('expenses')
  @RequirePermission('expenses.write')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateExpenseDto,
  ): Promise<ExpenseDetail> {
    return this.expenses.create(tenantId, dto, toAuditActor(user));
  }

  @Patch('expenses/:expenseId')
  @RequirePermission('expenses.write')
  update(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseDetail> {
    return this.expenses.update(tenantId, expenseId, dto, toAuditActor(user));
  }

  @Delete('expenses/:expenseId')
  @RequirePermission('expenses.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ): Promise<void> {
    return this.expenses.delete(tenantId, expenseId, toAuditActor(user));
  }

  @Post('expenses/:expenseId/files')
  @RequirePermission('expenses.write')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: FOLDER_MAX_FILE_BYTES } }),
  )
  addFile(
    @CurrentTenant() tenantId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @UploadedFile() file: MulterFile | undefined,
  ): Promise<ExpenseFileDetail> {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo.');
    }
    return this.expenses.addFile(tenantId, expenseId, file);
  }

  @Delete('expenses/:expenseId/files/:fileId')
  @RequirePermission('expenses.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteFile(
    @CurrentTenant() tenantId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ): Promise<void> {
    return this.expenses.deleteFile(tenantId, expenseId, fileId);
  }

  @Get('expenses/:expenseId/files/:fileId')
  @RequirePermission('expenses.read')
  async downloadFile(
    @CurrentTenant() tenantId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ): Promise<StreamableFile> {
    const file = await this.expenses.getFileBytes(tenantId, expenseId, fileId);
    const encoded = encodeURIComponent(file.filename);
    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename*=UTF-8''${encoded}`,
    });
  }
}
