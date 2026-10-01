'use client';

import { useEffect, useState } from 'react';
import { ExpenseFilesPanel } from '@/components/expenses/ExpenseFilesPanel';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ApiClientError } from '@/lib/api/client';
import {
  getExpense,
  updateExpense,
  type ExpenseDetail,
  type ExpenseLabelDetail,
} from '@/lib/api/expenses';

/**
 * Editar un gasto y sus comprobantes.
 *
 * @remarks RN-GAS-006: efectivo de un día con cierre hecho queda de solo
 * lectura (los comprobantes se pueden seguir adjuntando).
 */
export function ExpenseEditPanel({
  expenseId,
  labels,
  canWrite,
  onLabelCreated,
  onSaved,
  onCancel,
}: {
  expenseId: string;
  labels: ExpenseLabelDetail[];
  canWrite: boolean;
  onLabelCreated: (label: ExpenseLabelDetail) => void;
  onSaved: (expense: ExpenseDetail) => void;
  onCancel: () => void;
}) {
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const row = await getExpense(expenseId);
        if (!cancelled) setExpense(row);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'No se pudo cargar el gasto',
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expenseId]);

  if (error) {
    return <p className="error">{error}</p>;
  }
  if (!expense) {
    return <p className="muted">Cargando…</p>;
  }

  return (
    <div className="admin-stack">
      {expense.locked ? (
        <p className="warn">
          Gasto en efectivo de un día con el cierre hecho: no se puede editar ni
          borrar. Los comprobantes se pueden seguir adjuntando.
        </p>
      ) : null}
      <ExpenseForm
        initial={expense}
        labels={labels}
        onLabelCreated={onLabelCreated}
        submitLabel="Guardar cambios"
        disabled={!canWrite || expense.locked}
        onCancel={onCancel}
        onSubmit={async (input) => {
          const saved = await updateExpense(expense.id, input);
          setExpense(saved);
          onSaved(saved);
        }}
      />
      <ExpenseFilesPanel
        expenseId={expense.id}
        files={expense.files}
        canWrite={canWrite}
        onChange={(files) => {
          const next = { ...expense, files };
          setExpense(next);
          onSaved(next);
        }}
      />
    </div>
  );
}
