import { config } from './config.js';
import { getBearer } from './request-auth.js';

/**
 * Probe de Nest (`GET /api/health`) sin Bearer. No tira: el health del MCP sigue 200.
 */
export async function pingGymbro(): Promise<'up' | 'down'> {
  try {
    const response = await fetch(buildUrl('/api/health'), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    return response.ok ? 'up' : 'down';
  } catch {
    return 'down';
  }
}

export class GymbroApiError extends Error {
  constructor(
    readonly status: number,
    readonly bodyText: string,
  ) {
    super(`GymBro HTTP ${status}`);
    this.name = 'GymbroApiError';
  }

  /** `message` del error de Nest (string o lista de validación), si vino. */
  get apiMessage(): string | null {
    try {
      const parsed = JSON.parse(this.bodyText) as { message?: unknown };
      if (typeof parsed.message === 'string' && parsed.message.trim()) {
        return parsed.message.trim();
      }
      if (Array.isArray(parsed.message)) {
        const parts = parsed.message.filter(
          (item): item is string => typeof item === 'string',
        );
        return parts.length > 0 ? parts.join('; ') : null;
      }
    } catch {
      return null;
    }
    return null;
  }
}

function buildUrl(
  path: string,
  query?: Record<string, string | number | undefined>,
): URL {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, config.gymbroApiUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === '') {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

/**
 * GET a Nest con el Bearer del request MCP.
 *
 * @throws {GymbroApiError} 401/403/4xx/5xx de GymBro.
 */
export async function gymbroGet(
  path: string,
  query?: Record<string, string | number | undefined>,
): Promise<unknown> {
  return gymbroRequest('GET', buildUrl(path, query));
}

export type GymbroWriteMethod = 'POST' | 'PATCH' | 'PUT';

/**
 * Write a Nest con el Bearer del request MCP. Solo lo usa la confirmación de propuestas.
 *
 * @throws {GymbroApiError} 401/403/4xx/5xx de GymBro.
 */
export async function gymbroSend(
  method: GymbroWriteMethod,
  path: string,
  body: unknown,
): Promise<unknown> {
  return gymbroRequest(method, buildUrl(path), body);
}

async function gymbroRequest(
  method: 'GET' | GymbroWriteMethod,
  url: URL,
  body?: unknown,
): Promise<unknown> {
  const token = getBearer();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new GymbroApiError(502, 'GymBro unreachable');
  }
  const bodyText = await response.text();
  if (!response.ok) {
    throw new GymbroApiError(response.status, bodyText);
  }
  if (!bodyText.trim()) {
    return null;
  }
  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    throw new GymbroApiError(502, 'GymBro returned non-JSON');
  }
}
