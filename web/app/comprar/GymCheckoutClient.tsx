'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api/client';
import { startMemberSignup } from '@/lib/api/member-portal';
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
import { addToMemberCart, packCartLine } from '@/lib/member-cart';
import { mpCheckoutErrorText, redirectToMpCheckout } from '@/lib/mp-checkout';

type Props = { slug: string; gymName: string; pack: StorePack };

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

/**
 * Comprar un pack desde la web del gym. El socio lo suma al carrito del portal
 * (`/portal/carrito`); quien no es socio carga sus datos y se da de alta recién
 * con el pago aprobado (`/portal?alta=`).
 */
export function GymCheckoutClient({ slug, gymName, pack }: Props) {
  const { session: identity, ready } = useIdentityAuth();
  const { session: member } = useMemberSession(slug);
  const price = formatPackPrice(pack.price, pack.billingPeriod);

  if (!ready) {
    return <LoginPending message="Cargando…" />;
  }
  if (member) {
    return (
      <AddToCartStep
        owner={`${member.tenantId}:${member.memberId}`}
        pack={pack}
      />
    );
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
      pack={pack}
      defaultName={identity.name ?? ''}
      email={identity.email}
    />
  );
}

function PackSummary({ pack }: { pack: StorePack }) {
  return (
    <>
      <p className="mkt-price">
        {formatPackPrice(pack.price, pack.billingPeriod)}
      </p>
      {pack.description ? <p className="muted">{pack.description}</p> : null}
      <CheckList items={pack.components.map(storeComponentLabel)} />
    </>
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
 * Si ya es socio entra al gym (y el pack va al carrito); si no, nombre, DNI y
 * teléfono y va a Mercado Pago. El alta se completa con el pago aprobado
 * (RN-CTA-007).
 */
function JoinStep({
  slug,
  gymName,
  pack,
  defaultName,
  email,
}: {
  slug: string;
  gymName: string;
  pack: StorePack;
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
      const checkout = await startMemberSignup({
        tenantSlug: slug,
        packId: pack.id,
        name: name.trim(),
        document: document.trim(),
        phone: phone.trim() || undefined,
      });
      redirectToMpCheckout(checkout);
    } catch (err) {
      setError(mpCheckoutErrorText(err));
      setSubmitting(false);
    }
  }

  if (checking) {
    return <LoginPending message="Revisando tu cuenta…" />;
  }

  return (
    <CheckoutCard gymName={gymName} title={pack.name}>
      <PackSummary pack={pack} />
      <form onSubmit={(e) => void onSubmit(e)}>
        <p className="muted">
          Tus datos de socio. Te damos de alta en {gymName} con {email} cuando
          se apruebe el pago.
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
          {submitting ? 'Abriendo Mercado Pago…' : 'Pagar con Mercado Pago'}
        </button>
      </form>
      <SwitchAccountButton />
    </CheckoutCard>
  );
}

/** Socio: el pack va al carrito del portal y se paga junto con lo demás. */
function AddToCartStep({ owner, pack }: { owner: string; pack: StorePack }) {
  const router = useRouter();

  useEffect(() => {
    addToMemberCart(owner, packCartLine(pack));
    router.replace('/portal/carrito');
  }, [owner, pack, router]);

  return <LoginPending message="Agregando al carrito…" />;
}
