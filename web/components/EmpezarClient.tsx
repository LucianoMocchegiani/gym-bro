'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { ApiClientError } from '@/lib/api/client';
import { startPlatformSignup } from '@/lib/api/identity-platform';
import type { PublicPlatformPack } from '@/lib/api/public-platform';
import { useIdentityAuth } from '@/lib/auth/IdentityAuthProvider';
import { formatMoney } from '@/lib/cash-labels';
import { tenantOrigin } from '@/lib/tenant-host';

/**
 * Formulario de alta: gym + slug + pack, luego Mercado Pago.
 */
export function EmpezarClient({
  packs,
  initialPackId,
}: {
  packs: PublicPlatformPack[];
  initialPackId: string | null;
}) {
  const { session, ready } = useIdentityAuth();
  const router = useRouter();
  const [packId, setPackId] = useState(initialPackId ?? packs[0]?.id ?? '');
  const [gymName, setGymName] = useState('');
  const [slug, setSlug] = useState('');
  /** `null` = todavía no lo tocó: se muestra el mail de la sesión. */
  const [payerEmail, setPayerEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pack = useMemo(
    () => packs.find((p) => p.id === packId) ?? null,
    [packs, packId],
  );

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!session) {
      const next = packId
        ? `/empezar?pack=${encodeURIComponent(packId)}`
        : '/empezar';
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [ready, session, router, packId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!packId) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const signup = await startPlatformSignup({
        packId,
        slug,
        gymName,
        payerEmail: (payerEmail ?? session?.email ?? '').trim() || undefined,
      });
      if (signup.checkoutUrl) {
        window.location.assign(signup.checkoutUrl);
        return;
      }
      router.replace(`/cuenta?signup=${signup.id}`);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo armar el checkout',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !session) {
    return (
      <MarketingShell>
        <p className="muted">Cargando sesión…</p>
      </MarketingShell>
    );
  }

  if (packs.length === 0) {
    return (
      <MarketingShell>
        <h1>Contratar</h1>
        <p className="muted">No hay packs publicados ahora.</p>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <section className="mkt-inner mkt-section">
        <h1 className="mkt-h2">Tu gym en Faciliter</h1>
        <p className="mkt-section-lead">
          Elegí el plan, el nombre y el subdominio. Después Mercado Pago
          autoriza el débito. Con prueba el primer mes no se cobra.
        </p>
        <form className="login-card" onSubmit={(e) => void onSubmit(e)}>
          {error ? <p className="error">{error}</p> : null}
          <label>
            Plan
            <select
              value={packId}
              onChange={(e) => setPackId(e.target.value)}
            >
              {packs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.price >= 1 ? ` · ${formatMoney(p.price)}/mes` : ''}
                </option>
              ))}
            </select>
          </label>
          {pack ? (
            <p className="muted small">{pack.description}</p>
          ) : null}
          <label>
            Nombre del gym
            <input
              type="text"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              required
              minLength={2}
            />
          </label>
          <label>
            Subdominio
            <input
              type="text"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              }
              required
              minLength={2}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="iron-gym"
            />
          </label>
          <p className="muted small">
            Dirección: {slug ? tenantOrigin(slug) : 'https://tu-slug…'}
          </p>
          <label>
            Mail de tu cuenta de Mercado Pago
            <input
              type="email"
              value={payerEmail ?? session.email}
              onChange={(e) => setPayerEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <p className="muted small">
            Mercado Pago solo deja autorizar el débito a la cuenta con este
            mail. Si pagás con otra cuenta de MP, cambialo acá.
          </p>
          <button type="submit" className="btn primary" disabled={submitting}>
            {submitting ? 'Creando checkout…' : 'Continuar a Mercado Pago'}
          </button>
        </form>
      </section>
    </MarketingShell>
  );
}
