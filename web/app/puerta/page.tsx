'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { AccessResultBanner, AttemptsList } from '@/components/AccessResult';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { DoorShell } from '@/components/DoorShell';
import { RequireStaff } from '@/components/RequireStaff';
import { VenueQr } from '@/components/VenueQr';
import {
  createOid4VpRequest,
  getOid4VpSession,
  listAccessAttempts,
} from '@/lib/api/access';
import type {
  AccessAttemptDetail,
  AccessVerifyResult,
} from '@/lib/api/access';
import { todayBusinessDate } from '@/lib/api/cash-register';
import { ApiClientError } from '@/lib/api/client';

/**
 * Pantalla tocámetro: verificar ingreso vía OID4VP (CU-ACC-001).
 *
 * @remarks Modo B: QR = requestUri Quark; poll sesión hasta evaluate.
 */
export default function PuertaPage() {
  return (
    <RequireStaff>
      <PuertaInner />
    </RequireStaff>
  );
}

function PuertaInner() {
  const today = todayBusinessDate();
  const [requestUri, setRequestUri] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<string | null>(null);
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
  const doneSessionRef = useRef<string | null>(null);

  async function loadAttempts(opts?: { silent?: boolean }) {
    if (!opts?.silent) {
      setAttemptsLoading(true);
    }
    try {
      const data = await listAccessAttempts({
        pageSize: 100,
        from: appliedFrom,
        to: appliedTo,
        result: resultFilter === 'ALL' ? undefined : resultFilter,
      });
      setAttempts(data.items);
      setAttemptsError(null);
      return data.items;
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

  async function startRequest() {
    setBusy(true);
    setError(null);
    setResult(null);
    setSessionState(null);
    doneSessionRef.current = null;
    try {
      const res = await createOid4VpRequest();
      setRequestUri(res.requestUri);
      setSessionId(res.verificationSessionId);
    } catch (err) {
      setRequestUri(null);
      setSessionId(null);
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'No se pudo crear el QR de puerta',
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void startRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje
  }, []);

  useEffect(() => {
    void loadAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filtros explícitos
  }, [appliedFrom, appliedTo, resultFilter]);

  /** Poll de sesión OID4VP hasta done/error. */
  useEffect(() => {
    if (!sessionId || doneSessionRef.current === sessionId) {
      return;
    }
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const res = await getOid4VpSession(sessionId);
          setSessionState(res.state);
          if (res.status === 'pending') {
            return;
          }
          doneSessionRef.current = sessionId;
          if (res.status === 'done') {
            setResult(res.result);
            await loadAttempts({ silent: true });
          } else {
            setError(`Presentación fallida (${res.reasonCode})`);
          }
        } catch (err) {
          setError(
            err instanceof ApiClientError
              ? err.message
              : 'Error al consultar la sesión OID4VP',
          );
        }
      })();
    }, 2000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, appliedFrom, appliedTo, resultFilter]);

  function onFilter(e: FormEvent) {
    e.preventDefault();
    setAppliedFrom(from);
    setAppliedTo(to);
  }

  return (
    <DoorShell title="Acceso puerta">
      <AdminGrid className="door-dashboard">
        <Panel
          title="Verificar ingreso"
          description="Mostrá este QR; el afiliado lo escanea desde la app (OID4VP)."
        >
          {error ? <p className="error">{error}</p> : null}
          {requestUri ? (
            <VenueQr token={requestUri} />
          ) : (
            <p className="muted">
              {busy ? 'Generando QR…' : 'Sin QR activo.'}
            </p>
          )}
          <p className="muted small">
            {sessionState
              ? `Sesión: ${sessionState}`
              : 'Esperando escaneo del afiliado…'}
          </p>
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => void startRequest()}
          >
            {busy ? 'Generando…' : 'Nuevo QR'}
          </button>
        </Panel>

        <div className="admin-stack">
          <AccessResultBanner
            result={result}
            emptyText="Cuando un afiliado presente su credencial, verás PERMITIDO o DENEGADO acá."
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
