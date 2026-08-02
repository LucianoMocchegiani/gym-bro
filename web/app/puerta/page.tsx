'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { AccessResultBanner, AttemptsList } from '@/components/AccessResult';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { DoorShell } from '@/components/DoorShell';
import { RequireStaff } from '@/components/RequireStaff';
import { VenueQr } from '@/components/VenueQr';
import { listAccessAttempts, verifyAccess } from '@/lib/api/access';
import type {
  AccessAttemptDetail,
  AccessScanMode,
  AccessVerifyResult,
} from '@/lib/api/access';
import { todayBusinessDate } from '@/lib/api/cash-register';
import { ApiClientError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthProvider';

function attemptToResult(a: AccessAttemptDetail): AccessVerifyResult {
  return {
    allowed: a.result === 'ALLOWED',
    reasonCode: a.reasonCode,
    memberId: a.memberId,
    reservationId: a.reservationId,
    sessionId: a.sessionId,
    checkedInAt: null,
    attempt: a,
  };
}

/**
 * Pantalla tocámetro: verificar ingreso (CU-ACC-001).
 *
 * @remarks Modo B: QR del local + polling para ver el check-in del afiliado.
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
  const [mode, setMode] = useState<AccessScanMode>('member_scans_gym');
  const [presentationToken, setPresentationToken] = useState('');
  const venueToken =
    session?.tenantId != null ? `stub-venue:${session.tenantId}` : '';
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
  const lastLiveAttemptId = useRef<string | null>(null);

  async function loadAttempts(opts?: { silent?: boolean }) {
    if (!opts?.silent) {
      setAttemptsLoading(true);
    }
    try {
      const rows = await listAccessAttempts({
        limit: 100,
        from: appliedFrom,
        to: appliedTo,
        result: resultFilter === 'ALL' ? undefined : resultFilter,
      });
      setAttempts(rows);
      setAttemptsError(null);
      return rows;
    } catch (err) {
      setAttemptsError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo cargar el historial',
      );
      return null;
    } finally {
      if (!opts?.silent) {
        setAttemptsLoading(false);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await loadAttempts();
      if (cancelled || !rows?.length) {
        return;
      }
      lastLiveAttemptId.current = rows[0]?.id ?? null;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filtros explícitos
  }, [appliedFrom, appliedTo, resultFilter]);

  /** Polling: ambos ven el resultado cuando el afiliado escanea el QR del local. */
  useEffect(() => {
    if (mode !== 'member_scans_gym') {
      return;
    }
    const id = window.setInterval(() => {
      void (async () => {
        const rows = await loadAttempts({ silent: true });
        if (!rows?.length) {
          return;
        }
        const latest = rows[0];
        if (!latest || latest.id === lastLiveAttemptId.current) {
          return;
        }
        if (latest.scanMode !== 'member_scans_gym') {
          lastLiveAttemptId.current = latest.id;
          return;
        }
        const ageMs = Date.now() - new Date(latest.createdAt).getTime();
        if (ageMs > 60_000) {
          lastLiveAttemptId.current = latest.id;
          return;
        }
        lastLiveAttemptId.current = latest.id;
        setResult(attemptToResult(latest));
      })();
    }, 2000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, appliedFrom, appliedTo, resultFilter]);

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
      const res = await verifyAccess({
        mode: 'gym_scans_member',
        presentationToken: presentationToken.trim(),
      });
      setResult(res);
      lastLiveAttemptId.current = res.attempt.id;
      setPresentationToken('');
      await loadAttempts({ silent: true });
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
          description={
            mode === 'member_scans_gym'
              ? 'Mostrá este QR; el afiliado lo escanea desde la app.'
              : 'Pegá el token del afiliado (modo gym escanea).'
          }
        >
          <fieldset className="mode-toggle">
            <legend>Modo de escaneo</legend>
            <label>
              <input
                type="radio"
                name="mode"
                checked={mode === 'member_scans_gym'}
                onChange={() => {
                  setMode('member_scans_gym');
                  setResult(null);
                  setError(null);
                }}
              />
              Afiliado escanea el local
            </label>
            <label>
              <input
                type="radio"
                name="mode"
                checked={mode === 'gym_scans_member'}
                onChange={() => {
                  setMode('gym_scans_member');
                  setResult(null);
                  setError(null);
                }}
              />
              Gym escanea afiliado
            </label>
          </fieldset>

          {mode === 'member_scans_gym' ? (
            venueToken ? (
              <VenueQr token={venueToken} />
            ) : (
              <p className="muted">Sin tenant en sesión.</p>
            )
          ) : (
            <form className="admin-form" onSubmit={(e) => void onVerify(e)}>
              <label>
                <span>
                  Token del afiliado (stub: <code>stub:…</code>)
                </span>
                <input
                  value={presentationToken}
                  onChange={(e) => setPresentationToken(e.target.value)}
                  placeholder="stub:xxxxxxxx-…"
                  required
                  autoFocus
                  autoComplete="off"
                />
              </label>
              {error ? <p className="error">{error}</p> : null}
              <button type="submit" className="primary" disabled={busy}>
                {busy ? 'Verificando…' : 'Verificar ingreso'}
              </button>
            </form>
          )}

          {mode === 'member_scans_gym' ? (
            <p className="muted small">
              Esperando escaneo… el resultado aparece acá y en el historial.
            </p>
          ) : null}
        </Panel>

        <div className="admin-stack">
          <AccessResultBanner
            result={result}
            emptyText={
              mode === 'member_scans_gym'
                ? 'Cuando un afiliado escanee el QR, verás PERMITIDO o DENEGADO acá.'
                : 'El resultado del próximo ingreso aparecerá acá.'
            }
          />
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
