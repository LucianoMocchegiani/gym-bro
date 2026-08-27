'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Panel } from '@/components/AdminUi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ImageUpload, uploadImageToApi } from '@/components/ImageUpload';
import { SkeletonForm } from '@/components/Skeleton';
import { StatusPill, memberStatusTone } from '@/components/StatusPill';
import { ApiClientError } from '@/lib/api/client';
import {
  getMember,
  updateMember,
  updateMemberStatus,
} from '@/lib/api/members';
import type { MemberDetail, MemberStatus } from '@/lib/api/members';
import { formatMemberStatus } from '@/lib/member-labels';

/**
 * Ficha + cambio de status del afiliado (CU-AFI-002/003).
 */
export function MemberFichaPanel({
  memberId,
  onSaved,
  onCancel,
}: {
  memberId: string;
  onSaved?: (member: MemberDetail) => void;
  onCancel?: () => void;
}) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<MemberStatus>('ACTIVE');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const m = await getMember(memberId);
        if (cancelled) return;
        setMember(m);
        setName(m.name ?? '');
        setEmail(m.email);
        setPhone(m.phone ?? '');
        setDocument(m.document ?? '');
        setImageUrl(m.imageUrl ?? null);
        setStatus(m.status);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el afiliado',
        );
      }
    })();
    return () => { cancelled = true; };
  }, [memberId]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!member) return;
    const dirty =
      name !== (member.name ?? '') ||
      email !== member.email ||
      phone !== (member.phone ?? '') ||
      document !== (member.document ?? '') ||
      imageUrl !== (member.imageUrl ?? null) ||
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
          finalImageUrl = await uploadImageToApi(imageFile, 'members');
        } catch (imgErr) {
          finalImageUrl = null;
          setImageWarning(
            imgErr instanceof Error
              ? `Imagen no subida: ${imgErr.message}`
              : 'Imagen no subida',
          );
        }
      }
      const updated = await updateMember(memberId, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() ? phone.trim() : null,
        document: document.trim() ? document.trim() : null,
        imageUrl: finalImageUrl,
      });
      setMember(updated);
      setSaveOk(true);
      onSaved?.(updated);
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo guardar la ficha',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onStatus(e: FormEvent) {
    e.preventDefault();
    if (!member || status === member.status) return;
    setConfirmStatus(true);
  }

  async function doStatus() {
    if (!member) return;
    setStatusBusy(true);
    setStatusError(null);
    try {
      const updated = await updateMemberStatus(memberId, status);
      setMember(updated);
      setStatus(updated.status);
      onSaved?.(updated);
    } catch (err) {
      setStatusError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cambiar el estado',
      );
      setStatus(member.status);
    } finally {
      setStatusBusy(false);
      setConfirmStatus(false);
    }
  }

  if (loadError) return <p className="error">{loadError}</p>;
  if (!member) return <SkeletonForm fields={4} />;

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
          <label>
            Teléfono
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            Documento
            <input
              value={document}
              onChange={(e) => setDocument(e.target.value)}
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
          <button type="submit" className="primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar ficha'}
          </button>
        </form>
      </Panel>

      <Panel title="Estado">
        <form className="admin-form" onSubmit={(e) => void onStatus(e)}>
          <p className="muted small">
            Actual:{' '}
            <StatusPill tone={memberStatusTone(member.status)}>
              {formatMemberStatus(member.status)}
            </StatusPill>
          </p>
          <label>
            Nuevo estado
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MemberStatus)}
            >
              <option value="ACTIVE">Activo</option>
              <option value="SUSPENDED">Suspendido</option>
              <option value="INACTIVE">Inactivo</option>
            </select>
          </label>
          {statusError ? <p className="error">{statusError}</p> : null}
          <button
            type="submit"
            className="primary"
            disabled={statusBusy || status === member.status}
          >
            {statusBusy ? 'Actualizando…' : 'Cambiar estado'}
          </button>
        </form>
      </Panel>

      <ConfirmDialog
        open={confirmSave}
        title="Guardar cambios"
        description="¿Confirmás guardar los cambios de la ficha del afiliado?"
        confirmLabel="Guardar"
        busy={busy}
        onConfirm={() => { setConfirmSave(false); void doSave(); }}
        onCancel={() => setConfirmSave(false)}
      />

      <ConfirmDialog
        open={confirmStatus}
        title="Cambiar estado"
        description={`¿Cambiar estado a ${formatMemberStatus(status)}?`}
        confirmLabel="Cambiar estado"
        tone={status === 'ACTIVE' ? 'default' : 'danger'}
        busy={statusBusy}
        onConfirm={() => void doStatus()}
        onCancel={() => setConfirmStatus(false)}
      />
    </div>
  );
}
