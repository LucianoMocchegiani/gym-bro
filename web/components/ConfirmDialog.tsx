'use client';

import { useState, type ReactNode } from 'react';
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
  confirmWord2,
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
  /** Segunda palabra exigida (p. ej. slug en borrado de tenant). */
  confirmWord2?: string;
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
        confirmWord2={confirmWord2}
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
  confirmWord2,
  busy,
  onConfirm,
  onCancel,
}: {
  confirmLabel: string;
  cancelLabel: string;
  tone: 'default' | 'danger';
  confirmWord?: string;
  confirmWord2?: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [typed2, setTyped2] = useState('');

  const wordOk = confirmWord
    ? typed.trim().toUpperCase() === confirmWord.toUpperCase()
    : true;
  const word2Ok = confirmWord2
    ? typed2.trim().toUpperCase() === confirmWord2.toUpperCase()
    : true;

  return (
    <div className="admin-form" role="form">
      {confirmWord ? (
        <label>
          Escribí <strong>{confirmWord}</strong> para confirmar
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            placeholder={confirmWord}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && wordOk && word2Ok && !busy) {
                e.preventDefault();
                onConfirm();
              }
            }}
          />
        </label>
      ) : null}
      {confirmWord2 ? (
        <label>
          Escribí el slug <strong>{confirmWord2}</strong> para confirmar
          <input
            value={typed2}
            onChange={(e) => setTyped2(e.target.value)}
            autoComplete="off"
            placeholder={confirmWord2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && wordOk && word2Ok && !busy) {
                e.preventDefault();
                onConfirm();
              }
            }}
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
          type="button"
          className={tone === 'danger' ? 'btn danger' : 'btn'}
          disabled={!wordOk || !word2Ok || busy}
          onClick={() => { if (wordOk && word2Ok && !busy) onConfirm(); }}
        >
          {busy ? 'Procesando…' : confirmLabel}
        </button>
      </div>
    </div>
  );
}
