'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Panel } from '@/components/AdminUi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ImageUpload, uploadImageToApi } from '@/components/ImageUpload';
import { SkeletonForm } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import { getStaff, updateStaff } from '@/lib/api/staff';
import type { StaffUserDetail } from '@/lib/api/staff';

/**
 * Ficha de edición del staff (name, email, imageUrl).
 */
export function StaffFichaPanel({
  staffId,
  onSaved,
  onCancel,
}: {
  staffId: string;
  onSaved?: (staff: StaffUserDetail) => void;
  onCancel?: () => void;
}) {
  const [staff, setStaff] = useState<StaffUserDetail | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await getStaff(staffId);
        if (cancelled) return;
        setStaff(s);
        setName(s.name ?? '');
        setEmail(s.email);
        setImageUrl(s.imageUrl ?? null);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el staff',
        );
      }
    })();
    return () => { cancelled = true; };
  }, [staffId]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!staff) return;
    const dirty =
      name !== (staff.name ?? '') ||
      email !== staff.email ||
      imageUrl !== (staff.imageUrl ?? null) ||
      imageFile !== null;
    if (!dirty) {
      onCancel?.();
      return;
    }
    setConfirmSave(true);
  }

  async function doSave() {
    setBusy(true);
    setSaveError(null);
    setImageWarning(null);
    setSaveOk(false);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        try {
          finalImageUrl = await uploadImageToApi(imageFile, 'staff');
        } catch (imgErr) {
          finalImageUrl = null;
          setImageWarning(
            imgErr instanceof Error
              ? `Imagen no subida: ${imgErr.message}`
              : 'Imagen no subida',
          );
        }
      }
      const updated = await updateStaff(staffId, {
        name: name.trim() || undefined,
        email: email.trim(),
        imageUrl: finalImageUrl,
      });
      setStaff(updated);
      setSaveOk(true);
      onSaved?.(updated);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo guardar el staff',
      );
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <p className="error">{loadError}</p>;
  if (!staff) return <SkeletonForm fields={3} />;

  return (
    <div className="admin-stack">
      <Panel title="Datos">
        <form className="admin-form" onSubmit={(e) => void onSave(e)}>
          <label>
            Nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <ImageUpload
            value={imageUrl}
            onFileSelect={setImageFile}
            onClear={() => { setImageUrl(null); setImageFile(null); }}
            label="Foto de perfil"
          />
          {imageWarning ? <p className="warn">{imageWarning}</p> : null}
          {saveError ? <p className="error">{saveError}</p> : null}
          {saveOk ? <p className="ok-msg">Ficha guardada.</p> : null}

          <div className="admin-modal-actions">
            {onCancel ? (
              <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>
                Cancelar
              </button>
            ) : null}
            <button type="submit" className="btn" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </Panel>

      <ConfirmDialog
        open={confirmSave}
        title="Guardar cambios"
        description="¿Confirmás guardar los cambios del staff?"
        confirmLabel="Guardar"
        busy={busy}
        onConfirm={() => { setConfirmSave(false); void doSave(); }}
        onCancel={() => setConfirmSave(false)}
      />
    </div>
  );
}
