import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  KuatiaAdminPort,
  KuatiaCreateOfferInput,
  KuatiaCreateOfferResult,
  KuatiaCreatePresentationRequestInput,
  KuatiaCreatePresentationRequestResult,
  KuatiaIssuerMetadataPatch,
  KuatiaPatchIssuerMetadataResult,
  KuatiaVerificationSession,
} from './kuatia-admin.port';
import {
  decodeVpTokenCredentials,
  extractVpToken,
  flattenPresentedClaims,
} from './oid4vp-session-claims';

/**
 * Error HTTP / red al hablar con Kuatia (issuer/verifier).
 */
export class KuatiaHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = 'KuatiaHttpError';
  }
}

type KuatiaTarget = 'issuer' | 'verifier';

/**
 * Adapter HTTP hacia issuer/verifier Kuatia (producto compartido GymBro).
 *
 * @remarks Auth: header `x-api-key` (`iss_live_…` / `ver_live_…`).
 * Prefijo API: `/v1`. Docs: https://kuatia.xyz/docs
 */
@Injectable()
export class HttpKuatiaAdminAdapter extends KuatiaAdminPort {
  private readonly logger = new Logger(HttpKuatiaAdminAdapter.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  /**
   * @inheritdoc
   */
  async patchIssuerMetadata(
    issuerWalletId: string,
    patch: KuatiaIssuerMetadataPatch,
  ): Promise<KuatiaPatchIssuerMetadataResult> {
    return this.patchJson<KuatiaPatchIssuerMetadataResult>(
      'issuer',
      `/v1/issuers/${encodeURIComponent(issuerWalletId)}/records/metadata`,
      patch,
    );
  }

  /**
   * @inheritdoc
   */
  async createCredentialOffer(
    issuerWalletId: string,
    input: KuatiaCreateOfferInput,
  ): Promise<KuatiaCreateOfferResult> {
    return this.postJson<KuatiaCreateOfferResult>(
      'issuer',
      `/v1/issuers/${encodeURIComponent(issuerWalletId)}/openid4vc/offer`,
      input,
    );
  }

  /**
   * @inheritdoc
   */
  async createPresentationRequest(
    verifierWalletId: string,
    input: KuatiaCreatePresentationRequestInput,
  ): Promise<KuatiaCreatePresentationRequestResult> {
    return this.postJson<KuatiaCreatePresentationRequestResult>(
      'verifier',
      `/v1/verifiers/${encodeURIComponent(verifierWalletId)}/openid4vc/request`,
      input,
    );
  }

  /**
   * @inheritdoc
   *
   * @remarks GET Kuatia + decode SD-JWT de `vp_token`.
   */
  async getVerificationSession(
    verifierWalletId: string,
    verificationSessionId: string,
  ): Promise<KuatiaVerificationSession> {
    const raw = await this.getJson<Record<string, unknown>>(
      'verifier',
      `/v1/verifiers/${encodeURIComponent(verifierWalletId)}/openid4vc/session/${encodeURIComponent(verificationSessionId)}`,
    );
    const id = typeof raw.id === 'string' ? raw.id : verificationSessionId;
    const state = typeof raw.state === 'string' ? raw.state : 'Unknown';
    const vpToken = extractVpToken(raw);
    if (vpToken === undefined) {
      return { id, state, presented: false, claims: {} };
    }
    try {
      const decoded = decodeVpTokenCredentials(vpToken);
      return {
        id,
        state,
        presented: true,
        claims: flattenPresentedClaims(decoded),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `OID4VP session ${verificationSessionId}: no se pudo decodificar vp_token (${msg})`,
      );
      return { id, state, presented: true, claims: {} };
    }
  }

  private issuerBase(): string {
    return (
      this.config.get<string>('KUATIA_ISSUER_BASE_URL')?.replace(/\/$/, '') ??
      ''
    );
  }

  private verifierBase(): string {
    return (
      this.config.get<string>('KUATIA_VERIFIER_BASE_URL')?.replace(/\/$/, '') ??
      ''
    );
  }

  private issuerApiKey(): string {
    return this.config.get<string>('KUATIA_ISSUER_API_KEY')?.trim() ?? '';
  }

  private verifierApiKey(): string {
    return this.config.get<string>('KUATIA_VERIFIER_API_KEY')?.trim() ?? '';
  }

  private baseFor(target: KuatiaTarget): string {
    const base = target === 'issuer' ? this.issuerBase() : this.verifierBase();
    if (!base) {
      throw new KuatiaHttpError(
        `KUATIA_${target.toUpperCase()}_BASE_URL is not configured`,
        0,
        '',
      );
    }
    return base;
  }

  private apiKeyFor(target: KuatiaTarget): string {
    const key =
      target === 'issuer' ? this.issuerApiKey() : this.verifierApiKey();
    if (!key) {
      throw new KuatiaHttpError(
        `KUATIA_${target.toUpperCase()}_API_KEY is not configured`,
        0,
        '',
      );
    }
    return key;
  }

  private requestTimeoutMs(): number {
    const raw = this.config.get<string>('KUATIA_HTTP_TIMEOUT_MS');
    const n = raw ? Number(raw) : 20_000;
    return Number.isFinite(n) && n > 0 ? n : 20_000;
  }

  private async postJson<T>(
    target: KuatiaTarget,
    path: string,
    body: unknown,
  ): Promise<T> {
    return this.requestJson<T>(target, path, 'POST', body);
  }

  private async patchJson<T>(
    target: KuatiaTarget,
    path: string,
    body: unknown,
  ): Promise<T> {
    return this.requestJson<T>(target, path, 'PATCH', body);
  }

  private async getJson<T>(target: KuatiaTarget, path: string): Promise<T> {
    return this.requestJson<T>(target, path, 'GET');
  }

  private async requestJson<T>(
    target: KuatiaTarget,
    path: string,
    method: 'GET' | 'POST' | 'PATCH',
    body?: unknown,
  ): Promise<T> {
    const base = this.baseFor(target);
    const url = `${base}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          'x-api-key': this.apiKeyFor(target),
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.requestTimeoutMs()),
      });
    } catch (err) {
      if (err instanceof KuatiaHttpError) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Kuatia ${method} ${url} network error: ${msg}`);
      throw new KuatiaHttpError(`Kuatia unreachable: ${msg}`, 0, '');
    }

    const text = await response.text().catch(() => '');
    if (!response.ok) {
      this.logger.warn(
        `Kuatia ${method} ${url} status=${response.status} body=${text.slice(0, 300)}`,
      );
      throw new KuatiaHttpError(
        `Kuatia HTTP ${response.status}`,
        response.status,
        text,
      );
    }

    if (!text) {
      return {} as T;
    }
    return JSON.parse(text) as T;
  }
}
