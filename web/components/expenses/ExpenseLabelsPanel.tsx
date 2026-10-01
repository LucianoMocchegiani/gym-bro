'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatusPill } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import {
  createExpenseLabel,
  deleteExpenseLabel,
  EXPENSE_LABEL_NAME_MAX,
  listExpenseLabels,
  updateExpenseLabel,
  type ExpenseLabelDetail,
} from '@/lib/api/expenses';

/**
 * Administración de etiquetas de gastos: crear, renombrar, archivar y borrar.
 *
 * @remarks RN-GAS-003. Con gastos no se borra, se archiva: sale del selector
 * de alta y los gastos viejos conservan el nombre.
 */
export function ExpenseLabelsPanel({
  canWrite,
  onChanged,
}: {
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [labels, setLabels] = useState<ExpenseLabelDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLabels(await listExpenseLabels(true));
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudieron cargar las etiquetas',
      );
    } finally {
      setLoading(false);
    }
  }, []);

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

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      onChanged();
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'No se pudo guardar',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-stack">
      {canWrite ? (
        <form
          className="expense-new-label"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (name) {
              void run(async () => {
                await createExpenseLabel(name);
                setNewName('');
              });
            }
          }}
        >
          <label>
            Nueva etiqueta
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Alquiler, Sueldos, Luz…"
              maxLength={EXPENSE_LABEL_NAME_MAX}
              disabled={busy}
            />
          </label>
          <button
            type="submit"
            className="btn"
            disabled={busy || !newName.trim()}
          >
            Crear
          </button>
        </form>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
      {loading ? <p className="muted">Cargando…</p> : null}
      {!loading && labels.length === 0 ? (
        <p className="muted">Todavía no hay etiquetas.</p>
      ) : null}

      <ul className="folder-item-list">
        {labels.map((l) => (
          <li key={l.id} className="expense-label-row">
            {editing?.id === l.id ? (
              <input
                value={editing.name}
                onChange={(e) =>
                  setEditing({ id: l.id, name: e.target.value })
                }
                maxLength={EXPENSE_LABEL_NAME_MAX}
                disabled={busy}
                aria-label="Nombre de la etiqueta"
                autoFocus
              />
            ) : (
              <span className="expense-label-name">
                <strong>{l.name}</strong>{' '}
                <span className="muted small">
                  {l.expenseCount} {l.expenseCount === 1 ? 'gasto' : 'gastos'}
                </span>{' '}
                {l.archived ? <StatusPill tone="muted">Archivada</StatusPill> : null}
              </span>
            )}
            {canWrite ? (
              <span className="folder-item-actions">
                {editing?.id === l.id ? (
                  <>
                    <button
                      type="button"
                      className="btn"
                      disabled={busy || !editing.name.trim()}
                      onClick={() =>
                        void run(async () => {
                          await updateExpenseLabel(l.id, {
                            name: editing.name.trim(),
                          });
                          setEditing(null);
                        })
                      }
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => setEditing(null)}
                      disabled={busy}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => setEditing({ id: l.id, name: l.name })}
                      disabled={busy}
                    >
                      Renombrar
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() =>
                        void run(() =>
                          updateExpenseLabel(l.id, { archived: !l.archived }),
                        )
                      }
                      disabled={busy}
                    >
                      {l.archived ? 'Desarchivar' : 'Archivar'}
                    </button>
                    {l.expenseCount === 0 ? (
                      <button
                        type="button"
                        className="btn danger"
                        onClick={() => {
                          if (window.confirm(`¿Borrar la etiqueta ${l.name}?`)) {
                            void run(() => deleteExpenseLabel(l.id));
                          }
                        }}
                        disabled={busy}
                      >
                        Borrar
                      </button>
                    ) : null}
                  </>
                )}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
