'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DataTable } from '@/components/AdminList';
import { Panel } from '@/components/AdminUi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusPill } from '@/components/StatusPill';
import { SkeletonCards } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import { cancelContract } from '@/lib/api/contracts';
import type { ContractDetail } from '@/lib/api/contracts';
import { getMemberAccount } from '@/lib/api/members';
import type { MemberAccountDetail } from '@/lib/api/members';

function format_date(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR');
}

function format_datetime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR');
}

/**
 * Estado de cuenta del afiliado (CU-AFI-004): contrato activo, reservas, créditos.
 */
export function MemberAccountPanel({
  memberId,
}: {
  memberId: string;
}) {
  const [account, setAccount] = useState<MemberAccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [cancelTarget, setCancelTarget] = useState<ContractDetail | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelOk, setCancelOk] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
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
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [memberId]);

  function openCancel(contract: ContractDetail) {
    setCancelTarget(contract);
    setCancelReason('');
    setCancelError(null);
    setCancelOk(null);
  }

  function closeCancel() {
    setCancelTarget(null);
    setCancelReason('');
    setCancelError(null);
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

  const activeContracts = account?.contracts.filter((c) => c.status === 'ACTIVE') ?? [];
  const reservations = account?.reservations ?? [];

  return (
    <div className="admin-stack">
      {loading ? (
        <SkeletonCards count={4} />
      ) : account ? (
        <Panel>
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
        </Panel>
      ) : null}

      <DataTable
        title="Contratos activos"
        description={`${activeContracts.length} activo${activeContracts.length === 1 ? '' : 's'}`}
        loading={loading}
        error={loadError}
        isEmpty={activeContracts.length === 0}
        emptyText="Sin contrato activo."
        paginate={false}
        header={
          <>
            <th>Pack</th>
            <th>Fechas</th>
            <th>Sesiones</th>
            <th>Acceso</th>
            <th />
          </>
        }
      >
        {activeContracts.map((c) => (
          <tr key={c.id}>
            <td><strong>{c.packName}</strong></td>
            <td className="muted small">
              {format_date(c.startsAt)}
              {c.endsAt
                ? ` → ${format_date(c.endsAt)}`
                : ' → sin fin'}
            </td>
            <td>
              {c.creditBalances?.length
                ? c.creditBalances
                    .map((b) => `${b.serviceName ?? b.serviceId}: ${b.remaining}`)
                    .join(', ')
                : '—'}
            </td>
            <td>
              <StatusPill tone={c.hasAccessLibre ? 'ok' : 'muted'}>
                {c.hasAccessLibre ? 'Libre' : 'Créditos'}
              </StatusPill>
            </td>
            <td className="row-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => openCancel(c)}
              >
                Cancelar
              </button>
            </td>
          </tr>
        ))}
      </DataTable>

      {cancelOk ? <p className="ok-msg">{cancelOk}</p> : null}
      {cancelError ? <p className="error">{cancelError}</p> : null}

      <DataTable
        title="Próximas reservas"
        description={`${reservations.length} reserva${reservations.length === 1 ? '' : 's'}`}
        loading={loading}
        error={loadError}
        isEmpty={reservations.length === 0}
        emptyText="Sin reservas próximas."
        paginate={false}
        header={
          <>
            <th>Servicio</th>
            <th>Fecha y hora</th>
            <th>Cobertura</th>
          </>
        }
      >
        {reservations.map((r) => (
          <tr key={r.id}>
            <td>{r.serviceName}</td>
            <td className="muted small">{format_datetime(r.startsAt)}</td>
            <td>
              <StatusPill tone={r.coverage === 'CREDIT' ? 'ok' : 'warn'}>
                {r.coverage === 'CREDIT' ? 'Crédito' : 'Drop-in'}
              </StatusPill>
            </td>
          </tr>
        ))}
      </DataTable>

      <div className="form-actions">
        <Link
          href={`/reportes?memberId=${encodeURIComponent(memberId)}`}
          className="btn ghost"
        >
          Ver reportes de este afiliado
        </Link>
      </div>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title={`Cancelar «${cancelTarget?.packName ?? ''}»`}
        description="Corta acceso libre y sesiones. No reembolsa el pago (para eso usá Devolver). El motivo queda en auditoría."
        confirmLabel="Confirmar cancelación"
        tone="danger"
        confirmWord="CANCELAR"
        busy={cancelBusy}
        onConfirm={() => { setCancelTarget(null); void doCancelContract(); }}
        onCancel={closeCancel}
      >
        <label className="confirm-dialog-field">
          Motivo (opcional)
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Ej. incumplimiento de normas"
          />
        </label>
      </ConfirmDialog>
    </div>
  );
}
