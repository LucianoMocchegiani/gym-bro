import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FILE_STORAGE_PORT } from '../file-storage/file-storage.port';
import type { FileStoragePort } from '../file-storage/file-storage.port';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export interface UploadFile {
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Servicio de upload que valida y delega al adaptador de storage.
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    @Inject(FILE_STORAGE_PORT)
    private readonly storage: FileStoragePort,
  ) {}

  /**
   * Sube una imagen validando tipo y tamaño.
   *
   * @param file - Archivo Multer (buffer disponible en memoryStorage)
   * @param folder - Carpeta dentro del bucket, ej. `services`, `packs`, `members`
   * @returns URL pública y key del archivo subido
   */
  async uploadImage(
    file: UploadFile,
    folder: string,
  ): Promise<{ url: string; key: string }> {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${file.mimetype}. Use JPG, PNG, WebP o GIF.`,
      );
    }

    if (file.size > MAX_SIZE) {
      throw new BadRequestException(
        `El archivo supera el límite de ${MAX_SIZE / 1024 / 1024}MB.`,
      );
    }

    const ext = this.extFromMime(file.mimetype);
    const key = `${folder}/${randomUUID()}.${ext}`;
    const url = await this.storage.upload(key, file.buffer, file.mimetype);

    this.logger.log(`Upload: ${key} (${file.size} bytes)`);
    return { url, key };
  }

  /**
   * Elimina un archivo por su key.
   */
  async deleteFile(key: string): Promise<void> {
    await this.storage.delete(key);
  }

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return map[mime] ?? 'bin';
  }
}
