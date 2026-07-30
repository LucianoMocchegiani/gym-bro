import {
  clearStaffSession,
  readStaffSession,
  updateStaffTokens,
} from '@/lib/auth/session';
import type { ApiErrorBody } from '@/lib/api/types';

/**
 * Error HTTP tipado desde la API Nest.
 */
export class ApiClientError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null, fallback: string) {
    const msg = Array.isArray(body?.message)
      ? body.message.join(', ')
      : typeof body?.message === 'string'
        ? body.message
        : fallback;
    super(msg);
    this.name = 'ApiClientError';
    this.status = status;
    this.body = body;
  }
}

function apiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
  if (!base) {
    throw new Error('NEXT_PUBLIC_API_URL no está configurada');
  }
  return `${base}/api`;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  /** Evita loop infinito en refresh. */
  _retried?: boolean;
};

/**
 * Cliente HTTP tipado hacia `NEXT_PUBLIC_API_URL/api`.
 *
 * @remarks En 401 con sesión Staff intenta un refresh y reintenta una vez.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = true, _retried = false } = options;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const session = readStaffSession();
    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`;
    }
  }

  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !_retried) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, _retried: true });
    }
    clearStaffSession();
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { message: text };
    }
  }

  if (!res.ok) {
    throw new ApiClientError(
      res.status,
      parsed as ApiErrorBody,
      `Error HTTP ${res.status}`,
    );
  }

  return parsed as T;
}

async function tryRefresh(): Promise<boolean> {
  const session = readStaffSession();
  if (!session?.refreshToken) {
    return false;
  }
  try {
    const res = await fetch(`${apiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!res.ok) {
      return false;
    }
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    updateStaffTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}
