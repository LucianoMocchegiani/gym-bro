import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { CurrentTenant } from '../tenant/decorators/current-tenant.decorator';
import { RequireTenantAuth } from '../tenant/decorators/require-tenant-auth.decorator';
import { UploadService, UploadFile } from './upload.service';

const FOLDERS = ['services', 'packs', 'members', 'staff', 'tenants'] as const;

class UploadDto {
  @IsOptional()
  @IsString()
  @IsIn(FOLDERS)
  folder?: string;
}

/**
 * Endpoint de upload de archivos (POST /upload).
 *
 * @remarks Acepta multipart/form-data con campo `file`. Staff JWT + tenant.
 * Key R2: `tenants/{tenantId}/{folder}/{uuid}`.
 */
@Controller('upload')
@RequireTenantAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentTenant() tenantId: string,
    @UploadedFile()
    file: { mimetype: string; size: number; buffer: Buffer } | undefined,
    @Body() dto: UploadDto,
  ) {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo.');
    }

    const uploadFile: UploadFile = {
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    };

    const folder = dto.folder ?? 'members';
    return this.uploadService.uploadImage(uploadFile, folder, tenantId);
  }
}
