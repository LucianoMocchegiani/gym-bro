'use client';

import { FormEvent, useEffect, useState } from 'react';
import { DataTable, ListToolbar } from '@/components/AdminList';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ReceiptPanel } from '@/components/ReceiptPanel';
import { RequireStaff } from '@/components/RequireStaff';
import { SkeletonCards, SkeletonPanel } from '@/components/Skeleton';
import { StatusPill } from '@/components/StatusPill';
import {
  IconReceipt,
  RowActions,
  RowIconButton,
} from '@/components/RowActions';
import {
  getCashDay,
  reconcileCashDay,
  todayBusinessDate,
} from '@/lib/api/payment-register';
import type { CashDayDetail } from '@/lib/api/payment-register';
import { ApiClientError } from '@/lib/api/client';
import { getReceiptByTransaction } from '@/lib/api/receipts';
import type { ReceiptDetail } from '@/lib/api/receipts';
import { formatCashConcept, formatMoney } from '@/lib/cash-labels';

/**
 * Cierre del día: stats CASH + cierre + movimientos del día con comprobantes.
 * Los cobros se hacen en /caja (RN-PAG-009).
 */
export default function ArqueoPage() {
  return (
    <RequireStaff>
      <ArqueoInner />
    </RequireStaff>
  );
}

function ArqueoInner() {
  const [date, setDate] = useState(todayBusinessDate);
  const [day, setDay] = useState<CashDayDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [receiptBusyId, setReceiptBusyId] = useState<string | null>(null);

  const [declaredAmount, setDeclaredAmount] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');
  const [reconcileBusy, setReconcileBusy] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [reconcileConfirm, setReconcileConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getCashDay(date);
        if (cancelled) {
          return;
        }
        setDay(data);
        setLoadError(null);
        if (!data.reconciliation) {
          setDeclaredAmount(String(data.totals.net));
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el cierre del día',
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  async function openReceipt(transactionId: string) {
    setReceiptBusyId(transactionId);
    setReceiptError(null);
    try {
      const r = await getReceiptByTransaction(transactionId);
      setReceipt(r);
    } catch (err) {
      setReceipt(null);
      setReceiptError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar el comprobante',
      );
    } finally {
      setReceiptBusyId(null);
    }
  }

  async function onReconcile(e: FormEvent) {
    e.preventDefault();
    const declared = Number(declaredAmount);
    if (!Number.isInteger(declared) || declared < 0) {
      setReconcileError('Declará un monto entero ≥ 0');
      return;
    }
    setReconcileConfirm(true);
  }

  async function doReconcile() {
    const declared = Number(declaredAmount);
    setReconcileBusy(true);
    setReconcileError(null);
    try {
      const data = await reconcileCashDay({
        date,
        declaredAmount: declared,
        note: reconcileNote.trim() || undefined,
      });
      setDay(data);
    } catch (err) {
      setReconcileError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cerrar el cierre',
      );
    } finally {
      setReconcileBusy(false);
    }
  }

  return (
    <AdminShell
      title="Cierres y Movimientos"
      subtitle="Cierre y movimientos CASH del día. Los cobros se hacen en Caja."
    >
      <ListToolbar hint="Movimientos CASH del día. MP no suma al cierre de efectivo.">
        <label className="toolbar-field">
          Día (timezone BA)
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </ListToolbar>

      {receiptError ? <p className="error">{receiptError}</p> : null}

      {receipt ? (
        <ReceiptPanel
          receipt={receipt}
          title="Comprobante"
          onClose={() => setReceipt(null)}
        />
      ) : null}

      {loading && !day ? (
        <>
          <SkeletonCards count={4} />
          <SkeletonPanel lines={4} />
        </>
      ) : null}

      {day ? (
        <>
          <div className="stat-row cash-stats">
            <div className="admin-panel stat-card">
              <p className="muted small">Ingresos</p>
              <p className="stat-value">{formatMoney(day.totals.income)}</p>
            </div>
            <div className="admin-panel stat-card">
              <p className="muted small">Egresos</p>
              <p className="stat-value">{formatMoney(day.totals.outcome)}</p>
            </div>
            <div className="admin-panel stat-card">
              <p className="muted small">Neto esperado</p>
              <p className="stat-value">{formatMoney(day.totals.net)}</p>
            </div>
            <div className="admin-panel stat-card">
              <p className="muted small">Movimientos</p>
              <p className="stat-value">{day.totals.movementCount}</p>
            </div>
          </div>

          <Panel title="Cierre del día" description="Un cierre por día de negocio.">
            {day.reconciliation ? (
              <div className="admin-stack">
                <p className="ok-msg">Cierre registrado</p>
                <ul className="plain-list">
                  <li>
                    Esperado: {formatMoney(day.reconciliation.expectedAmount)}
                  </li>
                  <li>
                    Declarado: {formatMoney(day.reconciliation.declaredAmount)}
                  </li>
                  <li>
                    Diferencia: {formatMoney(day.reconciliation.difference)}
                  </li>
                  {day.reconciliation.reconciledByStaffName ? (
                    <li>Por: {day.reconciliation.reconciledByStaffName}</li>
                  ) : null}
                  {day.reconciliation.note ? (
                    <li>Nota: {day.reconciliation.note}</li>
                  ) : null}
                </ul>
              </div>
            ) : (
              <form
                className="admin-form"
                onSubmit={(e) => void onReconcile(e)}
              >
                <label>
                  Efectivo declarado
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={declaredAmount}
                    onChange={(e) => setDeclaredAmount(e.target.value)}
                    required
                  />
                </label>
                <p className="muted small">
                  Esperado neto: {formatMoney(day.totals.net)}
                  {declaredAmount !== '' &&
                  Number.isInteger(Number(declaredAmount))
                    ? ` · Diff: ${formatMoney(Number(declaredAmount) - day.totals.net)}`
                    : ''}
                </p>
                <label>
                  Nota (opcional)
                  <textarea
                    value={reconcileNote}
                    onChange={(e) => setReconcileNote(e.target.value)}
                    rows={2}
                    maxLength={500}
                  />
                </label>
                {reconcileError ? <p className="error">{reconcileError}</p> : null}
                <button
                  type="submit"
                  className="primary"
                  disabled={reconcileBusy}
                >
                  {reconcileBusy ? 'Cerrando…' : 'Cerrar cierre'}
                </button>
              </form>
            )}
          </Panel>
        </>
      ) : null}

      <DataTable
        title="Movimientos"
        description={
          day ? `${day.movements.length} del ${day.businessDate}` : undefined
        }
        loading={loading}
        error={loadError}
        isEmpty={!day || day.movements.length === 0}
        emptyText="Sin movimientos CASH en este día."
        paginate={false}
        header={
          <>
            <th>Hora</th>
            <th>Afiliado</th>
            <th>Concepto</th>
            <th>Tipo</th>
            <th>Monto</th>
            <th>Staff</th>
            <th />
          </>
        }
      >
        {(day?.movements ?? []).map((m) => (
          <tr key={m.id}>
            <td>
              {new Date(m.createdAt).toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </td>
            <td>{m.memberName ?? m.memberId.slice(0, 8)}</td>
            <td>{formatCashConcept(m.concept)}</td>
            <td>
              <StatusPill tone={m.kind === 'INCOME' ? 'ok' : 'danger'}>
                {m.kind === 'INCOME' ? 'Ingreso' : 'Egreso'}
              </StatusPill>
            </td>
            <td>{formatMoney(m.amount)}</td>
            <td>{m.recordedByStaffName ?? '—'}</td>
            <td className="row-actions">
              {m.kind === 'INCOME' &&
              (m.concept === 'PACK_CONTRACT' || m.concept === 'DROP_IN') ? (
                <RowIconButton
                  label="Ver comprobante"
                  disabled={receiptBusyId === m.transactionId}
                  onClick={() => void openReceipt(m.transactionId)}
                >
                  <IconReceipt />
                </RowIconButton>
              ) : null}
            </td>
          </tr>
        ))}
      </DataTable>

      <ConfirmDialog
        open={reconcileConfirm}
        title="Cerrar cierre del día"
        description={`¿Confirmar cierre con ${formatMoney(
          Number(declaredAmount) || 0,
        )}? Solo se puede una vez por día.`}
        confirmLabel="Cerrar cierre"
        busy={reconcileBusy}
        onConfirm={() => {
          setReconcileConfirm(false);
          void doReconcile();
        }}
        onCancel={() => setReconcileConfirm(false)}
      />
    </AdminShell>
  );
}