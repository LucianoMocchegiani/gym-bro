'use client';

import { useState } from 'react';
import { FolderFileUpload } from '@/components/PersonFolderModal';
import { Panel } from '@/components/AdminUi';
import { ApiClientError } from '@/lib/api/client';
import {
  deleteExpenseFile,
  downloadExpenseFile,
  EXPENSE_MAX_FILES,
  uploadExpenseFile,
  type ExpenseFileDetail,
} from '@/lib/api/expenses';

function sizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Comprobantes de un gasto: abrir, quitar y subir (hasta 5).
 *
 * @remarks RN-GAS-005. Los files viven en R2 privado: se abren con el JWT,
 * no hay URL pública. Se puede adjuntar aunque el día tenga cierre hecho.
 */
export function ExpenseFilesPanel({
  expenseId,
  files,
  canWrite,
  onChange,
}: {
  expenseId: string;
  files: ExpenseFileDetail[];
  canWrite: boolean;
  onChange: (files: ExpenseFileDetail[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = files.length >= EXPENSE_MAX_FILES;

  async function upload(file: File | null) {
    if (!file) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await uploadExpenseFile(expenseId, file);
      onChange([...files, created]);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'No se pudo subir',
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(fileId: string) {
    if (!window.confirm('¿Quitar este comprobante?')) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteExpenseFile(expenseId, fileId);
      onChange(files.filter((f) => f.id !== fileId));
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'No se pudo quitar',
      );
    } finally {
      setBusy(false);
    }
  }

  async function open(fileId: string) {
    try {
      const blob = await downloadExpenseFile(expenseId, fileId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir');
    }
  }

  return (
    <Panel
      title="Comprobantes"
      description={`${files.length} / ${EXPENSE_MAX_FILES} · PDF o imagen, máx. 5 MB`}
    >
      <div className="admin-stack">
        {files.length === 0 ? (
          <p className="muted">Sin comprobantes.</p>
        ) : (
          <ul className="folder-item-list">
            {files.map((f) => (
              <li key={f.id} className="expense-file-row">
                <span>
                  {f.originalFilename}{' '}
                  <span className="muted small">{sizeLabel(f.sizeBytes)}</span>
                </span>
                <span className="folder-item-actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => void open(f.id)}
                    disabled={busy}
                  >
                    Abrir
                  </button>
                  {canWrite ? (
                    <button
                      type="button"
                      className="btn danger"
                      onClick={() => void remove(f.id)}
                      disabled={busy}
                    >
                      Quitar
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
        {canWrite && !full ? (
          <FolderFileUpload
            file={null}
            onFileSelect={(f) => void upload(f)}
            onReject={setError}
            disabled={busy}
          />
        ) : null}
        {canWrite && full ? (
          <p className="muted small">
            Llegaste al tope de {EXPENSE_MAX_FILES}. Quitá uno para subir otro.
          </p>
        ) : null}
        {busy ? <p className="muted small">Procesando…</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </Panel>
  );
}
