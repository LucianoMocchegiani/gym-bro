import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  QuarkAdminPort,
  QuarkCreateIssuerResult,
  QuarkCreateOfferInput,
  QuarkCreateOfferResult,
  QuarkCreatePresentationRequestInput,
  QuarkCreatePresentationRequestResult,
  QuarkCreateVerifierOid4vp,
  QuarkCreateVerifierResult,
  QuarkIssuerListItem,
  QuarkIssuerMetadataPatch,
  QuarkPatchIssuerMetadataResult,
  QuarkVerificationSession,
  QuarkVerifierListItem,
} from './quark-admin.port';
import {
  decodeVpTokenCredentials,
  extractVpToken,
  flattenPresentedClaims,
} from './oid4vp-session-claims';

/**
 * Error HTTP / red al hablar con Quark (no es error de dominio GymBro).
 */
export class QuarkHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = 'QuarkHttpError';
  }
}

/**
 * Adapter HTTP hacia `quark-issuer` / `quark-verifier` del Compose.
 *
 * @remarks Sin auth JWT en estos endpoints de prueba Quark.
 * Prefijo API: `/v1`.
 */
@Injectable()
export class HttpQuarkAdminAdapter extends QuarkAdminPort {
  private readonly logger = new Logger(HttpQuarkAdminAdapter.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  /**
   * @inheritdoc
   */
  async createIssuer(
    issuerId: string,
    oid4vc?: QuarkIssuerMetadataPatch,
  ): Promise<QuarkCreateIssuerResult> {
    const body: Record<string, unknown> = { issuerId };
    if (oid4vc) {
      body.oid4vc = oid4vc;
    }
    return this.postJson<QuarkCreateIssuerResult>(
      this.issuerBase(),
      '/v1/issuers',
      body,
    );
  }

  /**
   * @inheritdoc
   */
  async createVerifier(
    verifierId: string,
    oid4vp?: QuarkCreateVerifierOid4vp,
  ): Promise<QuarkCreateVerifierResult> {
    const body: Record<string, unknown> = { verifierId };
    if (oid4vp) {
      body.oid4vp = oid4vp;
    }
    return this.postJson<QuarkCreateVerifierResult>(
      this.verifierBase(),
      '/v1/verifiers',
      body,
    );
  }

  /**
   * @inheritdoc
   */
  async listIssuers(): Promise<QuarkIssuerListItem[]> {
    const data = await this.getJson<{ issuers: QuarkIssuerListItem[] }>(
      this.issuerBase(),
      '/v1/issuers',
    );
    return data.issuers ?? [];
  }

  /**
   * @inheritdoc
   */
  async listVerifiers(): Promise<QuarkVerifierListItem[]> {
    const data = await this.getJson<{ verifiers: QuarkVerifierListItem[] }>(
      this.verifierBase(),
      '/v1/verifiers',
    );
    return data.verifiers ?? [];
  }

  /**
   * @inheritdoc
   */
  async patchIssuerMetadata(
    issuerWalletId: string,
    patch: QuarkIssuerMetadataPatch,
  ): Promise<QuarkPatchIssuerMetadataResult> {
    return this.patchJson<QuarkPatchIssuerMetadataResult>(
      this.issuerBase(),
      `/v1/issuers/${encodeURIComponent(issuerWalletId)}/records/metadata`,
      patch,
    );
  }

  /**
   * @inheritdoc
   */
  async listIssuerRecords(
    issuerWalletId: string,
    type: string,
  ): Promise<{ total: number }> {
    const data = await this.getJson<{
      pagination?: { total?: number };
      records?: unknown[];
    }>(
      this.issuerBase(),
      `/v1/issuers/${encodeURIComponent(issuerWalletId)}/records?type=${encodeURIComponent(type)}`,
    );
    const total =
      data.pagination?.total ??
      (Array.isArray(data.records) ? data.records.length : 0);
    return { total };
  }

  /**
   * @inheritdoc
   */
  async listVerifierRecords(
    verifierWalletId: string,
    type: string,
  ): Promise<{ total: number }> {
    const data = await this.getJson<{
      pagination?: { total?: number };
      records?: unknown[];
    }>(
      this.verifierBase(),
      `/v1/verifiers/${encodeURIComponent(verifierWalletId)}/records?type=${encodeURIComponent(type)}`,
    );
    const total =
      data.pagination?.total ??
      (Array.isArray(data.records) ? data.records.length : 0);
    return { total };
  }

  /**
   * @inheritdoc
   */
  async createCredentialOffer(
    issuerWalletId: string,
    input: QuarkCreateOfferInput,
  ): Promise<QuarkCreateOfferResult> {
    return this.postJson<QuarkCreateOfferResult>(
      this.issuerBase(),
      `/v1/issuers/${encodeURIComponent(issuerWalletId)}/openid4vc/offer`,
      input,
    );
  }

  /**
   * @inheritdoc
   */
  async createPresentationRequest(
    verifierWalletId: string,
    input: QuarkCreatePresentationRequestInput,
  ): Promise<QuarkCreatePresentationRequestResult> {
    return this.postJson<QuarkCreatePresentationRequestResult>(
      this.verifierBase(),
      `/v1/verifiers/${encodeURIComponent(verifierWalletId)}/openid4vc/request`,
      input,
    );
  }

  /**
   * @inheritdoc
   *
   * @remarks GET Quark crudo + decode SD-JWT de `vp_token` (Postman 02.7). Sin tocar Quark.
   */
  async getVerificationSession(
    verifierWalletId: string,
    verificationSessionId: string,
  ): Promise<QuarkVerificationSession> {
    const raw = await this.getJson<Record<string, unknown>>(
      this.verifierBase(),
      `/v1/verifiers/${encodeURIComponent(verifierWalletId)}/openid4vc/session/${encodeURIComponent(verificationSessionId)}`,
    );
    const id =
      typeof raw.id === 'string' ? raw.id : verificationSessionId;
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
      this.config.get<string>('QUARK_ISSUER_BASE_URL')?.replace(/\/$/, '') ??
      'http://quark-issuer:9001'
    );
  }

  private verifierBase(): string {
    return (
      this.config.get<string>('QUARK_VERIFIER_BASE_URL')?.replace(/\/$/, '') ??
      'http://quark-verifier:9002'
    );
  }

  private requestTimeoutMs(): number {
    const raw = this.config.get<string>('QUARK_HTTP_TIMEOUT_MS');
    const n = raw ? Number(raw) : 20_000;
    return Number.isFinite(n) && n > 0 ? n : 20_000;
  }

  private async postJson<T>(
    base: string,
    path: string,
    body: unknown,
  ): Promise<T> {
    return this.requestJson<T>(base, path, 'POST', body);
  }

  private async patchJson<T>(
    base: string,
    path: string,
    body: unknown,
  ): Promise<T> {
    return this.requestJson<T>(base, path, 'PATCH', body);
  }

  private async getJson<T>(base: string, path: string): Promise<T> {
    return this.requestJson<T>(base, path, 'GET');
  }

  private async requestJson<T>(
    base: string,
    path: string,
    method: 'GET' | 'POST' | 'PATCH',
    body?: unknown,
  ): Promise<T> {
    const url = `${base}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined
            ? { 'Content-Type': 'application/json' }
            : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.requestTimeoutMs()),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Quark ${method} ${url} network error: ${msg}`);
      throw new QuarkHttpError(`Quark unreachable: ${msg}`, 0, '');
    }

    const text = await response.text().catch(() => '');
    if (!response.ok) {
      this.logger.warn(
        `Quark ${method} ${url} status=${response.status} body=${text.slice(0, 300)}`,
      );
      throw new QuarkHttpError(
        `Quark HTTP ${response.status}`,
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
