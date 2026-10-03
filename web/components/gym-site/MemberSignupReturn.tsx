'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api/client';
import { getMemberSignup } from '@/lib/api/member-portal';
import { enterGym } from '@/lib/auth/gym-context';
import { useIdentityAuth } from '@/lib/auth/IdentityAuthProvider';
import { useMemberSession } from '@/lib/auth/useMemberSession';
import { MemberPortal } from './MemberPortal';

const POLL_MS = 3000;
const MAX_POLLS = 40;

/** Estados de MP con los que vale la pena esperar el webhook. */
const PAID_OR_PENDING = new Set(['approved', 'pending', 'in_process']);

type Phase = 'waiting' | 'failed' | 'timeout' | 'error';

/**
 * Vuelta de Mercado Pago de un alta web (`/cuenta?alta={signupId}`): el socio
 * nace con el webhook del pago aprobado, así que se consulta la solicitud
 * hasta que esté lista y recién ahí se entra al portal (RN-CTA-007).
 */
export function MemberSignupReturn({
  slug,
  signupId,
  mpStatus,
}: {
  slug: string;
  signupId: string;
  mpStatus: string | null;
}) {
  const router = useRouter();
  const { session: identity, ready: identityReady } = useIdentityAuth();
  const { session: member, ready: memberReady } = useMemberSession(slug);
  const [phase, setPhase] = useState<Phase>('waiting');
  const [error, setError] = useState<string | null>(null);
  const [pollKey, setPollKey] = useState(0);
  const paid = mpStatus !== null && PAID_OR_PENDING.has(mpStatus);

  useEffect(() => {
    if (!identityReady || !memberReady || member || !paid) {
      return;
    }
    if (!identity) {
      const here = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(here)}`);
      return;
    }
    let cancelled = false;
    void (async () => {
      for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
        try {
          const signup = await getMemberSignup(signupId);
          if (cancelled) {
            return;
          }
          if (signup.status === 'COMPLETED') {
            await enterGym({
              slug,
              tenantId: signup.tenantId,
              profile: 'MEMBER',
            });
            return;
          }
          if (signup.status === 'FAILED') {
            setPhase('failed');
            return;
          }
        } catch (err) {
          if (!cancelled) {
            setError(
              err instanceof ApiClientError
                ? err.message
                : 'No se pudo consultar tu alta',
            );
            setPhase('error');
          }
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        if (cancelled) {
          return;
        }
      }
      setPhase('timeout');
    })();
    return () => {
      cancelled = true;
    };
  }, [identityReady, memberReady, identity, member, paid, signupId, slug, router, pollKey]);

  if (member) {
    return (
      <MemberPortal
        slug={slug}
        purchase={{ id: signupId, status: mpStatus }}
      />
    );
  }

  if (!paid) {
    return (
      <section className="mkt-inner mkt-section">
        <p className="eyebrow">Alta</p>
        <h2 className="mkt-h2">El pago no se completó</h2>
        <p className="muted">
          No te dimos de alta ni se te cobró nada. Podés intentarlo de nuevo
          cuando quieras.
        </p>
        <Link className="mkt-btn-primary" href="/#planes">
          Ver planes
        </Link>
      </section>
    );
  }

  return (
    <section className="mkt-inner mkt-section">
      <p className="eyebrow">Alta</p>
      {phase === 'waiting' ? (
        <>
          <h2 className="mkt-h2">Confirmando tu pago…</h2>
          <p className="muted">
            {mpStatus === 'approved'
              ? 'Mercado Pago aprobó el pago. En unos segundos quedás dado de alta.'
              : 'El pago está pendiente en Mercado Pago. Cuando se apruebe, quedás dado de alta.'}
          </p>
        </>
      ) : null}
      {phase === 'failed' ? (
        <>
          <h2 className="mkt-h2">No pudimos completar tu alta</h2>
          <p className="error">
            Recibimos tu pago, pero tus datos coinciden con otro socio del gym.
            Escribile al gym con el comprobante de Mercado Pago y lo resuelven.
          </p>
        </>
      ) : null}
      {phase === 'timeout' || phase === 'error' ? (
        <>
          <h2 className="mkt-h2">Todavía no tenemos la confirmación</h2>
          <p className="muted">
            {error ??
              'Mercado Pago aún no nos avisó del pago. Probá de nuevo en unos minutos.'}
          </p>
          <button
            type="button"
            className="mkt-btn-ghost"
            onClick={() => {
              setError(null);
              setPhase('waiting');
              setPollKey((k) => k + 1);
            }}
          >
            Volver a consultar
          </button>
        </>
      ) : null}
    </section>
  );
}
