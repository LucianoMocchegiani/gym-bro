'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiClientError } from '@/lib/api/client';
import { listRoles } from '@/lib/api/roles';
import type { RoleDetail } from '@/lib/api/roles';
import { createStaff } from '@/lib/api/staff';
import type { StaffUserDetail } from '@/lib/api/staff';
import { ImageUpload, uploadImageToApi } from '@/components/ImageUpload';

/**
 * Formulario de alta de staff (CU-ROL-004), usable en modal.
 */
export function StaffCreateForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: (created: StaffUserDetail) => void;
  onCancel?: () => void;
}) {
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listRoles({ pageSize: 100 });
        if (cancelled) return;
        setRoles(data.items);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudieron cargar roles',
        );
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function toggleRole(id: string) {
    setRoleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setImageWarning(null);
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
      const created = await createStaff({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
        imageUrl: finalImageUrl ?? undefined,
        roleIds: roleIds.length > 0 ? roleIds : undefined,
      });
      onSuccess(created);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo crear el staff',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
      {loadError ? <p className="error">{loadError}</p> : null}

      <label>
        Nombre
        <input value={name} onChange={(e) => setName(e.target.value)} />
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
        Password inicial
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>
      <ImageUpload
        value={imageUrl}
        onFileSelect={setImageFile}
        onClear={() => { setImageUrl(null); setImageFile(null); }}
        label="Foto de perfil"
      />

      <fieldset className="perm-checklist" disabled={busy || !!loadError}>
        <legend>Roles iniciales</legend>
        {roles.map((r) => (
          <label key={r.id} className="checkbox-row">
            <input
              type="checkbox"
              checked={roleIds.includes(r.id)}
              onChange={() => toggleRole(r.id)}
            />
            {r.name}
          </label>
        ))}
      </fieldset>

      {imageWarning ? <p className="warn">{imageWarning}</p> : null}
      {error ? <p className="error">{error}</p> : null}

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
        <button
          type="submit"
          className="btn"
          disabled={busy || !!loadError}
        >
          {busy ? 'Guardando…' : 'Crear staff'}
        </button>
      </div>
    </form>
  );
}
