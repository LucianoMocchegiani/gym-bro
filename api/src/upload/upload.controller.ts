import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService, UploadFile } from './upload.service';
import { IsIn, IsOptional, IsString } from 'class-validator';

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
 * @remarks Acepta multipart/form-data con campo `file`.
 * Retorna `{ url, key }` con la URL pública del archivo.
 */
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: { mimetype: string; size: number; buffer: Buffer } | undefined,
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

    const folder = dto.folder ?? 'general';
    return this.uploadService.uploadImage(uploadFile, folder);
  }
}
