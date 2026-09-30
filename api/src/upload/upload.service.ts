import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

const TENANT_KEY =
  /^tenants\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i;

const LEGACY_FLAT = /^(members|staff|services|packs)\//;

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
  private readonly publicBaseUrl: string;
  private readonly keyPrefix: string;

  constructor(
    @Inject(FILE_STORAGE_PORT)
    private readonly storage: FileStoragePort,
    private readonly config: ConfigService,
  ) {
    this.publicBaseUrl = this.config
      .getOrThrow<string>('R2_PUBLIC_BASE_URL')
      .replace(/\/$/, '');
    this.keyPrefix = this.config.get<string>('R2_KEY_PREFIX', '') ?? '';
  }

  /**
   * Sube una imagen validando tipo y tamaño.
   *
   * @param file - Archivo Multer (buffer disponible en memoryStorage)
   * @param folder - `services` | `packs` | `members` | `staff` | `tenants`
   * @param tenantId - Del JWT (RN-TEN-001). Key: `tenants/{tenantId}/{folder}/{uuid}.ext`
   */
  async uploadImage(
    file: UploadFile,
    folder: string,
    tenantId: string,
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
    const key = `tenants/${tenantId}/${folder}/${randomUUID()}.${ext}`;
    const url = await this.storage.upload(key, file.buffer, file.mimetype);

    this.logger.log(`Upload: ${key} (${file.size} bytes)`);
    return { url, key };
  }

  /**
   * Borra en R2 la imagen pública anterior si cambió o se quitó.
   *
   * @remarks No toca `folder/…`. Ignora URLs de otro bucket o tenant.
   * Fallo de delete: log; no revierte el update de DB.
   */
  async replaceOwnedPublicImage(
    tenantId: string,
    previousUrl: string | null | undefined,
    nextUrl: string | null | undefined,
  ): Promise<void> {
    const prev = previousUrl?.trim() || null;
    const next = nextUrl?.trim() || null;
    if (!prev || prev === next) {
      return;
    }
    await this.deleteOwnedPublicImage(tenantId, prev);
  }

  /**
   * Elimina un objeto por key lógica (sin `R2_KEY_PREFIX`).
   */
  async deleteFile(key: string): Promise<void> {
    await this.storage.delete(key);
  }

  private async deleteOwnedPublicImage(
    tenantId: string,
    url: string,
  ): Promise<void> {
    const key = this.logicalKeyFromPublicUrl(url);
    if (!key) {
      return;
    }
    if (!this.keyBelongsToTenant(key, tenantId)) {
      this.logger.warn(`R2 skip delete (otro tenant o no público): ${key}`);
      return;
    }
    try {
      await this.deleteFile(key);
      this.logger.log(`R2 deleted ${key}`);
    } catch (err) {
      this.logger.warn(
        `R2 delete failed ${key}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private logicalKeyFromPublicUrl(url: string): string | null {
    const prefix = `${this.publicBaseUrl}/`;
    if (!url.startsWith(prefix)) {
      return null;
    }
    let rest = url.slice(prefix.length);
    if (this.keyPrefix && rest.startsWith(this.keyPrefix)) {
      rest = rest.slice(this.keyPrefix.length);
    }
    return rest || null;
  }

  private keyBelongsToTenant(key: string, tenantId: string): boolean {
    if (key.startsWith('folder/')) {
      return false;
    }
    const scoped = TENANT_KEY.exec(key);
    if (scoped) {
      return scoped[1].toLowerCase() === tenantId.toLowerCase();
    }
    return LEGACY_FLAT.test(key);
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
