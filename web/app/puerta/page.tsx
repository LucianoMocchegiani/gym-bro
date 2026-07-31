'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AccessResultBanner, AttemptsList } from '@/components/AccessResult';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { DoorShell } from '@/components/DoorShell';
import { RequireStaff } from '@/components/RequireStaff';
import { listAccessAttempts, verifyAccess } from '@/lib/api/access';
import type {
  AccessAttemptDetail,
  AccessScanMode,
  AccessVerifyResult,
} from '@/lib/api/access';
import { todayBusinessDate } from '@/lib/api/cash-register';
import { ApiClientError } from '@/lib/api/client';
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
  const today = todayBusinessDate();
  const [mode, setMode] = useState<AccessScanMode>('gym_scans_member');
  const [presentationToken, setPresentationToken] = useState('');
  const [venueToken, setVenueToken] = useState(
    () => (session ? `stub-venue:${session.tenantId}` : ''),
  );
  const [credentialRef, setCredentialRef] = useState('');
  const [result, setResult] = useState<AccessVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(today);
  const [appliedTo, setAppliedTo] = useState(today);
  const [resultFilter, setResultFilter] = useState<
    'ALL' | 'ALLOWED' | 'DENIED'
  >('ALL');
  const [attempts, setAttempts] = useState<AccessAttemptDetail[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(true);
  const [attemptsError, setAttemptsError] = useState<string | null>(null);

  const effectiveVenue =
    venueToken ||
    (session?.tenantId ? `stub-venue:${session.tenantId}` : '');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setAttemptsLoading(true);
      try {
        const rows = await listAccessAttempts({
          limit: 100,
          from: appliedFrom,
          to: appliedTo,
          result: resultFilter === 'ALL' ? undefined : resultFilter,
        });
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
  }, [appliedFrom, appliedTo, resultFilter]);

  async function refreshAttempts() {
    setAttemptsLoading(true);
    setAttemptsError(null);
    try {
      const rows = await listAccessAttempts({
        limit: 100,
        from: appliedFrom,
        to: appliedTo,
        result: resultFilter === 'ALL' ? undefined : resultFilter,
      });
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

  function onFilter(e: FormEvent) {
    e.preventDefault();
    setAppliedFrom(from);
    setAppliedTo(to);
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
          <Panel title="Historial" description="Filtrá por fecha (BA) y resultado.">
            <form className="toolbar" onSubmit={onFilter}>
              <label className="toolbar-field">
                Desde
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  required
                />
              </label>
              <label className="toolbar-field">
                Hasta
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  required
                />
              </label>
              <label className="toolbar-field">
                Resultado
                <select
                  value={resultFilter}
                  onChange={(e) =>
                    setResultFilter(
                      e.target.value as 'ALL' | 'ALLOWED' | 'DENIED',
                    )
                  }
                >
                  <option value="ALL">Todos</option>
                  <option value="ALLOWED">ALLOWED</option>
                  <option value="DENIED">DENIED</option>
                </select>
              </label>
              <button type="submit" disabled={attemptsLoading}>
                Aplicar
              </button>
            </form>
          </Panel>
          <AttemptsList
            attempts={attempts}
            loading={attemptsLoading}
            error={attemptsError}
            title="Ingresos"
            description={`${appliedFrom} → ${appliedTo} · hasta 100`}
          />
        </div>
      </AdminGrid>
    </DoorShell>
  );
}
