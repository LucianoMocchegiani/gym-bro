'use client';

import { useState } from 'react';
import { Panel } from '@/components/AdminUi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { deleteMyAccount } from '@/lib/api/account';
import { ApiClientError } from '@/lib/api/client';

/**
 * Eliminar la cuenta Faciliter desde el apex `/cuenta` (CU-CTA-001).
 *
 * @remarks Pide escribir ELIMINAR. Si la API responde 409 (dueña de un gym
 * activo, RN-CTA-003) muestra el motivo y no toca la sesión. En éxito llama
 * a `onDeleted`, que cierra la sesión local y redirige.
 */
export function DeleteAccountPanel({
  onDeleted,
}: {
  onDeleted: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount();
      await onDeleted();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo eliminar la cuenta',
      );
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Eliminar cuenta"
      description="Borra tu cuenta Faciliter. No se puede deshacer."
    >
      <div className="admin-modal-actions">
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
        >
          Eliminar cuenta
        </button>
      </div>
      <ConfirmDialog
        open={open}
        title="Eliminar cuenta"
        description="Esto no se puede deshacer."
        confirmLabel="Eliminar mi cuenta"
        tone="danger"
        confirmWord="ELIMINAR"
        busy={busy}
        onConfirm={() => void confirm()}
        onCancel={() => setOpen(false)}
      >
        <ul>
          <li>
            Se borra tu cuenta: no vas a poder entrar con este mail, Google ni
            Apple.
          </li>
          <li>
            Se cancelan tus reservas futuras y débitos automáticos; lo que te
            quede de packs vigentes se pierde.
          </li>
          <li>
            Cada gym conserva tu ficha y el historial de pagos y comprobantes.
            Si querés que también lo borren, pediselo al gym.
          </li>
          <li>
            Si volvés a entrar con el mismo mail, empezás con una cuenta nueva
            y vacía.
          </li>
        </ul>
        {error ? <p className="error">{error}</p> : null}
      </ConfirmDialog>
    </Panel>
  );
}
