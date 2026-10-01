'use client';

import { FormEvent, useState } from 'react';
import { FolderFileUpload } from '@/components/PersonFolderModal';
import { ApiClientError } from '@/lib/api/client';
import {
  createExpenseLabel,
  EXPENSE_LABEL_NAME_MAX,
  EXPENSE_MAX_FILES,
  EXPENSE_NOTE_MAX,
  type ExpenseDetail,
  type ExpenseInput,
  type ExpenseLabelDetail,
  type ExpenseMethod,
  type ExpenseNature,
} from '@/lib/api/expenses';
import { todayBusinessDate } from '@/lib/api/payment-register';
import {
  EXPENSE_METHOD_OPTIONS,
  EXPENSE_NATURE_OPTIONS,
} from '@/lib/expense-labels';

/**
 * Datos de un gasto (alta o edición).
 *
 * @remarks RN-GAS-001..004. La etiqueta se elige o se crea en el momento. En
 * alta se pueden elegir hasta {@link EXPENSE_MAX_FILES} comprobantes, que el
 * padre sube después de crear el gasto (`onSubmit` recibe los files).
 */
export function ExpenseForm({
  initial,
  labels,
  onLabelCreated,
  submitLabel,
  disabled = false,
  withFiles = false,
  onSubmit,
  onCancel,
}: {
  initial?: ExpenseDetail;
  labels: ExpenseLabelDetail[];
  onLabelCreated: (label: ExpenseLabelDetail) => void;
  submitLabel: string;
  disabled?: boolean;
  withFiles?: boolean;
  onSubmit: (input: ExpenseInput, files: File[]) => Promise<void>;
  onCancel?: () => void;
}) {
  const [businessDate, setBusinessDate] = useState(
    initial?.businessDate ?? todayBusinessDate(),
  );
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [nature, setNature] = useState<ExpenseNature>(
    initial?.nature ?? 'VARIABLE',
  );
  const [method, setMethod] = useState<ExpenseMethod>(
    initial?.method ?? 'CASH',
  );
  const [labelId, setLabelId] = useState(initial?.label.id ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [newLabel, setNewLabel] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = disabled || busy;
  const archivedCurrent =
    initial && !labels.some((l) => l.id === initial.label.id)
      ? initial.label
      : null;

  async function addLabel() {
    const name = newLabel.trim();
    if (!name) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createExpenseLabel(name);
      onLabelCreated(created);
      setLabelId(created.id);
      setNewLabel('');
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo crear la etiqueta',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isInteger(value) || value < 1) {
      setError('El monto tiene que ser un entero mayor a 0.');
      return;
    }
    if (!labelId) {
      setError('Elegí una etiqueta o creá una nueva.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(
        {
          businessDate,
          amount: value,
          nature,
          method,
          labelId,
          note: note.trim(),
        },
        files,
      );
    } catch (err) {
      setError(
        err instanceof ApiClientError || err instanceof Error
          ? err.message
          : 'No se pudo guardar el gasto',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={(e) => void handleSubmit(e)}>
      <div className="expense-form-grid">
        <label>
          Fecha
          <input
            type="date"
            value={businessDate}
            max={todayBusinessDate()}
            onChange={(e) => setBusinessDate(e.target.value)}
            disabled={locked}
            required
          />
        </label>
        <label>
          Monto (ARS)
          <input
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={locked}
            required
          />
        </label>
        <label>
          Naturaleza
          <select
            value={nature}
            onChange={(e) => setNature(e.target.value as ExpenseNature)}
            disabled={locked}
          >
            {EXPENSE_NATURE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Medio de pago
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as ExpenseMethod)}
            disabled={locked}
          >
            {EXPENSE_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {method === 'CASH' ? (
        <p className="muted small">
          En efectivo: se resta del efectivo esperado en el Cierre de ese día.
        </p>
      ) : null}

      <label>
        Etiqueta
        <select
          value={labelId}
          onChange={(e) => setLabelId(e.target.value)}
          disabled={locked}
          required
        >
          <option value="">Elegí una etiqueta</option>
          {archivedCurrent ? (
            <option value={archivedCurrent.id}>
              {archivedCurrent.name} (archivada)
            </option>
          ) : null}
          {labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      {disabled ? null : (
        <div className="expense-new-label">
          <label>
            Nueva etiqueta
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Alquiler, Sueldos, Luz…"
              maxLength={EXPENSE_LABEL_NAME_MAX}
              disabled={locked}
            />
          </label>
          <button
            type="button"
            className="btn ghost"
            onClick={() => void addLabel()}
            disabled={locked || !newLabel.trim()}
          >
            Crear y usar
          </button>
        </div>
      )}

      <label>
        Nota (opcional)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={EXPENSE_NOTE_MAX}
          disabled={locked}
        />
      </label>

      {withFiles ? (
        <div className="admin-stack">
          <p className="muted small">
            Comprobantes (opcional): hasta {EXPENSE_MAX_FILES}, PDF o imagen de
            hasta 5 MB cada uno.
          </p>
          {files.length ? (
            <ul className="folder-item-list">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="expense-file-row">
                  <span>{f.name}</span>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, j) => j !== i))
                    }
                    disabled={locked}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {files.length < EXPENSE_MAX_FILES ? (
            <FolderFileUpload
              file={null}
              onFileSelect={(f) => {
                if (f) {
                  setFiles((prev) => [...prev, f]);
                }
              }}
              onReject={setError}
              disabled={locked}
            />
          ) : null}
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      {disabled ? null : (
        <div className="admin-modal-actions">
          {onCancel ? (
            <button
              type="button"
              className="btn ghost"
              onClick={onCancel}
              disabled={busy}
            >
              Cancelar
            </button>
          ) : null}
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Guardando…' : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}
