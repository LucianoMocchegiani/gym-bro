/**
 * Cliente HTTP tipado hacia `NEXT_PUBLIC_API_URL/api`.
 */

import {
  clearStaffSession,
  readStaffSession,
  updateStaffTokens,
} from '@/lib/auth/session';
import {
  clearSuperSession,
  readSuperSession,
  updateSuperTokens,
} from '@/lib/auth/super-session';

export type ApiErrorBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

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

type AuthMode = false | 'staff' | 'super';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** `true`/`'staff'` (default), `'super'`, o `false` sin Bearer. */
  auth?: boolean | 'staff' | 'super';
  /** Evita loop infinito en refresh. */
  _retried?: boolean;
};

function resolveAuthMode(auth: boolean | 'staff' | 'super' | undefined): AuthMode {
  if (auth === false) {
    return false;
  }
  if (auth === 'super') {
    return 'super';
  }
  return 'staff';
}

/**
 * Request tipado a la API.
 *
 * @remarks En 401 con sesión intenta refresh (staff o super) y reintenta una vez.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, _retried = false } = options;
  const authMode = resolveAuthMode(options.auth);
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (authMode === 'staff') {
    const session = readStaffSession();
    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`;
    }
  } else if (authMode === 'super') {
    const session = readSuperSession();
    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`;
    }
  }

  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && authMode && !_retried) {
    const refreshed = await tryRefresh(authMode);
    if (refreshed) {
      return apiRequest<T>(path, { ...options, _retried: true });
    }
    if (authMode === 'super') {
      clearSuperSession();
    } else {
      clearStaffSession();
    }
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

/**
 * Idempotency key corta para mutaciones de mostrador.
 */
export function newIdempotencyKey(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : String(Date.now());
  return `${prefix}-${rand}`;
}

async function tryRefresh(mode: 'staff' | 'super'): Promise<boolean> {
  const refreshToken =
    mode === 'super'
      ? readSuperSession()?.refreshToken
      : readStaffSession()?.refreshToken;
  if (!refreshToken) {
    return false;
  }
  try {
    const res = await fetch(`${apiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      return false;
    }
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    if (mode === 'super') {
      updateSuperTokens(data.accessToken, data.refreshToken);
    } else {
      updateStaffTokens(data.accessToken, data.refreshToken);
    }
    return true;
  } catch {
    return false;
  }
}
