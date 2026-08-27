'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Panel } from '@/components/AdminUi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SkeletonPanel } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import { cancelContract } from '@/lib/api/contracts';
import type { ContractDetail } from '@/lib/api/contracts';
import { getMemberAccount } from '@/lib/api/members';
import type { MemberAccountDetail } from '@/lib/api/members';

/**
 * Estado de cuenta del afiliado (CU-AFI-004): contrato activo, reservas, créditos.
 *
 * @remarks Pagos, comprobantes y credenciales se movieron a reportes y
 * un panel separado de credenciales respectivamente.
 */
export function MemberAccountPanel({
  memberId,
  embedded = false,
}: {
  memberId: string;
  embedded?: boolean;
}) {
  const [account, setAccount] = useState<MemberAccountDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [cancelTarget, setCancelTarget] = useState<ContractDetail | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelOk, setCancelOk] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const acc = await getMemberAccount(memberId);
        if (cancelled) return;
        setAccount(acc);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el estado de cuenta',
        );
      }
    })();
    return () => { cancelled = true; };
  }, [memberId]);

  function openCancel(contract: ContractDetail) {
    setCancelTarget(contract);
    setCancelReason('');
    setCancelConfirmOpen(false);
    setCancelError(null);
    setCancelOk(null);
  }

  function closeCancel() {
    setCancelTarget(null);
    setCancelReason('');
    setCancelConfirmOpen(false);
    setCancelError(null);
  }

  async function onCancelContract(e: FormEvent) {
    e.preventDefault();
    if (!cancelTarget) return;
    setCancelConfirmOpen(true);
  }

  async function doCancelContract() {
    if (!cancelTarget) return;
    setCancelBusy(true);
    setCancelError(null);
    setCancelOk(null);
    try {
      await cancelContract(cancelTarget.id, cancelReason);
      setCancelOk(`Contrato «${cancelTarget.packName}» cancelado.`);
      setCancelTarget(null);
      setCancelReason('');
      const acc = await getMemberAccount(memberId);
      setAccount(acc);
    } catch (err) {
      setCancelError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cancelar el contrato',
      );
    } finally {
      setCancelBusy(false);
    }
  }

  if (loadError) return <p className="error">{loadError}</p>;
  if (!account) return <SkeletonPanel lines={5} />;

  const activeContracts = account.contracts.filter((c) => c.status === 'ACTIVE');
  const reservations = account.reservations;

  const body = (
    <>
      <div className="stat-row">
        <div>
          <p className="muted small">Contratos activos</p>
          <p className="stat-value">{account.summary.activeContracts}</p>
        </div>
        <div>
          <p className="muted small">Acceso libre</p>
          <p className="stat-value">
            {account.summary.hasAccessLibre ? 'Sí' : 'No'}
          </p>
        </div>
        <div>
          <p className="muted small">Sesiones disponibles</p>
          <p className="stat-value">{account.summary.totalCreditsRemaining}</p>
        </div>
        <div>
          <p className="muted small">Deuda</p>
          <p className="stat-value">
            {account.debt.status === 'AL_DIA'
              ? 'Al día'
              : `$${account.debt.amount}`}
          </p>
        </div>
      </div>

      <h3>Contrato activo</h3>
      {activeContracts.length === 0 ? (
        <p className="muted">Sin contrato activo.</p>
      ) : (
        <ul className="plain-list">
          {activeContracts.map((c) => (
            <li key={c.id}>
              <strong>{c.packName}</strong>
              {c.hasAccessLibre ? ' · acceso libre' : ''}
              {c.creditBalances?.length
                ? ` · sesiones: ${c.creditBalances
                    .map(
                      (b) =>
                        `${b.serviceName ?? b.serviceId}: ${b.remaining}`,
                    )
                    .join(', ')}`
                : ''}
              {' · '}
              <button
                type="button"
                className="linkish"
                onClick={() => openCancel(c)}
              >
                Cancelar
              </button>
            </li>
          ))}
        </ul>
      )}

      {cancelOk ? <p className="ok-msg">{cancelOk}</p> : null}

      {cancelTarget ? (
        <form
          className="admin-form"
          onSubmit={(e) => void onCancelContract(e)}
        >
          <h3>Cancelar «{cancelTarget.packName}»</h3>
          <p className="muted small">
            Corta acceso libre y sesiones. <strong>No</strong> reembolsa el pago
            (para eso usá Devolver). El motivo opcional queda en auditoría.
          </p>
          <label>
            Motivo (opcional)
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Ej. incumplimiento de normas"
            />
          </label>
          {cancelError ? <p className="error">{cancelError}</p> : null}
          <div className="form-actions">
            <button
              type="submit"
              className="btn danger"
              disabled={cancelBusy}
            >
              {cancelBusy ? 'Cancelando…' : 'Cancelar contrato'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={closeCancel}
              disabled={cancelBusy}
            >
              Cerrar
            </button>
          </div>
        </form>
      ) : null}

      <h3>Próximas reservas</h3>
      {reservations.length === 0 ? (
        <p className="muted">Sin reservas próximas.</p>
      ) : (
        <ul className="plain-list">
          {reservations.map((r) => (
            <li key={r.id}>
              {r.serviceName} — {new Date(r.startsAt).toLocaleString('es-AR')} (
              {r.coverage})
            </li>
          ))}
        </ul>
      )}

      <div className="form-actions">
        <Link
          href={`/reportes?memberId=${encodeURIComponent(memberId)}`}
          className="btn ghost"
        >
          Ver en reportes
        </Link>
      </div>

      <ConfirmDialog
        open={cancelConfirmOpen}
        title={`Cancelar «${cancelTarget?.packName ?? ''}»`}
        description="Corta acceso libre y sesiones. No reembolsa el pago (para eso usá Devolver). El motivo queda en auditoría."
        confirmLabel="Confirmar cancelación"
        tone="danger"
        confirmWord="CANCELAR"
        busy={cancelBusy}
        onConfirm={() => {
          setCancelConfirmOpen(false);
          void doCancelContract();
        }}
        onCancel={() => setCancelConfirmOpen(false)}
      />
    </>
  );

  if (embedded) {
    return <div className="account-panel admin-stack">{body}</div>;
  }

  return (
    <Panel
      title="Estado de cuenta"
      description="Contrato activo, sesiones disponibles y reservas."
      className="account-panel"
    >
      {body}
    </Panel>
  );
}
