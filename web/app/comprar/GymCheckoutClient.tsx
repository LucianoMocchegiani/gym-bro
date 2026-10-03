'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api/client';
import { pickMpCartCheckoutUrl } from '@/lib/api/mercadopago';
import { selfJoinGym, startMyPackCheckout } from '@/lib/api/member-portal';
import {
  storeComponentLabel,
  type StorePack,
} from '@/lib/api/public-tenant-catalog';
import { CheckList } from '@/components/marketing/CheckList';
import { formatPackPrice } from '@/components/marketing/PackPlanCard';
import { IdentityLoginCard } from '@/components/IdentityLoginCard';
import { LoginPending } from '@/components/LoginPending';
import { SwitchAccountButton } from '@/components/GymContextPicker';
import { ThemeToggle } from '@/components/ThemeToggle';
import { enterGym, resolveGymProfiles } from '@/lib/auth/gym-context';
import { useIdentityAuth } from '@/lib/auth/IdentityAuthProvider';
import { useMemberSession } from '@/lib/auth/useMemberSession';

type Props = { slug: string; gymName: string; pack: StorePack };

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

/**
 * Comprar un pack desde la web del gym: cuenta Faciliter → socio (alta si
 * hace falta) → checkout Mercado Pago → vuelve a `/cuenta?compra=`.
 */
export function GymCheckoutClient({ slug, gymName, pack }: Props) {
  const { session: identity, ready } = useIdentityAuth();
  const { session: member } = useMemberSession(slug);
  const price = formatPackPrice(pack.price, pack.billingPeriod);

  if (!ready) {
    return <LoginPending message="Cargando…" />;
  }
  if (member) {
    return <PayStep slug={slug} gymName={gymName} pack={pack} />;
  }
  if (!identity) {
    return (
      <IdentityLoginCard
        brand={gymName}
        title="Comprá tu plan"
        subtitle={`${pack.name} · ${price}. Entrá o creá tu cuenta Faciliter para seguir.`}
      />
    );
  }
  return (
    <JoinStep
      slug={slug}
      gymName={gymName}
      defaultName={identity.name ?? ''}
      email={identity.email}
    />
  );
}

function CheckoutCard({
  gymName,
  title,
  children,
}: {
  gymName: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="login-page">
      <div className="login-theme-slot">
        <ThemeToggle />
      </div>
      <div className="login-card">
        <p className="brand">{gymName}</p>
        <h1>{title}</h1>
        {children}
      </div>
    </div>
  );
}

/**
 * Si ya es socio entra directo; si no, alta con nombre, DNI y teléfono.
 */
function JoinStep({
  slug,
  gymName,
  defaultName,
  email,
}: {
  slug: string;
  gymName: string;
  defaultName: string;
  email: string;
}) {
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState(defaultName);
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profiles = await resolveGymProfiles(slug);
        if (profiles.member && profiles.tenantId) {
          await enterGym({ slug, tenantId: profiles.tenantId, profile: 'MEMBER' });
          return;
        }
      } catch (err) {
        if (!cancelled) {
          setError(errorText(err, 'No se pudo leer tu cuenta'));
        }
      }
      if (!cancelled) {
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const joined = await selfJoinGym({
        tenantSlug: slug,
        name: name.trim(),
        document: document.trim(),
        phone: phone.trim() || undefined,
      });
      await enterGym({ slug, tenantId: joined.tenantId, profile: 'MEMBER' });
    } catch (err) {
      setError(errorText(err, 'No se pudo completar el alta'));
      setSubmitting(false);
    }
  }

  if (checking) {
    return <LoginPending message="Revisando tu cuenta…" />;
  }

  return (
    <CheckoutCard gymName={gymName} title="Tus datos de socio">
      <form onSubmit={(e) => void onSubmit(e)}>
        <p className="muted">
          Te damos de alta en {gymName} con {email}.
        </p>
        {error ? <p className="error">{error}</p> : null}
        <label>
          Nombre y apellido
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            minLength={2}
            required
          />
        </label>
        <label>
          DNI
          <input
            type="text"
            inputMode="numeric"
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            minLength={6}
            maxLength={40}
            required
          />
        </label>
        <label>
          Teléfono (opcional)
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            maxLength={40}
          />
        </label>
        <button type="submit" className="btn primary" disabled={submitting}>
          {submitting ? 'Un momento…' : 'Continuar'}
        </button>
      </form>
      <SwitchAccountButton />
    </CheckoutCard>
  );
}

function PayStep({ slug, gymName, pack }: Props) {
  const { session } = useMemberSession(slug);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  async function pay() {
    setError(null);
    setPaying(true);
    try {
      const checkout = await startMyPackCheckout(pack.id);
      const url = pickMpCartCheckoutUrl(checkout);
      if (!url) {
        throw new Error('Mercado Pago no devolvió el link de pago');
      }
      window.location.assign(url);
    } catch (err) {
      setError(
        err instanceof ApiClientError || err instanceof Error
          ? err.message
          : 'No se pudo iniciar el pago',
      );
      setPaying(false);
    }
  }

  return (
    <CheckoutCard gymName={gymName} title={pack.name}>
      <p className="mkt-price">
        {formatPackPrice(pack.price, pack.billingPeriod)}
      </p>
      {pack.description ? <p className="muted">{pack.description}</p> : null}
      <CheckList items={pack.components.map(storeComponentLabel)} />
      <p className="muted small">Socio: {session?.name ?? session?.email}</p>
      {error ? <p className="error">{error}</p> : null}
      <button
        type="button"
        className="btn primary"
        disabled={paying}
        onClick={() => void pay()}
      >
        {paying ? 'Abriendo Mercado Pago…' : 'Pagar con Mercado Pago'}
      </button>
      <p className="muted small">
        <Link href="/">Ver otros planes</Link>
      </p>
      <SwitchAccountButton />
    </CheckoutCard>
  );
}
