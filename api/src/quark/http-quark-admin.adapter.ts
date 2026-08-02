import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  QuarkAdminPort,
  QuarkCreateIssuerResult,
  QuarkCreateVerifierResult,
  QuarkIssuerListItem,
  QuarkVerifierListItem,
} from './quark-admin.port';

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
  async createIssuer(issuerId: string): Promise<QuarkCreateIssuerResult> {
    return this.postJson<QuarkCreateIssuerResult>(
      this.issuerBase(),
      '/v1/issuers',
      { issuerId },
    );
  }

  /**
   * @inheritdoc
   */
  async createVerifier(
    verifierId: string,
  ): Promise<QuarkCreateVerifierResult> {
    return this.postJson<QuarkCreateVerifierResult>(
      this.verifierBase(),
      '/v1/verifiers',
      { verifierId },
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
    const url = `${base}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.requestTimeoutMs()),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Quark POST ${url} network error: ${msg}`);
      throw new QuarkHttpError(`Quark unreachable: ${msg}`, 0, '');
    }

    const text = await response.text().catch(() => '');
    if (!response.ok) {
      this.logger.warn(
        `Quark POST ${url} status=${response.status} body=${text.slice(0, 300)}`,
      );
      throw new QuarkHttpError(
        `Quark HTTP ${response.status}`,
        response.status,
        text,
      );
    }

    return JSON.parse(text) as T;
  }

  private async getJson<T>(base: string, path: string): Promise<T> {
    const url = `${base}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.requestTimeoutMs()),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Quark GET ${url} network error: ${msg}`);
      throw new QuarkHttpError(`Quark unreachable: ${msg}`, 0, '');
    }

    const text = await response.text().catch(() => '');
    if (!response.ok) {
      this.logger.warn(
        `Quark GET ${url} status=${response.status} body=${text.slice(0, 300)}`,
      );
      throw new QuarkHttpError(
        `Quark HTTP ${response.status}`,
        response.status,
        text,
      );
    }

    return JSON.parse(text) as T;
  }
}
