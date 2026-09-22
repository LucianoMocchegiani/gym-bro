'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api/client';
import { getTenantBySlug } from '@/lib/api/tenants';
import type { PublicTenantSummary } from '@/lib/api/tenants';
import { ThemeToggle } from '@/components/ThemeToggle';
import { fromCookie } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/AuthProvider';
import { platformOrigin, tenantHostLabel, tenantOrigin } from '@/lib/tenant-host';
import { writeStaffSession } from '@/lib/auth/session';

type LoginClientProps = {
  /** Slug resuelto en el servidor desde el header Host. */
  slug: string | null;
};

const LOGIN_PROXY_URL =
  process.env.NEXT_PUBLIC_LOGIN_PROXY_URL ?? 'https://login.faciliter.xyz';

/**
 * Formulario de login Staff (cliente).
 *
 * @remarks El tenant ya viene del Host; no se lee `window` en el render.
 */
export function LoginClient({ slug }: LoginClientProps) {
  const { session, ready, verified, login } = useAuth();
  const router = useRouter();
  const [tenant, setTenant] = useState<PublicTenantSummary | null>(null);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [email, setEmail] = useState('admin@gymdeprueba.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoLoginDone, setAutoLoginDone] = useState(false);

  useEffect(() => {
    if (!slug) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const t = await getTenantBySlug(slug);
        if (!cancelled) {
          setTenant(t);
          setTenantError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setTenantError(
            err instanceof ApiClientError
              ? err.message
              : 'Gym no encontrado',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (ready && verified && session) {
      router.replace('/');
    }
  }, [ready, verified, session, router]);

  useEffect(() => {
    if (autoLoginDone || session || !verified || !slug) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const tokens = await fromCookie();
        if (!cancelled && tokens.accessToken) {
          writeStaffSession(tokens, slug);
          setAutoLoginDone(true);
        }
      } catch {
        // Sin cookie → mostrar formulario normal.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoLoginDone, session, verified, slug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slug) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login({ tenantSlug: slug, email: email.trim(), password });
      router.replace('/');
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'No se pudo iniciar sesión',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!slug) {
    return (
      <div className="login-page">
        <div className="login-theme-slot">
          <ThemeToggle />
        </div>
        <div className="login-card">
          <p className="brand">Faciliter</p>
          <h1>Elegí tu gym</h1>
          <p className="muted">
            Entrá por el subdominio del gym, por ejemplo{' '}
            <a href={`${tenantOrigin('demo')}/login`}>
              {tenantHostLabel('demo')}/login
            </a>
            .
          </p>
          <p className="muted small">
            Super Admin:{' '}
            <a href={`${platformOrigin()}/super/login`}>
              {platformOrigin().replace(/^https?:\/\//, '')}/super/login
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-theme-slot">
        <ThemeToggle />
      </div>
      <form className="login-card" onSubmit={(e) => void onSubmit(e)}>
        <p className="brand">{slug}</p>
        <h1>Acceso staff</h1>
        <p className="muted">
          {tenant ? tenant.name : slug}
          <span className="small"> · {tenantHostLabel(slug)}</span>
        </p>

        {tenantError ? <p className="error">{tenantError}</p> : null}

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            disabled={!!tenantError}
          />
        </label>
        <p className="muted small">
          Demo:{' '}
          <button
            type="button"
            className="link-btn"
            disabled={!!tenantError}
            onClick={() => setEmail('admin@gymdeprueba.com')}
          >
            Admin
          </button>
          {' · '}
          <button
            type="button"
            className="link-btn"
            disabled={!!tenantError}
            onClick={() => setEmail('entrenador@gymdeprueba.com')}
          >
            Entrenador
          </button>
        </p>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={!!tenantError}
          />
        </label>

        {error ? <p className="error">{error}</p> : null}

        <button type="submit" disabled={submitting || !!tenantError}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>

        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            className="btn-google"
            onClick={() => {
              const returnTo = encodeURIComponent(
                typeof window !== 'undefined' ? window.location.href : '',
              );
              window.location.href = `${LOGIN_PROXY_URL}/start?return_to=${returnTo}`;
            }}
            disabled={!!tenantError}
          >
            Continuar con Google
          </button>
        </div>

        <p className="muted small">
          <a href={`${platformOrigin()}/super/login`}>Super Admin</a>
        </p>
      </form>
    </div>
  );
}
