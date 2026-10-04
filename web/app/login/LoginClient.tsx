'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api/client';
import { getTenantBySlug } from '@/lib/api/tenants';
import type { PublicTenantSummary } from '@/lib/api/tenants';
import { ThemeToggle } from '@/components/ThemeToggle';
import { fromHandoff } from '@/lib/api/auth';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useIdentityAuth } from '@/lib/auth/IdentityAuthProvider';
import { profileForPath } from '@/lib/auth/gym-context';
import { useMemberSession } from '@/lib/auth/useMemberSession';
import { tenantHostLabel } from '@/lib/tenant-host';
import { writeStaffSession } from '@/lib/auth/session';
import { GymContextPicker } from '@/components/GymContextPicker';
import { IdentityLoginCard } from '@/components/IdentityLoginCard';
import { LoginPending } from '@/components/LoginPending';

type LoginClientProps = {
  /** Slug resuelto en el servidor desde el header Host. */
  slug: string | null;
  /** `?handoff=1`: canjea cookie de impersonación en este origen. */
  consumeHandoff?: boolean;
  /** `?next=` ya validado (path relativo). */
  nextPath: string | null;
};

/**
 * Apex: cuenta Faciliter. Gym: login unificado de socios y staff.
 */
export function LoginClient({
  slug,
  consumeHandoff = false,
  nextPath,
}: LoginClientProps) {
  if (!slug) {
    return <IdentityLoginCard nextPath={nextPath ?? '/cuenta'} />;
  }
  return (
    <GymLoginClient
      slug={slug}
      consumeHandoff={consumeHandoff}
      nextPath={nextPath}
    />
  );
}

/**
 * Cuenta Faciliter (mail o Google) → perfiles en este gym → panel o portal.
 *
 * @remarks El tenant viene del Host. La impersonación de plataforma entra
 * directo al panel con la cookie de handoff.
 */
function GymLoginClient({
  slug,
  consumeHandoff,
  nextPath,
}: {
  slug: string;
  consumeHandoff: boolean;
  nextPath: string | null;
}) {
  const { session: staffSession, ready, verified } = useAuth();
  const { session: identity, ready: identityReady } = useIdentityAuth();
  const { session: memberSession } = useMemberSession(slug);
  const router = useRouter();
  const [tenant, setTenant] = useState<PublicTenantSummary | null>(null);
  const [tenantError, setTenantError] = useState<string | null>(null);
  /** Canje de impersonación: no mostrar el login hasta que falle. */
  const [handoffFailed, setHandoffFailed] = useState(false);
  const handoffStarted = useRef(false);

  const preferred = profileForPath(nextPath);
  const resumeTo =
    staffSession && preferred !== 'MEMBER'
      ? preferred === 'STAFF' && nextPath
        ? nextPath
        : '/dashboard'
      : memberSession && preferred !== 'STAFF'
        ? preferred === 'MEMBER' && nextPath
          ? nextPath
          : '/portal'
        : null;

  useEffect(() => {
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
            err instanceof ApiClientError ? err.message : 'Gym no encontrado',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (consumeHandoff || !ready || !verified || !resumeTo) {
      return;
    }
    router.replace(resumeTo);
  }, [consumeHandoff, ready, verified, resumeTo, router]);

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
          router.replace('/dashboard');
          return;
        }
        setHandoffFailed(true);
      } catch {
        if (!cancelled) {
          setHandoffFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [consumeHandoff, verified, slug, router]);

  const gymName = tenant?.name ?? slug;

  if (consumeHandoff) {
    return (
      <div className="login-page">
        <div className="login-theme-slot">
          <ThemeToggle />
        </div>
        <div className="login-card">
          <p className="brand">{slug}</p>
          <h1>Entrando al gym</h1>
          <p className="muted">
            {gymName}
            <span className="small"> · {tenantHostLabel(slug)}</span>
          </p>
          {handoffFailed ? (
            <>
              <p className="error">
                No se pudo entrar con la impersonación. Pedila de nuevo desde
                plataforma.
              </p>
              <Link className="btn" href="/login">
                Entrar con mi cuenta
              </Link>
            </>
          ) : (
            <p className="muted">Impersonación de plataforma. Un momento…</p>
          )}
        </div>
      </div>
    );
  }

  if (tenantError) {
    return (
      <div className="login-page">
        <div className="login-theme-slot">
          <ThemeToggle />
        </div>
        <div className="login-card">
          <p className="brand">{slug}</p>
          <p className="error">{tenantError}</p>
        </div>
      </div>
    );
  }

  if (!ready || !verified || !identityReady || resumeTo) {
    return <LoginPending message="Cargando sesión…" />;
  }

  if (!identity) {
    return (
      <IdentityLoginCard
        brand={slug}
        title={`Entrá a ${gymName}`}
        subtitle="Socios y staff entran con su cuenta Faciliter (mail o Google)."
      />
    );
  }

  return (
    <GymContextPicker slug={slug} gymName={gymName} nextPath={nextPath} />
  );
}
