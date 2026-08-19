'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RequireStaff } from '@/components/RequireStaff';
import { SkeletonForm } from '@/components/Skeleton';
import { ApiClientError } from '@/lib/api/client';
import {
  disconnectMercadoPagoAccount,
  getMercadoPagoAccount,
  testMercadoPagoAccount,
  upsertMercadoPagoAccount,
} from '@/lib/api/mercadopago';
import type { MercadoPagoAccountStatus } from '@/lib/api/mercadopago';
import {
  getTenantSettings,
  updateTenantSettings,
} from '@/lib/api/tenant-settings';
import type {
  TenantSettingsDetail,
  WaitlistMode,
} from '@/lib/api/tenant-settings';

/**
 * Config operativa del gym + cuenta Mercado Pago.
 */
export default function ConfigPage() {
  return (
    <RequireStaff>
      <ConfigInner />
    </RequireStaff>
  );
}

function ConfigInner() {
  const [settings, setSettings] = useState<TenantSettingsDetail | null>(null);
  const [cancellationHours, setCancellationHours] = useState('24');
  const [waitlistMode, setWaitlistMode] =
    useState<WaitlistMode>('AUTO_ASSIGN');
  const [allowLate, setAllowLate] = useState(false);
  const [debtDays, setDebtDays] = useState('0');
  const [multiEntry, setMultiEntry] = useState(false);
  const [multiMax, setMultiMax] = useState('2');

  const [mp, setMp] = useState<MercadoPagoAccountStatus | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [publicKey, setPublicKey] = useState('');

  const [loadError, setLoadError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsOk, setSettingsOk] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);
  const [mpOk, setMpOk] = useState<string | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [mpBusy, setMpBusy] = useState(false);
  const [confirmSettings, setConfirmSettings] = useState(false);
  const [confirmMpDisconnect, setConfirmMpDisconnect] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const errors: string[] = [];
      try {
        const s = await getTenantSettings();
        if (!cancelled) {
          applySettings(s);
        }
      } catch (err) {
        errors.push(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar settings',
        );
      }
      try {
        const account = await getMercadoPagoAccount();
        if (!cancelled) {
          setMp(account);
        }
      } catch (err) {
        errors.push(
          err instanceof ApiClientError
            ? `MP: ${err.message}`
            : 'No se pudo cargar Mercado Pago',
        );
      }
      if (!cancelled) {
        setLoadError(errors.length ? errors.join(' · ') : null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function applySettings(s: TenantSettingsDetail) {
    setSettings(s);
    setCancellationHours(String(s.reservationCancellationHours));
    setWaitlistMode(s.waitlistMode);
    setAllowLate(s.allowLateSessionEntry);
    setDebtDays(String(s.debtToleranceDays));
    setMultiEntry(s.multiEntryEnabled);
    setMultiMax(String(s.multiEntryMaxPerDay));
  }

  async function onSaveSettings(e: FormEvent) {
    e.preventDefault();
    if (!settings) {
      return;
    }
    const dirty =
      cancellationHours !== String(settings.reservationCancellationHours) ||
      waitlistMode !== settings.waitlistMode ||
      allowLate !== settings.allowLateSessionEntry ||
      debtDays !== String(settings.debtToleranceDays) ||
      multiEntry !== settings.multiEntryEnabled ||
      multiMax !== String(settings.multiEntryMaxPerDay);
    if (!dirty) {
      // Sin cambios: no pegarle a la API.
      return;
    }
    setConfirmSettings(true);
  }

  async function doSaveSettings() {
    setSettingsBusy(true);
    setSettingsError(null);
    setSettingsOk(false);
    try {
      const updated = await updateTenantSettings({
        reservationCancellationHours: Number(cancellationHours),
        waitlistMode,
        allowLateSessionEntry: allowLate,
        debtToleranceDays: Number(debtDays),
        multiEntryEnabled: multiEntry,
        multiEntryMaxPerDay: Number(multiMax),
      });
      applySettings(updated);
      setSettingsOk(true);
    } catch (err) {
      setSettingsError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo guardar la configuración',
      );
    } finally {
      setSettingsBusy(false);
    }
  }

  async function onConnectMp(e: FormEvent) {
    e.preventDefault();
    setMpBusy(true);
    setMpError(null);
    setMpOk(null);
    try {
      const status = await upsertMercadoPagoAccount({
        accessToken: accessToken.trim(),
        publicKey: publicKey.trim(),
        validate: true,
      });
      setMp(status);
      setAccessToken('');
      setPublicKey('');
      setMpOk('Cuenta conectada.');
    } catch (err) {
      setMpError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo conectar Mercado Pago',
      );
    } finally {
      setMpBusy(false);
    }
  }

  async function onTestMp() {
    setMpBusy(true);
    setMpError(null);
    setMpOk(null);
    try {
      const result = await testMercadoPagoAccount();
      const refreshed = await getMercadoPagoAccount();
      setMp(refreshed);
      setMpOk(
        result.ok
          ? `Test OK${result.nickname ? ` — ${result.nickname}` : ''}`
          : 'Test falló',
      );
    } catch (err) {
      setMpError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo probar la cuenta',
      );
    } finally {
      setMpBusy(false);
    }
  }

  async function doDisconnectMp() {
    setMpBusy(true);
    setMpError(null);
    setMpOk(null);
    try {
      const status = await disconnectMercadoPagoAccount();
      setMp(status);
      setMpOk('Cuenta desconectada.');
    } catch (err) {
      setMpError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo desconectar',
      );
    } finally {
      setMpBusy(false);
      setConfirmMpDisconnect(false);
    }
  }

  return (
    <AdminShell title="Config">
      {loadError ? <p className="error">{loadError}</p> : null}
      {!settings && mp === null && !loadError ? (
        <SkeletonForm fields={3} />
      ) : null}

      {settings || mp !== null ? (
        <AdminGrid>
          {settings ? (
            <Panel title="Operación" className="form-panel">
              <form
                className="admin-form"
                onSubmit={(e) => void onSaveSettings(e)}
              >
                <label>
                  Horas de cancelación de reserva
                  <input
                    type="number"
                    min={0}
                    max={720}
                    value={cancellationHours}
                    onChange={(e) => setCancellationHours(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Modo lista de espera
                  <select
                    value={waitlistMode}
                    onChange={(e) =>
                      setWaitlistMode(e.target.value as WaitlistMode)
                    }
                  >
                    <option value="AUTO_ASSIGN">Auto-asignar</option>
                    <option value="MEMBER_CONFIRM">Confirma afiliado</option>
                    <option value="STAFF_CONFIRM">Confirma staff</option>
                  </select>
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={allowLate}
                    onChange={(e) => setAllowLate(e.target.checked)}
                  />
                  Permitir ingreso tardío a sesión
                </label>
                <label>
                  Tolerancia de deuda (días)
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={debtDays}
                    onChange={(e) => setDebtDays(e.target.value)}
                    required
                  />
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={multiEntry}
                    onChange={(e) => setMultiEntry(e.target.checked)}
                  />
                  Multi-ingreso por día
                </label>
                {multiEntry ? (
                  <label>
                    Tope diario de ingresos
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={multiMax}
                      onChange={(e) => setMultiMax(e.target.value)}
                      required
                    />
                  </label>
                ) : null}

                {settingsError ? (
                  <p className="error">{settingsError}</p>
                ) : null}
                {settingsOk ? <p className="ok-msg">Guardado.</p> : null}

                <button
                  type="submit"
                  className="primary"
                  disabled={settingsBusy}
                >
                  {settingsBusy ? 'Guardando…' : 'Guardar operación'}
                </button>
              </form>
            </Panel>
          ) : null}

          {mp !== null ? (
            <Panel title="Mercado Pago" className="form-panel">
              <p className="muted small">
                {mp.connected
                  ? `Conectada · key ${mp.publicKeyMasked ?? '—'} · user ${mp.mpUserId ?? '—'}`
                  : 'Sin cuenta conectada'}
                {mp.lastValidatedAt
                  ? ` · último test ${new Date(mp.lastValidatedAt).toLocaleString('es-AR')}${mp.lastValidationOk === false ? ' (falló)' : ''}`
                  : ''}
              </p>

              <form
                className="admin-form"
                onSubmit={(e) => void onConnectMp(e)}
              >
                <label>
                  Access token
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    required
                    minLength={10}
                    autoComplete="off"
                  />
                </label>
                <label>
                  Public key
                  <input
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="off"
                  />
                </label>

                {mpError ? <p className="error">{mpError}</p> : null}
                {mpOk ? <p className="ok-msg">{mpOk}</p> : null}

                <div className="form-actions">
                  <button type="submit" className="primary" disabled={mpBusy}>
                    {mpBusy ? 'Procesando…' : 'Conectar / reemplazar'}
                  </button>
                  {mp.connected ? (
                    <>
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={mpBusy}
                        onClick={() => void onTestMp()}
                      >
                        Probar
                      </button>
                      <button
                        type="button"
                        className="btn danger"
                        disabled={mpBusy}
                        onClick={() => setConfirmMpDisconnect(true)}
                      >
                        Desconectar
                      </button>
                    </>
                  ) : null}
                </div>
              </form>
            </Panel>
          ) : null}
        </AdminGrid>
      ) : null}

      <ConfirmDialog
        open={confirmSettings}
        title="Guardar cambios"
        description="¿Confirmás guardar la configuración de operación del gym?"
        confirmLabel="Guardar"
        busy={settingsBusy}
        onConfirm={() => {
          setConfirmSettings(false);
          void doSaveSettings();
        }}
        onCancel={() => setConfirmSettings(false)}
      />

      <ConfirmDialog
        open={confirmMpDisconnect}
        title="Desconectar Mercado Pago"
        description="¿Desconectar la cuenta Mercado Pago? Los cobros MP dejan de funcionar hasta conectar otra cuenta."
        confirmLabel="Desconectar"
        tone="danger"
        busy={mpBusy}
        onConfirm={() => void doDisconnectMp()}
        onCancel={() => setConfirmMpDisconnect(false)}
      />
    </AdminShell>
  );
}
