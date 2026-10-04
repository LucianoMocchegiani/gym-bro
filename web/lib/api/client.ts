/**
 * Cliente HTTP tipado hacia `NEXT_PUBLIC_API_URL/api`.
 */

import {
  clearStaffSession,
  readStaffSession,
  updateStaffTokens,
} from '@/lib/auth/session';
import {
  clearIdentitySession,
  readIdentitySession,
  updateIdentityTokens,
} from '@/lib/auth/identity-session';
import {
  clearMemberSession,
  readMemberSession,
  updateMemberTokens,
} from '@/lib/auth/member-session';

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

/** Sesión que firma el request: staff (panel), identity (cuenta Faciliter) o member (socio en la web del gym). */
export type SessionKind = 'staff' | 'identity' | 'member';

type AuthMode = false | SessionKind;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** `true`/`'staff'` (default), `'identity'`, `'member'`, o `false` sin Bearer. */
  auth?: boolean | SessionKind;
  /** Evita loop infinito en refresh. */
  _retried?: boolean;
};

const SESSIONS: Record<
  SessionKind,
  {
    read: () => { accessToken: string; refreshToken: string } | null;
    updateTokens: (accessToken: string, refreshToken: string) => unknown;
    clear: () => void;
  }
> = {
  staff: {
    read: readStaffSession,
    updateTokens: updateStaffTokens,
    clear: clearStaffSession,
  },
  identity: {
    read: readIdentitySession,
    updateTokens: updateIdentityTokens,
    clear: clearIdentitySession,
  },
  member: {
    read: readMemberSession,
    updateTokens: updateMemberTokens,
    clear: clearMemberSession,
  },
};

function resolveAuthMode(auth: boolean | SessionKind | undefined): AuthMode {
  if (auth === false) {
    return false;
  }
  if (auth === 'identity' || auth === 'member') {
    return auth;
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
  if (authMode) {
    const session = SESSIONS[authMode].read();
    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`;
    }
  }

  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && authMode && !_retried) {
    const refreshed = await tryRefresh(authMode);
    if (refreshed) {
      return apiRequest<T>(path, { ...options, _retried: true });
    }
    SESSIONS[authMode].clear();
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
 * GET autenticado que devuelve el cuerpo como Blob (archivos), con refresh y
 * reintento en 401 como {@link apiRequest}.
 */
export async function apiBlob(
  path: string,
  auth: SessionKind = 'staff',
  _retried = false,
): Promise<Blob> {
  const headers: Record<string, string> = {};
  const session = SESSIONS[auth].read();
  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    headers,
    credentials: 'include',
  });
  if (res.status === 401 && !_retried && (await tryRefresh(auth))) {
    return apiBlob(path, auth, true);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiClientError(res.status, body, 'No se pudo descargar el archivo');
  }
  return res.blob();
}

/**
 * POST multipart con Bearer staff (refresh y reintento en 401).
 */
export async function apiMultipart<T>(
  path: string,
  formData: FormData,
  _retried = false,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const session = readStaffSession();
  if (session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });
  if (res.status === 401 && !_retried && (await tryRefresh('staff'))) {
    return apiMultipart<T>(path, formData, true);
  }
  const parsed = (await res.json().catch(() => null)) as unknown;
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

/**
 * Renueva el access Staff (mismo flujo que `apiRequest`). El drawer de chat lo reusa.
 */
export async function refreshStaffAccess(): Promise<boolean> {
  return tryRefresh('staff');
}

async function tryRefresh(mode: SessionKind): Promise<boolean> {
  const refreshToken = SESSIONS[mode].read()?.refreshToken;
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
    SESSIONS[mode].updateTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}
