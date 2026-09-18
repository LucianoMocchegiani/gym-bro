'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { DataTable, ListToolbar } from '@/components/AdminList';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { RequireStaff } from '@/components/RequireStaff';
import { IconEdit, RowActions, RowIconButton } from '@/components/RowActions';
import { StatusPill } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import {
  listExpirations,
  type ExpirationPayKind,
  type ExpirationRow,
  type ExpirationsList,
} from '@/lib/api/expirations';
import { useAuth } from '@/lib/auth/AuthProvider';
import { hasAnyPermission } from '@/lib/nav-permissions';
import { memberFichaHref } from '@/lib/member-link';

type ViewFilter = 'all' | 'upcoming' | 'tolerance';
type PayFilter = 'all' | 'debit' | 'manual';

function payLabel(kind: ExpirationPayKind): string {
  if (kind === 'debit') return 'Débito';
  if (kind === 'debit_failed') return 'Débito fallido';
  return 'A mano';
}

function daysLabel(row: ExpirationRow): string {
  if (row.daysUntil === 0) return 'Hoy';
  if (row.daysUntil === 1) return 'Mañana';
  if (row.daysUntil > 1) return `${row.daysUntil} días`;
  const overdue = -row.daysUntil;
  return overdue === 1 ? '1 día vencido' : `${overdue} días vencidos`;
}

/**
 * Cola de recepción: MONTHLY por vencer o en tolerancia.
 *
 * @remarks Corte 1: lista + ficha/Caja/Débitos. Avisos E8 fuera de alcance.
 */
export default function VencimientosPage() {
  return (
    <RequireStaff>
      <VencimientosInner />
    </RequireStaff>
  );
}

function VencimientosInner() {
  const { session } = useAuth();
  const canCaja = hasAnyPermission(session?.permissionCodes, [
    'cashier.operate',
  ]);

  const [view, setView] = useState<ViewFilter>('upcoming');
  const [pay, setPay] = useState<PayFilter>('all');
  const [data, setData] = useState<ExpirationsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listExpirations({ view, pay });
      setData(list);
      setError(null);
    } catch (err) {
      setData(null);
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar vencimientos',
      );
    } finally {
      setLoading(false);
    }
  }, [view, pay]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = data?.counts;
  const rows = data?.items ?? [];

  function selectUpcoming() {
    setView('upcoming');
    setPay('all');
  }
  function selectTolerance() {
    setView('tolerance');
    setPay('all');
  }
  function selectDebit() {
    setView('all');
    setPay('debit');
  }
  function selectManual() {
    setView('all');
    setPay('manual');
  }

  return (
    <AdminShell
      title="Vencimientos"
      subtitle="Packs mensuales por vencer o en tolerancia. El débito lo cobra Mercado Pago; el resto se renueva en Caja."
    >
      <ListToolbar hint="No envía avisos todavía (E8). Corte 1: ver y cobrar.">
        <div className="cash-tabs" role="tablist">
          <button
            type="button"
            className={view === 'upcoming' && pay === 'all' ? 'active' : undefined}
            onClick={selectUpcoming}
          >
            {data ? `${data.windowDays} días` : '7 días'}
            {counts ? ` · ${counts.upcoming}` : ''}
          </button>
          <button
            type="button"
            className={view === 'tolerance' && pay === 'all' ? 'active' : undefined}
            onClick={selectTolerance}
          >
            Tolerancia{counts ? ` · ${counts.tolerance}` : ''}
          </button>
          <button
            type="button"
            className={pay === 'debit' ? 'active' : undefined}
            onClick={selectDebit}
          >
            Débito{counts ? ` · ${counts.debit}` : ''}
          </button>
          <button
            type="button"
            className={pay === 'manual' ? 'active' : undefined}
            onClick={selectManual}
          >
            A mano{counts ? ` · ${counts.manual}` : ''}
          </button>
        </div>
      </ListToolbar>

      {counts ? (
        <div className="stat-row">
          <Panel className="stat-card">
            <p className="muted small">En cola</p>
            <p className="stat-value">{counts.total}</p>
          </Panel>
          <Panel className="stat-card">
            <p className="muted small">Por vencer</p>
            <p className="stat-value">{counts.upcoming}</p>
          </Panel>
          <Panel className="stat-card">
            <p className="muted small">En tolerancia</p>
            <p className="stat-value">{counts.tolerance}</p>
          </Panel>
          <Panel className="stat-card">
            <p className="muted small">A mano</p>
            <p className="stat-value">{counts.manual}</p>
          </Panel>
        </div>
      ) : null}

      <DataTable
        title="Lista"
        description={
          data
            ? `Hoy ${data.today} · tolerancia ${data.debtToleranceDays} días · ${rows.length} en este filtro`
            : undefined
        }
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="Nadie en este filtro."
        paginate={false}
        header={
          <>
            <th>Afiliado</th>
            <th>Pack</th>
            <th>Vence</th>
            <th>Plazo</th>
            <th>Cómo paga</th>
            <th />
          </>
        }
      >
        {rows.map((row) => (
          <tr key={row.contractId}>
            <td>
              <Link
                href={memberFichaHref(
                  row.memberId,
                  row.memberName ?? row.memberEmail,
                )}
              >
                {row.memberName?.trim() || row.memberEmail}
              </Link>
            </td>
            <td>{row.packName}</td>
            <td>{row.endsOn}</td>
            <td>
              <StatusPill
                tone={row.bucket === 'tolerance' ? 'warn' : 'ok'}
              >
                {daysLabel(row)}
              </StatusPill>
            </td>
            <td>
              <StatusPill
                tone={
                  row.payKind === 'debit_failed'
                    ? 'danger'
                    : row.payKind === 'debit'
                      ? 'ok'
                      : 'warn'
                }
              >
                {payLabel(row.payKind)}
              </StatusPill>
            </td>
            <td>
              <RowActions>
                <RowIconButton
                  label="Ficha"
                  href={memberFichaHref(
                    row.memberId,
                    row.memberName ?? row.memberEmail,
                  )}
                >
                  <IconEdit />
                </RowIconButton>
                {canCaja ? (
                  <Link
                    className="btn ghost"
                    href={`/caja?memberId=${encodeURIComponent(row.memberId)}`}
                  >
                    Caja
                  </Link>
                ) : null}
                {canCaja && row.payKind !== 'manual' ? (
                  <Link
                    className="btn ghost"
                    href={`/caja?memberId=${encodeURIComponent(row.memberId)}&vista=debitos`}
                  >
                    Débitos
                  </Link>
                ) : null}
              </RowActions>
            </td>
          </tr>
        ))}
      </DataTable>
    </AdminShell>
  );
}
