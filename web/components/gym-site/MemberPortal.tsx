'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api/client';
import type { ContractDetail } from '@/lib/api/contracts';
import { getMyAccount, listMyReceipts } from '@/lib/api/member-portal';
import type { MemberAccountDetail } from '@/lib/api/members';
import type { ReceiptDetail } from '@/lib/api/receipts';
import { CheckList } from '@/components/marketing/CheckList';
import { formatMoney } from '@/lib/cash-labels';
import { signOutOfGym } from '@/lib/auth/gym-context';
import { useMemberSession } from '@/lib/auth/useMemberSession';

/** Vuelta de Mercado Pago: `?compra={transactionId}&status=…`. */
export type PurchaseReturn = { id: string; status: string | null };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR');
}

function contractItems(c: ContractDetail): string[] {
  const items = c.creditBalances.map(
    (b) => `${b.remaining} ${b.remaining === 1 ? 'clase' : 'clases'} de ${b.serviceName}`,
  );
  if (c.hasAccessLibre) {
    items.unshift('Acceso libre');
  }
  items.push(c.endsAt ? `Vence el ${formatDate(c.endsAt)}` : 'Sin vencimiento');
  return items;
}

function PurchaseBanner({ purchase }: { purchase: PurchaseReturn }) {
  if (purchase.status === 'approved') {
    return (
      <p className="success">
        Pago aprobado. El plan aparece acá apenas Mercado Pago lo acredita (unos
        segundos).
      </p>
    );
  }
  if (purchase.status === 'pending' || purchase.status === 'in_process') {
    return (
      <p className="muted">
        El pago quedó pendiente. Cuando Mercado Pago lo apruebe, el plan se
        activa solo.
      </p>
    );
  }
  return (
    <p className="error">
      El pago no se completó. Podés intentarlo de nuevo desde los planes.
    </p>
  );
}

/**
 * Portal mínimo del socio en la web del gym: planes vigentes, créditos,
 * resultado del pago y comprobantes.
 */
export function MemberPortal({
  slug,
  purchase,
}: {
  slug: string;
  purchase: PurchaseReturn | null;
}) {
  const router = useRouter();
  const { session, ready } = useMemberSession(slug);
  const [account, setAccount] = useState<MemberAccountDetail | null>(null);
  const [receipts, setReceipts] = useState<ReceiptDetail[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ready) {
      return;
    }
    if (!session) {
      const here = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(here)}`);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [acc, recs] = await Promise.all([
          getMyAccount(),
          listMyReceipts(),
        ]);
        if (!cancelled) {
          setAccount(acc);
          setReceipts(recs.items);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudo cargar tu cuenta',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session, router, reloadKey]);

  if (!ready || !session) {
    return <p className="muted mkt-inner mkt-section">Cargando tu cuenta…</p>;
  }

  return (
    <>
      <section className="mkt-inner mkt-section">
        <p className="eyebrow">Mi cuenta</p>
        <h2 className="mkt-h2">Hola, {session.name ?? session.email}</h2>
        {purchase ? <PurchaseBanner purchase={purchase} /> : null}
        {error ? <p className="error">{error}</p> : null}
        <div className="mkt-hero-actions">
          <button
            type="button"
            className="mkt-btn-ghost"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            Actualizar
          </button>
          <button
            type="button"
            className="mkt-btn-ghost"
            onClick={() => {
              void signOutOfGym().then(() => router.replace('/'));
            }}
          >
            Salir
          </button>
        </div>
      </section>

      <section className="mkt-inner mkt-section">
        <h2 className="mkt-h2">Tus planes vigentes</h2>
        {!account ? (
          <p className="muted">Cargando…</p>
        ) : account.contracts.length === 0 ? (
          <p className="muted">
            No tenés planes vigentes. <Link href="/#planes">Ver planes</Link>
          </p>
        ) : (
          <div className="mkt-plans">
            {account.contracts.map((c) => (
              <div key={c.id} className="mkt-plan">
                <h3>{c.packName}</h3>
                <CheckList items={contractItems(c)} />
              </div>
            ))}
          </div>
        )}
        <p className="muted small">
          Reservas y calendario de clases: desde la app de Faciliter.
        </p>
      </section>

      <section className="mkt-inner mkt-section">
        <h2 className="mkt-h2">Comprobantes</h2>
        {receipts.length === 0 ? (
          <p className="muted">Todavía no hay comprobantes.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Comprobante</th>
                  <th>Fecha</th>
                  <th>Detalle</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id}>
                    <td>{r.code}</td>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>{r.description ?? '—'}</td>
                    <td>{formatMoney(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
