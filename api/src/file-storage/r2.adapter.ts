import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import type { FileStoragePort } from './file-storage.port';

/**
 * Adaptador R2 (Cloudflare) para almacenamiento de archivos.
 *
 * @remarks R2 es S3-compatible, así que usamos el SDK de S3 con el endpoint
 * de R2. Patrón puerto/adaptador: si cambiamos de provider, solo reemplazamos
 * esta clase.
 *
 * Si `R2_KEY_PREFIX` está configurado (ej. `gymbro/`), todas las keys lo
 * llevan como prefijo. Esto permite usar el mismo bucket para múltiples
 * proyectos.
 */
@Injectable()
export class R2Adapter implements FileStoragePort {
  private readonly logger = new Logger(R2Adapter.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly keyPrefix: string;

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.getOrThrow<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.getOrThrow<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.getOrThrow<string>(
      'R2_SECRET_ACCESS_KEY',
    );
    this.bucket = this.config.getOrThrow<string>('R2_BUCKET');
    this.publicBaseUrl = this.config.getOrThrow<string>('R2_PUBLIC_BASE_URL');
    this.keyPrefix = this.config.get<string>('R2_KEY_PREFIX', '');

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    this.logger.log(
      `R2 adapter init — bucket: ${this.bucket}${this.keyPrefix ? `, prefix: ${this.keyPrefix}` : ''}`,
    );
  }

  private resolveKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}${key}` : key;
  }

  async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const fullKey = this.resolveKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    return `${this.publicBaseUrl}/${fullKey}`;
  }

  /**
   * Lee el objeto crudo (sin URL pública).
   */
  async getObject(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    const fullKey = this.resolveKey(key);
    const out = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      }),
    );
    const bytes = await out.Body?.transformToByteArray();
    if (!bytes) {
      throw new Error(`R2 object empty: ${fullKey}`);
    }
    return {
      buffer: Buffer.from(bytes),
      contentType: out.ContentType ?? 'application/octet-stream',
    };
  }

  async delete(key: string): Promise<void> {
    const fullKey = this.resolveKey(key);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
      }),
    );
  }

  async listKeys(prefix = ''): Promise<string[]> {
    const fullPrefix = this.resolveKey(prefix);
    const out: string[] = [];
    let token: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: fullPrefix || undefined,
          ContinuationToken: token,
        }),
      );
      for (const obj of page.Contents ?? []) {
        if (!obj.Key) {
          continue;
        }
        out.push(this.stripPrefix(obj.Key));
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return out;
  }

  async deleteMany(keys: string[]): Promise<void> {
    const chunkSize = 1000;
    for (let i = 0; i < keys.length; i += chunkSize) {
      const slice = keys.slice(i, i + chunkSize);
      if (slice.length === 0) {
        continue;
      }
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: slice.map((key) => ({ Key: this.resolveKey(key) })),
            Quiet: true,
          },
        }),
      );
    }
  }

  private stripPrefix(fullKey: string): string {
    if (this.keyPrefix && fullKey.startsWith(this.keyPrefix)) {
      return fullKey.slice(this.keyPrefix.length);
    }
    return fullKey;
  }
}
