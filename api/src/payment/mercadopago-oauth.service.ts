import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { MercadoPagoAccount, MpConnectionMode } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { AuditActor, AUDIT_ACTIONS } from '../audit/audit.types';
import { AuditService } from '../audit/audit.service';
import { tenantWebOrigin } from '../common/web-urls';
import { PrismaService } from '../prisma/prisma.service';
import { maskPublicKey } from './mercadopago-account.service';
import { MercadoPagoOAuthStartResult } from './mercadopago-account.types';
import { MpCredentialsCrypto } from './mp-credentials-crypto';
import { MP_ACCOUNT_PORT, MpAccountPort } from './mp-account.port';
import { MpOAuthConfig, readMpOAuthConfig } from './mp-oauth.config';

const MP_AUTHORIZATION_URL = 'https://auth.mercadopago.com/authorization';
const STATE_TTL_MS = 10 * 60 * 1000;
/** Renovar cuando falten menos de 30 días (el token dura 180). */
const REFRESH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** Motivo en `?mp=error&reason=` al volver a Config. */
export type MpOAuthErrorReason = 'denied' | 'expired' | 'exchange';

/** Destino del navegador después del callback. */
export type MpOAuthCallbackOutcome =
  { kind: 'redirect'; url: string } | { kind: 'invalid' };

/**
 * «Conectar Mercado Pago» por OAuth (CU-PAG-006 / RN-PAG-001).
 *
 * @remarks Una sola app de plataforma Faciliter; el gym solo inicia sesión en
 * MP y autoriza. El `state` es de un uso y vence a los 10 min. Tokens
 * cifrados con `MP_CREDENTIALS_SECRET`. El refresh_token rota al renovar.
 */
@Injectable()
export class MercadoPagoOAuthService {
  private readonly logger = new Logger(MercadoPagoOAuthService.name);
  private readonly crypto: MpCredentialsCrypto;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    @Inject(MP_ACCOUNT_PORT) private readonly mp: MpAccountPort,
  ) {
    this.crypto = MpCredentialsCrypto.fromConfig(this.config);
  }

  /**
   * Arma la URL de autorización de MP para el gym.
   *
   * @throws {ServiceUnavailableException} Si faltan `MP_OAUTH_CLIENT_ID/SECRET`.
   */
  async start(
    tenantId: string,
    actor: AuditActor,
  ): Promise<MercadoPagoOAuthStartResult> {
    const oauth = this.requireConfig();
    const state = randomBytes(32).toString('base64url');
    const codeVerifier = randomBytes(48).toString('base64url');

    await this.prisma.mpOauthState.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    await this.prisma.mpOauthState.create({
      data: {
        stateHash: sha256Hex(state),
        tenantId,
        actorUserId: actor.userId,
        codeVerifierCiphertext: this.crypto.encrypt(codeVerifier),
        expiresAt: new Date(Date.now() + STATE_TTL_MS),
      },
    });

    const url = new URL(MP_AUTHORIZATION_URL);
    url.searchParams.set('client_id', oauth.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('platform_id', 'mp');
    url.searchParams.set('state', state);
    url.searchParams.set('redirect_uri', oauth.redirectUri);
    if (oauth.pkce) {
      url.searchParams.set(
        'code_challenge',
        createHash('sha256').update(codeVerifier).digest('base64url'),
      );
      url.searchParams.set('code_challenge_method', 'S256');
    }
    return { authorizationUrl: url.toString() };
  }

  /**
   * Vuelta de MP: canjea el código, guarda la cuenta y decide a dónde volver.
   *
   * @remarks No lanza: cualquier fallo con `state` válido vuelve a Config del
   * gym con `?mp=error`. Sin `state` conocido devuelve `invalid`.
   */
  async handleCallback(query: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<MpOAuthCallbackOutcome> {
    if (!query.state) {
      return { kind: 'invalid' };
    }
    const stateHash = sha256Hex(query.state);
    const pending = await this.prisma.mpOauthState.findUnique({
      where: { stateHash },
      include: { tenant: { select: { slug: true } } },
    });
    if (!pending) {
      return { kind: 'invalid' };
    }
    const configUrl = this.tenantConfigUrl(pending.tenant.slug);
    const fail = (reason: MpOAuthErrorReason): MpOAuthCallbackOutcome => ({
      kind: 'redirect',
      url: `${configUrl}?mp=error&reason=${reason}`,
    });

    const now = new Date();
    const claimed = await this.prisma.mpOauthState.updateMany({
      where: { stateHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) {
      return fail('expired');
    }
    if (query.error || !query.code) {
      return fail('denied');
    }

    const oauth = readMpOAuthConfig(this.config);
    if (!oauth) {
      return fail('exchange');
    }

    try {
      const codeVerifier = this.crypto.decrypt(pending.codeVerifierCiphertext);
      const tokens = await this.mp.exchangeOAuthCode({
        clientId: oauth.clientId,
        clientSecret: oauth.clientSecret,
        code: query.code,
        redirectUri: oauth.redirectUri,
        codeVerifier: oauth.pkce ? codeVerifier : undefined,
      });

      const before = await this.prisma.mercadoPagoAccount.findUnique({
        where: { tenantId: pending.tenantId },
      });
      const data = {
        accessTokenCiphertext: this.crypto.encrypt(tokens.accessToken),
        refreshTokenCiphertext: this.crypto.encrypt(tokens.refreshToken),
        publicKey: tokens.publicKey,
        mpUserId: tokens.userId,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        lastValidatedAt: now,
        lastValidationOk: true,
        lastRefreshError: null,
        connectionMode: MpConnectionMode.OAUTH,
      };
      const row = await this.prisma.mercadoPagoAccount.upsert({
        where: { tenantId: pending.tenantId },
        create: { tenantId: pending.tenantId, ...data },
        update: data,
      });

      await this.audit.record({
        tenantId: pending.tenantId,
        actor: { profileType: 'STAFF', userId: pending.actorUserId },
        action: AUDIT_ACTIONS.mpAccountConnect,
        entityType: 'MercadoPagoAccount',
        entityId: pending.tenantId,
        before: before
          ? {
              connected: true,
              publicKeyMasked: maskPublicKey(before.publicKey),
              mpUserId: before.mpUserId,
              connectionMode: before.connectionMode,
            }
          : null,
        after: {
          connected: true,
          publicKeyMasked: maskPublicKey(row.publicKey),
          mpUserId: row.mpUserId,
          connectionMode: row.connectionMode,
        },
      });

      return { kind: 'redirect', url: `${configUrl}?mp=connected` };
    } catch (err) {
      this.logger.warn(
        `MP OAuth callback tenant=${pending.tenantId}: ${err instanceof Error ? err.message : err}`,
      );
      return fail('exchange');
    }
  }

  /**
   * Renueva una vez por día los tokens OAuth que vencen en menos de 30 días.
   */
  @Cron('0 4 * * *', { timeZone: 'America/Argentina/Buenos_Aires' })
  async refreshExpiringDaily(): Promise<void> {
    const oauth = readMpOAuthConfig(this.config);
    if (!oauth) {
      return;
    }
    const rows = await this.prisma.mercadoPagoAccount.findMany({
      where: {
        connectionMode: MpConnectionMode.OAUTH,
        refreshTokenCiphertext: { not: null },
        tokenExpiresAt: { lt: new Date(Date.now() + REFRESH_WINDOW_MS) },
      },
    });
    for (const row of rows) {
      await this.refreshAccount(row, oauth);
    }
  }

  /**
   * Renueva el token de un gym; si MP lo rechaza deja `lastRefreshError`
   * (Config muestra «Reconectar»).
   */
  private async refreshAccount(
    row: MercadoPagoAccount,
    oauth: MpOAuthConfig,
  ): Promise<void> {
    const now = new Date();
    try {
      const tokens = await this.mp.refreshOAuthToken({
        clientId: oauth.clientId,
        clientSecret: oauth.clientSecret,
        refreshToken: this.crypto.decrypt(row.refreshTokenCiphertext ?? ''),
      });
      await this.prisma.mercadoPagoAccount.update({
        where: { tenantId: row.tenantId },
        data: {
          accessTokenCiphertext: this.crypto.encrypt(tokens.accessToken),
          refreshTokenCiphertext: this.crypto.encrypt(tokens.refreshToken),
          publicKey: tokens.publicKey,
          mpUserId: tokens.userId,
          tokenExpiresAt: new Date(now.getTime() + tokens.expiresIn * 1000),
          lastValidatedAt: now,
          lastValidationOk: true,
          lastRefreshError: null,
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Mercado Pago refresh failed';
      this.logger.warn(`MP OAuth refresh tenant=${row.tenantId}: ${message}`);
      const expired =
        row.tokenExpiresAt !== null &&
        row.tokenExpiresAt.getTime() <= now.getTime();
      await this.prisma.mercadoPagoAccount.update({
        where: { tenantId: row.tenantId },
        data: {
          lastRefreshError: message.slice(0, 300),
          ...(expired ? { lastValidatedAt: now, lastValidationOk: false } : {}),
        },
      });
    }
  }

  private requireConfig(): MpOAuthConfig {
    const oauth = readMpOAuthConfig(this.config);
    if (!oauth) {
      throw new ServiceUnavailableException(
        'Mercado Pago OAuth is not configured on this server',
      );
    }
    return oauth;
  }

  private tenantConfigUrl(slug: string): string {
    return `${tenantWebOrigin(this.config, slug)}/dashboard/config`;
  }
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
