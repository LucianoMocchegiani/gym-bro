import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditActor, AUDIT_ACTIONS } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertMercadoPagoAccountDto } from './dto/upsert-mercadopago-account.dto';
import { MpCredentialsCrypto } from './mp-credentials-crypto';
import { MP_ACCOUNT_PORT, MpAccountPort } from './mp-account.port';
import {
  MercadoPagoAccountStatus,
  MercadoPagoAccountTestResult,
} from './mercadopago-account.types';

/**
 * Cuenta Mercado Pago por tenant (CU-PAG-006 / RN-PAG-001).
 *
 * @remarks Credenciales pegadas (access_token + public_key). Token cifrado.
 * GET nunca expone secretos. Permiso `mp.connect`.
 */
@Injectable()
export class MercadoPagoAccountService {
  private readonly crypto: MpCredentialsCrypto;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    @Inject(MP_ACCOUNT_PORT) private readonly mp: MpAccountPort,
  ) {
    const secret =
      this.config.get<string>('MP_CREDENTIALS_SECRET')?.trim() ||
      'dev-mp-credentials-secret-change-me';
    this.crypto = new MpCredentialsCrypto(secret);
  }

  /**
   * Estado de conexión sin secretos.
   */
  async getStatus(tenantId: string): Promise<MercadoPagoAccountStatus> {
    const row = await this.prisma.mercadoPagoAccount.findUnique({
      where: { tenantId },
    });
    if (!row) {
      return {
        connected: false,
        publicKeyMasked: null,
        mpUserId: null,
        lastValidatedAt: null,
        lastValidationOk: null,
        updatedAt: null,
      };
    }
    return this.toStatus(row);
  }

  /**
   * Conecta o reemplaza credenciales del gym.
   *
   * @remarks Por defecto valida contra MP antes de guardar. Audita connect.
   */
  async upsert(
    tenantId: string,
    dto: UpsertMercadoPagoAccountDto,
    actor: AuditActor,
  ): Promise<MercadoPagoAccountStatus> {
    const shouldValidate = dto.validate !== false;
    let mpUserId: string | null = null;
    let lastValidatedAt: Date | null = null;
    let lastValidationOk: boolean | null = null;

    if (shouldValidate) {
      try {
        const result = await this.mp.validateAccessToken(
          dto.accessToken.trim(),
        );
        mpUserId = result.userId;
        lastValidatedAt = new Date();
        lastValidationOk = true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Invalid Mercado Pago credentials';
        throw new BadRequestException(message);
      }
    }

    const ciphertext = this.crypto.encrypt(dto.accessToken.trim());
    const publicKey = dto.publicKey.trim();

    const before = await this.prisma.mercadoPagoAccount.findUnique({
      where: { tenantId },
    });

    const row = await this.prisma.mercadoPagoAccount.upsert({
      where: { tenantId },
      create: {
        tenantId,
        accessTokenCiphertext: ciphertext,
        publicKey,
        mpUserId,
        lastValidatedAt,
        lastValidationOk,
      },
      update: {
        accessTokenCiphertext: ciphertext,
        publicKey,
        mpUserId,
        lastValidatedAt,
        lastValidationOk,
      },
    });

    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.mpAccountConnect,
      entityType: 'MercadoPagoAccount',
      entityId: tenantId,
      before: before
        ? {
            connected: true,
            publicKeyMasked: maskPublicKey(before.publicKey),
            mpUserId: before.mpUserId,
          }
        : null,
      after: {
        connected: true,
        publicKeyMasked: maskPublicKey(row.publicKey),
        mpUserId: row.mpUserId,
        validated: shouldValidate,
      },
    });

    return this.toStatus(row);
  }

  /**
   * Revalida el access_token almacenado contra MP.
   *
   * @throws {NotFoundException} Si el gym no tiene cuenta conectada.
   * @throws {BadRequestException} Si MP rechaza el token.
   */
  async test(
    tenantId: string,
    actor: AuditActor,
  ): Promise<MercadoPagoAccountTestResult> {
    const row = await this.prisma.mercadoPagoAccount.findUnique({
      where: { tenantId },
    });
    if (!row) {
      throw new NotFoundException('Mercado Pago account not connected');
    }

    let accessToken: string;
    try {
      accessToken = this.crypto.decrypt(row.accessTokenCiphertext);
    } catch {
      throw new BadRequestException(
        'Stored Mercado Pago credentials are corrupt',
      );
    }

    const validatedAt = new Date();
    try {
      const result = await this.mp.validateAccessToken(accessToken);
      await this.prisma.mercadoPagoAccount.update({
        where: { tenantId },
        data: {
          mpUserId: result.userId,
          lastValidatedAt: validatedAt,
          lastValidationOk: true,
        },
      });

      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.mpAccountTest,
        entityType: 'MercadoPagoAccount',
        entityId: tenantId,
        after: { ok: true, mpUserId: result.userId },
      });

      return {
        ok: true,
        mpUserId: result.userId,
        nickname: result.nickname ?? null,
        validatedAt: validatedAt.toISOString(),
      };
    } catch (err) {
      await this.prisma.mercadoPagoAccount.update({
        where: { tenantId },
        data: {
          lastValidatedAt: validatedAt,
          lastValidationOk: false,
        },
      });

      await this.audit.record({
        tenantId,
        actor,
        action: AUDIT_ACTIONS.mpAccountTest,
        entityType: 'MercadoPagoAccount',
        entityId: tenantId,
        after: { ok: false },
      });

      const message =
        err instanceof Error ? err.message : 'Mercado Pago validation failed';
      throw new BadRequestException(message);
    }
  }

  /**
   * Elimina la cuenta MP del tenant.
   *
   * @throws {NotFoundException} Si no había cuenta.
   */
  async disconnect(
    tenantId: string,
    actor: AuditActor,
  ): Promise<MercadoPagoAccountStatus> {
    const before = await this.prisma.mercadoPagoAccount.findUnique({
      where: { tenantId },
    });
    if (!before) {
      throw new NotFoundException('Mercado Pago account not connected');
    }

    await this.prisma.mercadoPagoAccount.delete({ where: { tenantId } });

    await this.audit.record({
      tenantId,
      actor,
      action: AUDIT_ACTIONS.mpAccountDisconnect,
      entityType: 'MercadoPagoAccount',
      entityId: tenantId,
      before: {
        connected: true,
        publicKeyMasked: maskPublicKey(before.publicKey),
        mpUserId: before.mpUserId,
      },
      after: { connected: false },
    });

    return {
      connected: false,
      publicKeyMasked: null,
      mpUserId: null,
      lastValidatedAt: null,
      lastValidationOk: null,
      updatedAt: null,
    };
  }

  /**
   * Descifra el access_token para uso interno (checkout futuro).
   *
   * @throws {NotFoundException} Si no hay cuenta.
   */
  async getDecryptedAccessToken(tenantId: string): Promise<string> {
    const row = await this.prisma.mercadoPagoAccount.findUnique({
      where: { tenantId },
    });
    if (!row) {
      throw new NotFoundException('Mercado Pago account not connected');
    }
    try {
      return this.crypto.decrypt(row.accessTokenCiphertext);
    } catch {
      throw new BadRequestException(
        'Stored Mercado Pago credentials are corrupt',
      );
    }
  }

  private toStatus(row: {
    publicKey: string;
    mpUserId: string | null;
    lastValidatedAt: Date | null;
    lastValidationOk: boolean | null;
    updatedAt: Date;
  }): MercadoPagoAccountStatus {
    return {
      connected: true,
      publicKeyMasked: maskPublicKey(row.publicKey),
      mpUserId: row.mpUserId,
      lastValidatedAt: row.lastValidatedAt?.toISOString() ?? null,
      lastValidationOk: row.lastValidationOk,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

/**
 * Enmascara public_key para respuestas API.
 */
function maskPublicKey(publicKey: string): string {
  if (publicKey.length <= 12) {
    return `${publicKey.slice(0, 2)}…${publicKey.slice(-2)}`;
  }
  return `${publicKey.slice(0, 8)}…${publicKey.slice(-4)}`;
}
