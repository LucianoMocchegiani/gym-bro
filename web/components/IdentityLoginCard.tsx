'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api/client';
import { ContinueWithGoogleButton } from '@/components/ContinueWithGoogleButton';
import { LoginPending } from '@/components/LoginPending';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useIdentityAuth } from '@/lib/auth/IdentityAuthProvider';
import { tenantHostLabel, tenantOrigin } from '@/lib/tenant-host';

/**
 * Login / alta Identity en el apex.
 */
export function IdentityLoginCard({
  nextPath,
}: {
  nextPath: string;
}) {
  const { session, ready, login, register, loginFromCookie } =
    useIdentityAuth();
  const router = useRouter();
  const [cookieTried, setCookieTried] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace(nextPath);
    }
  }, [session, nextPath, router]);

  useEffect(() => {
    if (!ready || session || cookieTried) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await loginFromCookie();
      } catch {
        // Sin cookie o sesión proxy inválida → formulario.
      } finally {
        if (!cancelled) {
          setCookieTried(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session, cookieTried, loginFromCookie]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await register({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
        });
      } else {
        await login(email.trim(), password);
      }
      router.replace(nextPath);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo entrar',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || session || !cookieTried) {
    return <LoginPending message="Cargando sesión…" />;
  }

  return (
    <div className="login-page">
      <div className="login-theme-slot">
        <ThemeToggle />
      </div>
      <form className="login-card" onSubmit={(e) => void onSubmit(e)}>
        <p className="brand">Faciliter</p>
        <h1>{mode === 'register' ? 'Crear cuenta' : 'Tu cuenta'}</h1>
        <p className="muted">
          Para contratar un tenant o ver los que ya tenés.
        </p>
        {error ? <p className="error">{error}</p> : null}
        {mode === 'register' ? (
          <label>
            Nombre
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
        ) : null}
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === 'register' ? 'new-password' : 'current-password'
            }
            minLength={8}
            required
          />
        </label>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting
            ? 'Un momento…'
            : mode === 'register'
              ? 'Crear cuenta'
              : 'Entrar'}
        </button>
        <div style={{ marginTop: '4px' }}>
          <ContinueWithGoogleButton disabled={submitting} />
        </div>
        <p className="muted small">
          {mode === 'login' ? (
            <button
              type="button"
              className="linkish"
              onClick={() => setMode('register')}
            >
              No tengo cuenta
            </button>
          ) : (
            <button
              type="button"
              className="linkish"
              onClick={() => setMode('login')}
            >
              Ya tengo cuenta
            </button>
          )}
        </p>
        <p className="muted small">
          Staff del gym:{' '}
          <a href={`${tenantOrigin('gym-de-prueba')}/login`}>
            {tenantHostLabel('gym-de-prueba')}/login
          </a>
        </p>
      </form>
    </div>
  );
}
