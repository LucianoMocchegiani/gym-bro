import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../roles/decorators/require-permission.decorator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { CreateFolderLabelDto, CreateFolderNoteDto } from './dto/folder.dto';
import { FOLDER_MAX_FILE_BYTES } from './folder.constants';
import { FolderService } from './folder.service';
import type { FolderItemDetail, FolderLabelDetail } from './folder.types';

/**
 * Carpeta de notas/files de socios y staff.
 *
 * @remarks CU-FOL-001..003. `POST /upload` no aplica: esos files son públicos.
 */
@Controller()
@RequireTenantAuth()
export class FolderController {
  constructor(private readonly folder: FolderService) {}

  @Get('folder-labels')
  listLabels(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<FolderLabelDetail[]> {
    return this.folder.listLabels(tenantId, user);
  }

  @Post('folder-labels')
  createLabel(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFolderLabelDto,
  ): Promise<FolderLabelDetail> {
    return this.folder.createLabel(tenantId, user, dto.name);
  }

  @Get('me/folder')
  listMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<FolderItemDetail[]> {
    return this.folder.listMine(tenantId, user);
  }

  @Get('me/folder/:itemId/file')
  async downloadMine(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<StreamableFile> {
    const file = await this.folder.getFileBytes(tenantId, user, itemId, 'mine');
    return this.toStream(file);
  }

  @Get('members/:memberId/folder')
  @RequirePermission('members.read')
  listMember(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ): Promise<FolderItemDetail[]> {
    return this.folder.listMemberFolder(tenantId, user, memberId);
  }

  @Post('members/:memberId/folder/notes')
  @RequirePermission('members.write')
  createMemberNote(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: CreateFolderNoteDto,
  ): Promise<FolderItemDetail> {
    return this.folder.createNote(tenantId, user, { kind: 'member', id: memberId }, dto);
  }

  @Post('members/:memberId/folder/files')
  @RequirePermission('members.write')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: FOLDER_MAX_FILE_BYTES } }),
  )
  createMemberFile(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @UploadedFile()
    file:
      | {
          mimetype: string;
          size: number;
          buffer: Buffer;
          originalname: string;
        }
      | undefined,
    @Body() body: { title?: string; labelId?: string },
  ): Promise<FolderItemDetail> {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo.');
    }
    return this.folder.createFile(
      tenantId,
      user,
      { kind: 'member', id: memberId },
      file,
      { title: body.title, labelId: body.labelId },
    );
  }

  @Delete('members/:memberId/folder/:itemId')
  @RequirePermission('members.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMemberItem(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    return this.folder.deleteItem(tenantId, user, itemId, {
      kind: 'member',
      id: memberId,
    });
  }

  @Get('members/:memberId/folder/:itemId/file')
  @RequirePermission('members.read')
  async downloadMemberFile(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<StreamableFile> {
    const file = await this.folder.getFileBytes(
      tenantId,
      user,
      itemId,
      'staff',
      { kind: 'member', id: memberId },
    );
    return this.toStream(file);
  }

  @Get('staff/:staffId/folder')
  @RequirePermission('staff.read')
  listStaff(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ): Promise<FolderItemDetail[]> {
    return this.folder.listStaffFolder(tenantId, user, staffId);
  }

  @Post('staff/:staffId/folder/notes')
  @RequirePermission('staff.write')
  createStaffNote(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body() dto: CreateFolderNoteDto,
  ): Promise<FolderItemDetail> {
    return this.folder.createNote(tenantId, user, { kind: 'staff', id: staffId }, dto);
  }

  @Post('staff/:staffId/folder/files')
  @RequirePermission('staff.write')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: FOLDER_MAX_FILE_BYTES } }),
  )
  createStaffFile(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @UploadedFile()
    file:
      | {
          mimetype: string;
          size: number;
          buffer: Buffer;
          originalname: string;
        }
      | undefined,
    @Body() body: { title?: string; labelId?: string },
  ): Promise<FolderItemDetail> {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo.');
    }
    return this.folder.createFile(
      tenantId,
      user,
      { kind: 'staff', id: staffId },
      file,
      { title: body.title, labelId: body.labelId },
    );
  }

  @Delete('staff/:staffId/folder/:itemId')
  @RequirePermission('staff.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteStaffItem(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    return this.folder.deleteItem(tenantId, user, itemId, {
      kind: 'staff',
      id: staffId,
    });
  }

  @Get('staff/:staffId/folder/:itemId/file')
  @RequirePermission('staff.read')
  async downloadStaffFile(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthUser,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<StreamableFile> {
    const file = await this.folder.getFileBytes(
      tenantId,
      user,
      itemId,
      'staff',
      { kind: 'staff', id: staffId },
    );
    return this.toStream(file);
  }

  private toStream(file: {
    buffer: Buffer;
    contentType: string;
    filename: string;
  }): StreamableFile {
    const encoded = encodeURIComponent(file.filename);
    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename*=UTF-8''${encoded}`,
    });
  }
}
