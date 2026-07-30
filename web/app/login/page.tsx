'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthProvider';

const DEMO_TENANT = '00000000-0000-4000-8000-000000000001';

/**
 * Login Staff del panel Admin / puerta.
 */
export default function LoginPage() {
  const { login, session, ready } = useAuth();
  const router = useRouter();
  const [tenantId, setTenantId] = useState(DEMO_TENANT);
  const [email, setEmail] = useState('admin@demo.gym');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && session) {
      router.replace('/');
    }
  }, [ready, session, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ tenantId: tenantId.trim(), email: email.trim(), password });
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

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={(e) => void onSubmit(e)}>
        <p className="brand">GymBro</p>
        <h1>Acceso staff</h1>
        <p className="muted">Panel puerta / Admin</p>

        <label>
          Tenant ID
          <input
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            required
            autoComplete="off"
          />
        </label>
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
