'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError } from '@/lib/api/client';
import { changePassword } from '@/lib/api/auth';
import { AdminModal } from '@/components/AdminModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Panel } from '@/components/AdminUi';

type AccountPanelProps = {
  name: string | null;
  email: string;
  /** Línea descriptiva del perfil (p. ej. “Operador” / “Super Admin”). */
  subtitle?: string;
  /** Marca contextual (p. ej. slug del gym). */
  badge?: string | null;
  authMode: 'staff' | 'super';
  onLogout: () => Promise<void>;
  loginHref: string;
};

function initials(name: string | null, email: string): string {
  const src = name?.trim();
  if (!src) {
    return email.slice(0, 1).toUpperCase();
  }
  const parts = src.split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * Pantalla de cuenta (avatar → datos, cerrar sesión y cambio de contraseña).
 *
 * @remarks Usado en el panel Staff (`/cuenta`) y Super (`/super/cuenta`).
 * El cambio de contraseña abre un modal; al cambiarla el server revoca todos
 * los refresh tokens → se invita a re-login.
 */
export function AccountPanel({
  name,
  email,
  subtitle,
  badge,
  authMode,
  onLogout,
  loginHref,
}: AccountPanelProps) {
  const router = useRouter();
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  function closeModal(): void {
    if (!done) {
      setPwOpen(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirm) {
      setError('La confirmación no coincide con la nueva contraseña');
      return;
    }
    setBusy(true);
    try {
      await changePassword({ currentPassword, newPassword }, authMode);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cambiar la contraseña',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout(): Promise<void> {
    setLogoutBusy(true);
    try {
      await onLogout();
      router.replace(loginHref);
    } finally {
      setLogoutBusy(false);
    }
  }

  return (
    <div className="admin-stack">
      <Panel title="Mi cuenta" description="Usuario con sesión activa">
        <div className="account-summary">
          <span className="account-avatar-lg" aria-hidden="true">
            {initials(name, email)}
          </span>
          <div>
            <p className="account-name">
              {name?.trim() || email.split('@')[0] || 'Usuario'}
            </p>
            <p className="muted">{email}</p>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
            {badge ? <p className="muted">{badge}</p> : null}
          </div>
        </div>
      </Panel>

      <Panel
        title="Cambiar contraseña"
        description="Se necesita la contraseña actual. Al cambiarla se cierran todas las sesiones activas."
      >
        <div className="admin-modal-actions">
          <button
            type="button"
            className="btn"
            onClick={() => setPwOpen(true)}
          >
            Cambiar contraseña
          </button>
        </div>
      </Panel>

      <Panel
        title="Sesión"
        description="Cerrar la sesión actual en este dispositivo."
      >
        <div className="admin-modal-actions">
          <button
            type="button"
            className="btn danger"
            onClick={() => setLogoutOpen(true)}
          >
            Cerrar sesión
          </button>
        </div>
      </Panel>

      <ConfirmDialog
        open={logoutOpen}
        title="Cerrar sesión"
        description="¿Estás seguro de que querés cerrar la sesión actual?"
        confirmLabel="Cerrar sesión"
        tone="danger"
        busy={logoutBusy}
        onConfirm={() => void handleLogout()}
        onCancel={() => setLogoutOpen(false)}
      />

      <AdminModal
        open={pwOpen}
        onClose={closeModal}
        title="Cambiar contraseña"
        description="Necesitás la actual. Al cambiarla se cierran todas las sesiones activas."
        showCloseButton={!done}
      >
        {done ? (
          <div className="admin-stack">
            <p className="success">
              Contraseña cambiada. Volvé a iniciar sesión con la nueva
              contraseña.
            </p>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => void handleLogout()}
              >
                Iniciar sesión de nuevo
              </button>
            </div>
          </div>
        ) : (
          <form className="admin-form" onSubmit={(e) => void onSubmit(e)}>
            <label>
              Contraseña actual
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            <label>
              Nueva contraseña
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </label>
            <label>
              Repetir nueva contraseña
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </label>

            {error ? <p className="error">{error}</p> : null}

            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={closeModal}
                disabled={busy}
              >
                Cancelar
              </button>
              <button type="submit" className="btn" disabled={busy}>
                {busy ? 'Guardando…' : 'Cambiar contraseña'}
              </button>
            </div>
          </form>
        )}
      </AdminModal>
    </div>
  );
}