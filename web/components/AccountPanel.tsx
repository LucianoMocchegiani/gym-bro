'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiClientError, type SessionKind } from '@/lib/api/client';
import {
  changePassword,
  getPasswordStatus,
  setPassword,
} from '@/lib/api/auth';
import { accountInitials } from '@/components/AccountAvatarLink';
import { AdminModal } from '@/components/AdminModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Panel } from '@/components/AdminUi';

type AccountPanelProps = {
  name: string | null;
  email: string;
  /** Línea descriptiva del perfil (p. ej. "Operador" / "Super Admin"). */
  subtitle?: string;
  /** Marca contextual (p. ej. slug del gym). */
  badge?: string | null;
  onLogout: () => Promise<void>;
  loginHref: string;
  /** Impersonación: vuelve al tenant `admin` (sesión de plataforma sigue en ese origen). */
  onReturnToPlatform?: () => void;
  hasPassword?: boolean;
  /** Sesión con la que se consulta y cambia la contraseña. */
  passwordAuth?: SessionKind;
};

/**
 * Pantalla de cuenta (avatar → datos, cerrar sesión y contraseña).
 *
 * @remarks Usado en `/cuenta` del gym (socio y staff) y en el apex Identity.
 * Con contraseña: cambiarla revoca todos los refresh → re-login. Sin
 * contraseña (Google/Apple): "Crear contraseña", sin cerrar sesiones.
 * El estado real sale de `GET /auth/password`. En apex Identity, `passwordAuth`.
 */
export function AccountPanel({
  name,
  email,
  subtitle,
  badge,
  onLogout,
  loginHref,
  onReturnToPlatform,
  hasPassword: hasPasswordFromLogin = true,
  passwordAuth = 'staff',
}: AccountPanelProps) {
  const router = useRouter();
  const [hasPassword, setHasPassword] = useState(hasPasswordFromLogin);
  const [temporary, setTemporary] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  const [created, setCreated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getPasswordStatus(passwordAuth)
      .then((s) => {
        if (!cancelled) {
          setHasPassword(s.hasPassword);
          setTemporary(s.temporary);
        }
      })
      .catch(() => {
        // Queda el dato del login.
      });
    return () => {
      cancelled = true;
    };
  }, [passwordAuth]);

  function openPasswordModal(): void {
    setError(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirm('');
    setCreated(false);
    setPwOpen(true);
  }

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
      if (hasPassword) {
        await changePassword({ currentPassword, newPassword }, passwordAuth);
        setDone(true);
      } else {
        await setPassword(newPassword, passwordAuth);
        setHasPassword(true);
        setTemporary(false);
        setCreated(true);
      }
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo guardar la contraseña',
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
            {accountInitials(name, email)}
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
        title={hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
        description={
          hasPassword
            ? 'Se necesita la contraseña actual. Al cambiarla se cierran todas las sesiones activas.'
            : 'Entrás con Google o Apple. Si querés, creá una contraseña para entrar también con tu mail.'
        }
      >
        {temporary ? (
          <p className="err-msg">
            Estás usando la contraseña inicial (ChangeMe123!). Cambiala por una
            tuya.
          </p>
        ) : null}
        <div className="admin-modal-actions">
          <button type="button" className="btn" onClick={openPasswordModal}>
            {hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
          </button>
        </div>
      </Panel>

      <Panel
        title="Sesión"
        description="Cerrar la sesión actual en este dispositivo."
      >
        <div className="admin-modal-actions">
          {onReturnToPlatform ? (
            <button type="button" className="btn" onClick={onReturnToPlatform}>
              Volver a plataforma
            </button>
          ) : null}
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
        title={hasPassword && !created ? 'Cambiar contraseña' : 'Crear contraseña'}
        description={
          hasPassword && !created
            ? 'Necesitás la actual. Al cambiarla se cierran todas las sesiones activas.'
            : 'Mínimo 8 caracteres. Tu sesión sigue abierta.'
        }
        showCloseButton={!done}
      >
        {created ? (
          <div className="admin-stack">
            <p className="success">
              Contraseña creada. Ya podés entrar también con tu mail.
            </p>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => setPwOpen(false)}
              >
                Listo
              </button>
            </div>
          </div>
        ) : done ? (
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
            {hasPassword ? (
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
            ) : null}
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
                {busy
                  ? 'Guardando…'
                  : hasPassword
                    ? 'Cambiar contraseña'
                    : 'Crear contraseña'}
              </button>
            </div>
          </form>
        )}
      </AdminModal>
    </div>
  );
}