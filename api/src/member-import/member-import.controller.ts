import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { toAuditActor } from '../audit/to-audit-actor';
import { FOLDER_MAX_FILE_BYTES } from '../folder/folder.constants';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import {
  AccessCodeRowsDto,
  ImportRowsDto,
  MatchFilesDto,
  StartImportDto,
} from './dto/member-import.dto';
import { MemberImportAccessCodesService } from './member-import-access-codes.service';
import { MemberImportService } from './member-import.service';
import type {
  ImportFileMatch,
  ImportItemResult,
  ImportPreviewRow,
  MemberImportDetail,
} from './member-import.types';

type MulterFile = {
  mimetype: string;
  size: number;
  buffer: Buffer;
  originalname: string;
};

/**
 * Migración de afiliados (Admin → Afiliados → Importar).
 *
 * @remarks RN-MIG-001: `members.import` (peligroso) + `members.write`.
 * Prefijo propio para no chocar con `members/:memberId`.
 */
@Controller('member-imports')
@RequirePermission('members.import', 'members.write')
@RequireTenantAuth()
export class MemberImportController {
  constructor(
    private readonly imports: MemberImportService,
    private readonly accessCodes: MemberImportAccessCodesService,
  ) {}

  @Get()
  list(@CurrentTenant() tenantId: string): Promise<MemberImportDetail[]> {
    return this.imports.list(tenantId);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  preview(
    @CurrentTenant() tenantId: string,
    @Body() dto: ImportRowsDto,
  ): Promise<ImportPreviewRow[]> {
    return this.imports.preview(tenantId, dto.rows, dto.branchId);
  }

  @Post('match')
  @HttpCode(HttpStatus.OK)
  match(
    @CurrentTenant() tenantId: string,
    @Body() dto: MatchFilesDto,
  ): Promise<ImportFileMatch[]> {
    return this.imports.matchFiles(tenantId, dto.keys);
  }

  /** Vista previa de números del aparato (RN-MIG-006). 409 si el gym no es ZKTeco. */
  @Post('access-codes/preview')
  @HttpCode(HttpStatus.OK)
  previewAccessCodes(
    @CurrentTenant() tenantId: string,
    @Body() dto: AccessCodeRowsDto,
  ): Promise<ImportPreviewRow[]> {
    return this.accessCodes.preview(tenantId, dto.rows);
  }

  @Post()
  start(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: StartImportDto,
  ): Promise<MemberImportDetail> {
    return this.imports.start(tenantId, user, dto);
  }

  @Post(':importId/rows')
  @HttpCode(HttpStatus.OK)
  importRows(
    @CurrentTenant() tenantId: string,
    @Param('importId', ParseUUIDPipe) importId: string,
    @Body() dto: ImportRowsDto,
  ): Promise<ImportItemResult[]> {
    return this.imports.importRows(tenantId, importId, dto.rows, dto.branchId);
  }

  /** Vincula un lote de números dentro de una corrida `ACCESS_CODES`. */
  @Post(':importId/access-codes')
  @HttpCode(HttpStatus.OK)
  importAccessCodes(
    @CurrentTenant() tenantId: string,
    @Param('importId', ParseUUIDPipe) importId: string,
    @Body() dto: AccessCodeRowsDto,
  ): Promise<ImportItemResult[]> {
    return this.accessCodes.importRows(tenantId, importId, dto.rows);
  }

  @Post(':importId/members/:memberId/photo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: FOLDER_MAX_FILE_BYTES } }),
  )
  importPhoto(
    @CurrentTenant() tenantId: string,
    @Param('importId', ParseUUIDPipe) importId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @UploadedFile() file: MulterFile | undefined,
  ): Promise<ImportItemResult> {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo.');
    }
    return this.imports.importPhoto(tenantId, importId, memberId, file);
  }

  @Post(':importId/members/:memberId/folder')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: FOLDER_MAX_FILE_BYTES } }),
  )
  importFolderFile(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('importId', ParseUUIDPipe) importId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @UploadedFile() file: MulterFile | undefined,
  ): Promise<ImportItemResult> {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo.');
    }
    return this.imports.importFolderFile(
      tenantId,
      user,
      importId,
      memberId,
      file,
    );
  }

  @Post(':importId/finish')
  @HttpCode(HttpStatus.OK)
  finish(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('importId', ParseUUIDPipe) importId: string,
  ): Promise<MemberImportDetail> {
    return this.imports.finish(tenantId, importId, toAuditActor(user));
  }
}
