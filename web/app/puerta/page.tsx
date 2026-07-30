'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AccessResultBanner, AttemptsList } from '@/components/AccessResult';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { DoorShell } from '@/components/DoorShell';
import { RequireStaff } from '@/components/RequireStaff';
import { listAccessAttempts, verifyAccess } from '@/lib/api/access';
import { ApiClientError } from '@/lib/api/client';
import type {
  AccessAttemptDetail,
  AccessScanMode,
  AccessVerifyResult,
} from '@/lib/api/types';
import { useAuth } from '@/lib/auth/AuthProvider';

/**
 * Pantalla tocámetro: verificar ingreso (CU-ACC-001).
 *
 * @remarks Stub: pegar `presentationToken` / venue+credential. Sin cámara.
 */
export default function PuertaPage() {
  return (
    <RequireStaff>
      <PuertaInner />
    </RequireStaff>
  );
}

function PuertaInner() {
  const { session } = useAuth();
  const [mode, setMode] = useState<AccessScanMode>('gym_scans_member');
  const [presentationToken, setPresentationToken] = useState('');
  const [venueToken, setVenueToken] = useState(
    () => (session ? `stub-venue:${session.tenantId}` : ''),
  );
  const [credentialRef, setCredentialRef] = useState('');
  const [result, setResult] = useState<AccessVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState<AccessAttemptDetail[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(true);
  const [attemptsError, setAttemptsError] = useState<string | null>(null);

  const effectiveVenue =
    venueToken ||
    (session?.tenantId ? `stub-venue:${session.tenantId}` : '');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listAccessAttempts(15);
        if (cancelled) {
          return;
        }
        setAttempts(rows);
        setAttemptsError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setAttemptsError(
          err instanceof ApiClientError
            ? err.message
            : 'No se pudo cargar el historial',
        );
      } finally {
        if (!cancelled) {
          setAttemptsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshAttempts() {
    setAttemptsLoading(true);
    setAttemptsError(null);
    try {
      const rows = await listAccessAttempts(15);
      setAttempts(rows);
    } catch (err) {
      setAttemptsError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar el historial',
      );
    } finally {
      setAttemptsLoading(false);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body =
        mode === 'gym_scans_member'
          ? {
              mode,
              presentationToken: presentationToken.trim(),
            }
          : {
              mode,
              venueToken: effectiveVenue.trim(),
              credentialRef: credentialRef.trim() || presentationToken.trim(),
            };
      const res = await verifyAccess(body);
      setResult(res);
      setPresentationToken('');
      setCredentialRef('');
      await refreshAttempts();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Error al verificar ingreso',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <DoorShell title="Acceso puerta">
      <AdminGrid className="door-dashboard">
        <Panel
          title="Verificar ingreso"
          description="Ingresá la credencial presentada en recepción."
        >
          <form className="admin-form" onSubmit={(e) => void onVerify(e)}>
            <fieldset className="mode-toggle">
              <legend>Modo de escaneo</legend>
              <label>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'gym_scans_member'}
                  onChange={() => setMode('gym_scans_member')}
                />
                Gym escanea afiliado
              </label>
              <label>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === 'member_scans_gym'}
                  onChange={() => setMode('member_scans_gym')}
                />
                Afiliado escanea el local
              </label>
            </fieldset>

            {mode === 'gym_scans_member' ? (
              <label>
                Token del afiliado (stub: <code>stub:…</code>)
                <input
                  value={presentationToken}
                  onChange={(e) => setPresentationToken(e.target.value)}
                  placeholder="stub:xxxxxxxx-…"
                  required
                  autoFocus
                  autoComplete="off"
                />
              </label>
            ) : (
              <>
                <label>
                  Venue token
                  <input
                    value={effectiveVenue}
                    onChange={(e) => setVenueToken(e.target.value)}
                    required
                    autoComplete="off"
                  />
                </label>
                <label>
                  Credencial del afiliado
                  <input
                    value={credentialRef}
                    onChange={(e) => setCredentialRef(e.target.value)}
                    placeholder="stub:xxxxxxxx-…"
                    required
                    autoComplete="off"
                  />
                </label>
              </>
            )}

            {error ? <p className="error">{error}</p> : null}

            <button type="submit" className="primary" disabled={busy}>
              {busy ? 'Verificando…' : 'Verificar ingreso'}
            </button>
          </form>
        </Panel>

        <div className="admin-stack">
          <AccessResultBanner result={result} />
          <AttemptsList
            attempts={attempts}
            loading={attemptsLoading}
            error={attemptsError}
          />
        </div>
      </AdminGrid>
    </DoorShell>
  );
}
