'use client';

import { FormEvent, useState, type ReactNode } from 'react';
import { AdminModal } from '@/components/AdminModal';

/**
 * Popup de confirmación reutilizable (sobre AdminModal, apilable sobre otros modales).
 *
 * @remarks
 * Dos modos:
 * - Simple: Confirmar/Cancelar (guardar modificado, acciones sensibles).
 * - Estricto: con `confirmWord` exige escribir la palabra (trim, case-insensitive)
 *   para habilitar la confirmación. Default acordado para deletes: `ELIMINAR`.
 *
 * Renderiza con z-index elevado para poder abrirse encima de otro AdminModal
 * (ficha de afiliado, devolución, etc.).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  confirmWord,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` usa el botón destructivo. */
  tone?: 'default' | 'danger';
  /** Si se define, exige escribir la palabra para confirmar. */
  confirmWord?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  function handleClose() {
    if (!busy) {
      onCancel();
    }
  }

  return (
    <AdminModal
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      elevated
      showCloseButton={false}
    >
      {/* Monta fresco en cada apertura: el estado `typed` se resetea solo. */}
      <ConfirmForm
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        tone={tone}
        confirmWord={confirmWord}
        busy={busy}
        onConfirm={onConfirm}
        onCancel={handleClose}
      />
    </AdminModal>
  );
}

function ConfirmForm({
  confirmLabel,
  cancelLabel,
  tone,
  confirmWord,
  busy,
  onConfirm,
  onCancel,
}: {
  confirmLabel: string;
  cancelLabel: string;
  tone: 'default' | 'danger';
  confirmWord?: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState('');

  const wordOk = confirmWord
    ? typed.trim().toUpperCase() === confirmWord.toUpperCase()
    : true;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!wordOk || busy) {
      return;
    }
    onConfirm();
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      {confirmWord ? (
        <label>
          Escribí <strong>{confirmWord}</strong> para confirmar
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            placeholder={confirmWord}
          />
        </label>
      ) : null}
      <div className="admin-modal-actions">
        <button
          type="button"
          className="btn ghost"
          onClick={onCancel}
          disabled={busy}
        >
          {cancelLabel}
        </button>
        <button
          type="submit"
          className={tone === 'danger' ? 'btn danger' : 'btn'}
          disabled={!wordOk || busy}
        >
          {busy ? 'Procesando…' : confirmLabel}
        </button>
      </div>
    </form>
  );
}
