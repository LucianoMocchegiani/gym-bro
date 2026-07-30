'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api/client';
import { getTenantBySlug } from '@/lib/api/tenants';
import type { PublicTenantSummary } from '@/lib/api/tenants';
import { useAuth } from '@/lib/auth/AuthProvider';
import { platformOrigin, tenantOrigin } from '@/lib/tenant-host';

type LoginClientProps = {
  /** Slug resuelto en el servidor desde el header Host. */
  slug: string | null;
};

/**
 * Formulario de login Staff (cliente).
 *
 * @remarks El tenant ya viene del Host; no se lee `window` en el render.
 */
export function LoginClient({ slug }: LoginClientProps) {
  const { login, session, ready } = useAuth();
  const router = useRouter();
  const [tenant, setTenant] = useState<PublicTenantSummary | null>(null);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [email, setEmail] = useState('admin@demo.gym');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    if (ready && session) {
      router.replace('/');
    }
  }, [ready, session, router]);

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
        <div className="login-card">
          <p className="brand">GymBro</p>
          <h1>Elegí tu gym</h1>
          <p className="muted">
            Entrá por el subdominio del gym, por ejemplo{' '}
            <a href={`${tenantOrigin('demo')}/login`}>
              demo.localhost:3000/login
            </a>
            .
          </p>
          <p className="muted small">
            Super Admin:{' '}
            <Link href="/super/login">localhost:3000/super/login</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={(e) => void onSubmit(e)}>
        <p className="brand">GymBro</p>
        <h1>Acceso staff</h1>
        <p className="muted">
          {tenant ? tenant.name : slug}
          <span className="small"> · {slug}.localhost</span>
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

        <p className="muted small">
          <a href={`${platformOrigin()}/super/login`}>Super Admin</a>
        </p>
      </form>
    </div>
  );
}
