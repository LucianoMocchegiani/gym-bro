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
  const token = getBearer();
  const url = buildUrl(path, query);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
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
