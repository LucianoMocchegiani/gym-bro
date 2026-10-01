'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DataTable,
  ListFilterField,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
import { AdminModal } from '@/components/AdminModal';
import { AdminShell } from '@/components/AdminShell';
import { Panel } from '@/components/AdminUi';
import { DeleteRowButton } from '@/components/DeleteRowButton';
import { ExpenseEditPanel } from '@/components/expenses/ExpenseEditPanel';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseLabelsPanel } from '@/components/expenses/ExpenseLabelsPanel';
import { RequireStaff } from '@/components/RequireStaff';
import { IconEdit, RowActions, RowIconButton } from '@/components/RowActions';
import { PageSkeleton, SkeletonCards } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import {
  createExpense,
  deleteExpense,
  getExpensesSummary,
  listExpenseLabels,
  listExpenses,
  uploadExpenseFile,
  type ExpenseDetail,
  type ExpenseLabelDetail,
  type ExpenseMethod,
  type ExpenseNature,
  type ExpensesSummary,
} from '@/lib/api/expenses';
import { todayBusinessDate } from '@/lib/api/payment-register';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatMoney } from '@/lib/cash-labels';
import {
  EXPENSE_METHOD_OPTIONS,
  EXPENSE_NATURE_OPTIONS,
  formatExpenseMethod,
  formatExpenseNature,
  formatYmd,
} from '@/lib/expense-labels';
import { hasAllPermissions } from '@/lib/nav-permissions';

const PAGE_SIZE = 20;

/**
 * Gastos del local: totales del período, listado, alta/edición y etiquetas.
 *
 * @remarks RN-GAS-001..006. Lectura `expenses.read`; cargar y editar
 * `expenses.write`. No pasa por Caja ni crea movimientos de cobro.
 */
export default function GastosPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<PageSkeleton />}>
        <GastosInner />
      </Suspense>
    </RequireStaff>
  );
}

function GastosInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('editar')?.trim() || null;
  const createOpen = searchParams.get('nuevo') === '1' && !editId;
  const labelsOpen = searchParams.get('etiquetas') === '1';
  const { session } = useAuth();
  const canWrite = hasAllPermissions(session?.permissionCodes, [
    'expenses.write',
  ]);

  const today = todayBusinessDate();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [labelFilter, setLabelFilter] = useState('');
  const [natureFilter, setNatureFilter] = useState<'' | ExpenseNature>('');
  const [methodFilter, setMethodFilter] = useState<'' | ExpenseMethod>('');
  const [page, setPage] = useState(1);

  const [labels, setLabels] = useState<ExpenseLabelDetail[]>([]);
  const [rows, setRows] = useState<ExpenseDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [summary, setSummary] = useState<ExpensesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashOk, setFlashOk] = useState<string | null>(null);
  const [flashError, setFlashError] = useState<string | null>(null);

  const loadLabels = useCallback(async () => {
    try {
      setLabels(await listExpenseLabels());
    } catch {
      setLabels([]);
    }
  }, []);

  const load = useCallback(async () => {
    if (!from || !to || from > to) {
      setError('El rango de fechas no es válido.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([
        listExpenses({
          from,
          to,
          labelId: labelFilter || undefined,
          nature: natureFilter || undefined,
          method: methodFilter || undefined,
          page,
          pageSize: PAGE_SIZE,
        }),
        getExpensesSummary({ from, to }),
      ]);
      setRows(list.items);
      setTotal(list.total);
      setHasMore(list.hasMore);
      setSummary(sum);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudieron cargar los gastos',
      );
    } finally {
      setLoading(false);
    }
  }, [from, to, labelFilter, natureFilter, methodFilter, page]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await loadLabels();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadLabels]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  function go(query: string) {
    setFlashOk(null);
    router.replace(query ? `/gastos?${query}` : '/gastos', { scroll: false });
  }

  function onLabelCreated(label: ExpenseLabelDetail) {
    setLabels((prev) =>
      [...prev, label].sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  async function onCreate(
    input: Parameters<typeof createExpense>[0],
    files: File[],
  ) {
    const created = await createExpense(input);
    const failed: string[] = [];
    for (const file of files) {
      try {
        await uploadExpenseFile(created.id, file);
      } catch {
        failed.push(file.name);
      }
    }
    go('');
    if (failed.length) {
      setFlashError(
        `Gasto creado, pero no se subieron: ${failed.join(', ')}. Abrilo para reintentar.`,
      );
    } else {
      setFlashError(null);
      setFlashOk(`Gasto creado: ${created.label.name} ${formatMoney(created.amount)}`);
    }
    void load();
  }

  return (
    <AdminShell
      title="Gastos"
      subtitle="Alquiler, sueldos, luz, mercadería… Lo que sale del gym."
      actions={
        <div className="page-head-actions">
          <button type="button" className="btn ghost" onClick={() => go('etiquetas=1')}>
            Etiquetas
          </button>
          {canWrite ? (
            <button type="button" className="btn" onClick={() => go('nuevo=1')}>
              + Nuevo
            </button>
          ) : null}
        </div>
      }
    >
      {loading && !summary ? <SkeletonCards count={4} /> : null}
      {summary ? (
        <div className="stat-row expense-stats">
          <Panel className="stat-card">
            <p className="muted small">Total del período</p>
            <p className="stat-value">{formatMoney(summary.total)}</p>
            <p className="muted small">
              {summary.count} {summary.count === 1 ? 'gasto' : 'gastos'}
            </p>
          </Panel>
          <Panel className="stat-card">
            <p className="muted small">Fijos</p>
            <p className="stat-value">{formatMoney(summary.byNature.FIXED)}</p>
          </Panel>
          <Panel className="stat-card">
            <p className="muted small">Variables</p>
            <p className="stat-value">
              {formatMoney(summary.byNature.VARIABLE)}
            </p>
          </Panel>
          <Panel className="stat-card">
            <p className="muted small">En efectivo</p>
            <p className="stat-value">{formatMoney(summary.byMethod.CASH)}</p>
            <p className="muted small">Se resta en el Cierre de cada día</p>
          </Panel>
        </div>
      ) : null}

      {summary && summary.byLabel.length ? (
        <Panel title="Por etiqueta" description={`${formatYmd(summary.from)} → ${formatYmd(summary.to)}`}>
          <ul className="expense-by-label">
            {summary.byLabel.map((l) => (
              <li key={l.labelId}>
                <span>
                  {l.name}{' '}
                  <span className="muted small">({l.count})</span>
                </span>
                <strong>{formatMoney(l.total)}</strong>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <ListToolbar hint="Los totales de arriba son del rango de fechas; los filtros solo afectan el listado.">
        <label className="toolbar-field">
          Desde
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => {
              setPage(1);
              setFrom(e.target.value);
            }}
          />
        </label>
        <label className="toolbar-field">
          Hasta
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => {
              setPage(1);
              setTo(e.target.value);
            }}
          />
        </label>
        <ListFilterField
          label="Etiqueta"
          value={labelFilter}
          onChange={(v) => {
            setPage(1);
            setLabelFilter(v);
          }}
        >
          <option value="">Todas</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </ListFilterField>
        <ListFilterField
          label="Naturaleza"
          value={natureFilter}
          onChange={(v) => {
            setPage(1);
            setNatureFilter(v as '' | ExpenseNature);
          }}
        >
          <option value="">Todas</option>
          {EXPENSE_NATURE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </ListFilterField>
        <ListFilterField
          label="Medio"
          value={methodFilter}
          onChange={(v) => {
            setPage(1);
            setMethodFilter(v as '' | ExpenseMethod);
          }}
        >
          <option value="">Todos</option>
          {EXPENSE_METHOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </ListFilterField>
      </ListToolbar>

      {flashOk ? <p className="ok-msg">{flashOk}</p> : null}
      {flashError ? <p className="err-msg">{flashError}</p> : null}

      <DataTable
        description={listCountDescription(total, page, 'gasto', 'gastos')}
        loading={loading}
        error={error}
        isEmpty={rows.length === 0}
        emptyText="No hay gastos en ese rango."
        page={page}
        hasMore={hasMore}
        onPageChange={setPage}
        header={
          <>
            <th>Fecha</th>
            <th>Etiqueta</th>
            <th>Monto</th>
            <th>Naturaleza</th>
            <th>Medio</th>
            <th>Nota</th>
            <th>Comprob.</th>
            <th>Cargó</th>
            <th />
          </>
        }
      >
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{formatYmd(r.businessDate)}</td>
            <td>{r.label.name}</td>
            <td>{formatMoney(r.amount)}</td>
            <td>{formatExpenseNature(r.nature)}</td>
            <td>{formatExpenseMethod(r.method)}</td>
            <td className="expense-note-cell">{r.note ?? '—'}</td>
            <td>{r.files.length || '—'}</td>
            <td>{r.recordedByName ?? '—'}</td>
            <td>
              <RowActions>
                <RowIconButton
                  label={canWrite && !r.locked ? 'Editar' : 'Ver'}
                  onClick={() => go(`editar=${encodeURIComponent(r.id)}`)}
                >
                  <IconEdit />
                </RowIconButton>
                <DeleteRowButton
                  hidden={!canWrite || r.locked}
                  dialogTitle={`¿Eliminar el gasto de ${formatMoney(r.amount)}?`}
                  description="Se borran también sus comprobantes. Queda registrado en Auditoría."
                  onDelete={() => deleteExpense(r.id)}
                  onSuccess={() => {
                    setFlashOk('Gasto eliminado');
                    void load();
                  }}
                  onError={(err) => setFlashError(err.message)}
                />
              </RowActions>
            </td>
          </tr>
        ))}
      </DataTable>

      <AdminModal
        open={createOpen && canWrite}
        onClose={() => go('')}
        title="Nuevo gasto"
        description="Monto, fecha, etiqueta y comprobantes (opcional)."
        size="comfortable"
      >
        <ExpenseForm
          labels={labels}
          onLabelCreated={onLabelCreated}
          submitLabel="Crear gasto"
          withFiles
          onCancel={() => go('')}
          onSubmit={onCreate}
        />
      </AdminModal>

      <AdminModal
        open={Boolean(editId)}
        onClose={() => go('')}
        title={canWrite ? 'Editar gasto' : 'Gasto'}
        size="comfortable"
      >
        {editId ? (
          <ExpenseEditPanel
            key={editId}
            expenseId={editId}
            labels={labels}
            canWrite={canWrite}
            onLabelCreated={onLabelCreated}
            onCancel={() => go('')}
            onSaved={() => void load()}
          />
        ) : null}
      </AdminModal>

      <AdminModal
        open={labelsOpen}
        onClose={() => go('')}
        title="Etiquetas de gastos"
        description="Con gastos no se borran: se archivan y dejan de aparecer al cargar."
      >
        <ExpenseLabelsPanel
          canWrite={canWrite}
          onChanged={() => {
            void loadLabels();
            void load();
          }}
        />
      </AdminModal>
    </AdminShell>
  );
}
