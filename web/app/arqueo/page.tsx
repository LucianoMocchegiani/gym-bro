'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ListToolbar } from '@/components/AdminList';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MoneyMovementsTable } from '@/components/MoneyMovementsTable';
import { RequireStaff } from '@/components/RequireStaff';
import { SkeletonCards, SkeletonPanel } from '@/components/Skeleton';
import {
  getCashDay,
  reconcileCashDay,
  todayBusinessDate,
} from '@/lib/api/payment-register';
import type { CashDayDetail } from '@/lib/api/payment-register';
import { ApiClientError } from '@/lib/api/client';
import { formatMoney } from '@/lib/cash-labels';

/**
 * Cierre del día: stats + arqueo + misma grilla de movimientos que Reportes.
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

  const [declaredAmount, setDeclaredAmount] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');
  const [reconcileBusy, setReconcileBusy] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [reconcileConfirm, setReconcileConfirm] = useState(false);

  const loadDay = useCallback(async (ymd: string) => {
    setLoading(true);
    try {
      const data = await getCashDay(ymd);
      setDay(data);
      setLoadError(null);
      if (!data.reconciliation) {
        setDeclaredAmount(String(data.totals.net));
      }
    } catch (err) {
      setLoadError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar el cierre del día',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDay(date);
  }, [date, loadDay]);

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
      subtitle="Cierre del día y movimientos (cobros y devoluciones). Los cobros se hacen en Caja."
    >
      <ListToolbar hint="Misma grilla que Reportes, filtrada al día de negocio (BA).">
        <label className="toolbar-field">
          Día (timezone BA)
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </ListToolbar>

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

      <MoneyMovementsTable
        rows={day?.movements ?? []}
        loading={loading}
        error={loadError}
        description={
          day ? `${day.movements.length} del ${day.businessDate}` : undefined
        }
        emptyText="Sin movimientos en este día."
        allowRefund
        onRefunded={() => void loadDay(date)}
      />

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
