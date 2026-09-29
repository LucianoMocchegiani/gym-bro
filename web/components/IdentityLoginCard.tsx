'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useIdentityAuth } from '@/lib/auth/IdentityAuthProvider';
import { tenantHostLabel, tenantOrigin } from '@/lib/tenant-host';

/**
 * Login / alta Identity en el apex (contratar gym).
 */
export function IdentityLoginCard({
  nextPath,
}: {
  nextPath: string;
}) {
  const { session, login, register } = useIdentityAuth();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.replace(nextPath);
    }
  }, [session, nextPath, router]);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="login-page">
      <div className="login-theme-slot">
        <ThemeToggle />
      </div>
      <form className="login-card" onSubmit={(e) => void onSubmit(e)}>
        <p className="brand">Faciliter</p>
        <h1>{mode === 'register' ? 'Crear cuenta' : 'Tu cuenta'}</h1>
        <p className="muted">
          Para contratar un gym o ver los que ya tenés.
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
