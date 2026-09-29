'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api/client';
import { getTenantBySlug } from '@/lib/api/tenants';
import type { PublicTenantSummary } from '@/lib/api/tenants';
import { ThemeToggle } from '@/components/ThemeToggle';
import { fromCookie, fromHandoff } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/AuthProvider';
import { tenantHostLabel, tenantOrigin } from '@/lib/tenant-host';
import { writeStaffSession } from '@/lib/auth/session';
import { ContinueWithGoogleButton } from '@/components/ContinueWithGoogleButton';
import { IdentityLoginCard } from '@/components/IdentityLoginCard';
import { LoginPending } from '@/components/LoginPending';

type LoginClientProps = {
  /** Slug resuelto en el servidor desde el header Host. */
  slug: string | null;
  /** `?handoff=1`: canjea cookie de impersonación en este origen. */
  consumeHandoff?: boolean;
  /** Tras login Identity en apex. */
  nextPath?: string;
};

/**
 * Formulario de login Staff (cliente).
 *
 * @remarks El tenant ya viene del Host; no se lee `window` en el render.
 */
export function LoginClient({
  slug,
  consumeHandoff = false,
  nextPath = '/cuenta',
}: LoginClientProps) {
  const { session, ready, verified, login } = useAuth();
  const router = useRouter();
  const [tenant, setTenant] = useState<PublicTenantSummary | null>(null);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [email, setEmail] = useState('admin@gymdeprueba.com');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoLoginDone, setAutoLoginDone] = useState(false);
  /** Canje de impersonación: no mostrar el form hasta que falle. */
  const [handoffFailed, setHandoffFailed] = useState(false);
  const handoffStarted = useRef(false);

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
    if (!ready || !verified || !session) {
      return;
    }
    if (consumeHandoff && !autoLoginDone) {
      return;
    }
    router.replace('/');
  }, [ready, verified, session, router, consumeHandoff, autoLoginDone]);

  useEffect(() => {
    if (!consumeHandoff || !verified || handoffStarted.current) {
      return;
    }
    handoffStarted.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const tokens = await fromHandoff();
        if (cancelled) {
          return;
        }
        if (tokens.accessToken) {
          writeStaffSession(tokens, slug, true);
          router.replace('/');
          return;
        }
        setHandoffFailed(true);
      } catch {
        if (!cancelled) {
          setHandoffFailed(true);
        }
      } finally {
        if (!cancelled) {
          setAutoLoginDone(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [consumeHandoff, verified, slug, router]);

  useEffect(() => {
    if (consumeHandoff || autoLoginDone || session || !verified || !slug) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const tokens = await fromCookie(slug);
        if (!cancelled && tokens.accessToken) {
          writeStaffSession(tokens, slug);
        }
      } catch {
        // Sin cookie → formulario.
      } finally {
        if (!cancelled) {
          setAutoLoginDone(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoLoginDone, session, verified, slug, consumeHandoff]);

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

  const handoffBusy = consumeHandoff && !handoffFailed;

  if (handoffBusy) {
    return (
      <div className="login-page">
        <div className="login-theme-slot">
          <ThemeToggle />
        </div>
        <div className="login-card">
          <p className="brand">{slug ?? 'Faciliter'}</p>
          <h1>Entrando al gym</h1>
          <p className="muted">
            {tenant ? tenant.name : slug}
            {slug ? (
              <span className="small"> · {tenantHostLabel(slug)}</span>
            ) : null}
          </p>
          <p className="muted">Impersonación de plataforma. Un momento…</p>
        </div>
      </div>
    );
  }

  if (!slug) {
    return <IdentityLoginCard nextPath={nextPath} />;
  }

  if (!ready || !verified || session || !autoLoginDone) {
    return <LoginPending message="Cargando sesión…" />;
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

        {handoffFailed ? (
          <p className="error">
            No se pudo entrar con la impersonación. Pedila de nuevo desde
            plataforma.
          </p>
        ) : null}

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
          <ContinueWithGoogleButton disabled={!!tenantError} />
        </div>
      </form>
    </div>
  );
}
