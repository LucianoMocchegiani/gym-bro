'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ApiClientError } from '@/lib/api/client';
import { SuperAuthProvider, useSuperAuth } from '@/lib/auth/SuperAuthProvider';
import { isPlatformHost, platformOrigin } from '@/lib/tenant-host';

/**
 * Login Super Admin (plataforma).
 */
export default function SuperLoginPage() {
  return (
    <SuperAuthProvider>
      <SuperLoginInner />
    </SuperAuthProvider>
  );
}

function SuperLoginInner() {
  const { login, session, ready } = useSuperAuth();
  const router = useRouter();
  const [email, setEmail] = useState('super@gymbro.local');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (!isPlatformHost(host)) {
        window.location.replace(`${platformOrigin()}/super/login`);
      }
    }
  }, []);

  useEffect(() => {
    if (ready && session) {
      router.replace('/super/tenants');
    }
  }, [ready, session, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      router.replace('/super/tenants');
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo iniciar sesión',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-theme-slot">
        <ThemeToggle />
      </div>
      <form className="login-card" onSubmit={(e) => void onSubmit(e)}>
        <p className="brand">SUPER</p>
        <h1>Super Admin</h1>
        <p className="muted">Plataforma (sin tenant)</p>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
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
          />
        </label>

        {error ? <p className="error">{error}</p> : null}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
