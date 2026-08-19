'use client';

import { useState, type ReactNode } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { IconTrash, RowIconButton } from '@/components/RowActions';
import { ApiClientError } from '@/lib/api/client';

/**
 * Botón Eliminar de fila (destructivo, flag peligroso).
 *
 * @remarks Abre ConfirmDialog con `confirmWord=ELIMINAR`. El `onDelete`
 * devuelve el resultado del DELETE; si la API rechaza por regla de eliminación
 * (409/403), `onError` recibe el `ApiClientError` para mostrar el motivo.
 * Con `hidden` no se renderiza el botón (p. ej. rol de sistema).
 */
export function DeleteRowButton({
  label = 'Eliminar',
  dialogTitle,
  description,
  hidden = false,
  onDelete,
  onSuccess,
  onError,
}: {
  label?: string;
  dialogTitle: string;
  description?: ReactNode;
  hidden?: boolean;
  onDelete: () => Promise<unknown>;
  onSuccess: (result: unknown) => void;
  onError?: (err: ApiClientError) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      const result = await onDelete();
      setOpen(false);
      onSuccess(result);
    } catch (err) {
      setOpen(false);
      onError?.(err instanceof ApiClientError ? err : new ApiClientError(0, null, 'No se pudo eliminar'));
    } finally {
      setBusy(false);
    }
  }

  if (hidden) {
    return null;
  }

  return (
    <>
      <RowIconButton label={label} onClick={() => setOpen(true)}>
        <IconTrash />
      </RowIconButton>
      <ConfirmDialog
        open={open}
        title={dialogTitle}
        description={description}
        tone="danger"
        confirmLabel="Eliminar"
        confirmWord="ELIMINAR"
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
