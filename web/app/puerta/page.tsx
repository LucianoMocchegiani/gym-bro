'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AccessResultBanner } from '@/components/AccessResult';
import { memberFichaHref } from '@/lib/member-link';
import {
  DataTable,
  ListFilterField,
  ListToolbar,
  listCountDescription,
} from '@/components/AdminList';
import { AdminGrid, Panel } from '@/components/AdminUi';
import { DoorManualPassPanel } from '@/components/DoorManualPassPanel';
import { DoorShell, parseDoorTab } from '@/components/DoorShell';
import type { DoorTab } from '@/components/DoorShell';
import { RequireStaff } from '@/components/RequireStaff';
import { PageSkeleton } from '@/components/Skeleton';
import {
  StatusPill,
  accessResultLabel,
  accessResultTone,
} from '@/components/StatusPill';
import { VenueQr } from '@/components/VenueQr';
import { formatAccessReason } from '@/lib/access-labels';
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
import { VenueQrSkeleton } from '@/components/VenueQrSkeleton';

const PAGE_SIZE = 20;

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(iso));
}

function subjectLabel(a: AccessAttemptDetail): string {
  if (a.subjectStaffId) {
    return (
      a.subjectStaffName?.trim() ||
      a.subjectStaffEmail?.trim() ||
      a.subjectStaffId
    );
  }
  if (a.memberName?.trim()) {
    return a.memberName;
  }
  if (a.memberEmail?.trim()) {
    return a.memberEmail;
  }
  if (a.credentialRef) {
    return a.credentialRef;
  }
  return '—';
}

/**
 * Puerta unificada: Verificar | Pase manual | Historial (CU-ACC-001/004/005).
 */
export default function PuertaPage() {
  return (
    <RequireStaff>
      <Suspense fallback={<PageSkeleton />}>
        <PuertaInner />
      </Suspense>
    </RequireStaff>
  );
}

function PuertaInner() {
  const searchParams = useSearchParams();
  const tab: DoorTab = parseDoorTab(searchParams.get('tab'));
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
  const [page, setPage] = useState(1);
  const [attempts, setAttempts] = useState<AccessAttemptDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [attemptsLoading, setAttemptsLoading] = useState(true);
  const [attemptsError, setAttemptsError] = useState<string | null>(null);
  const doneSessionRef = useRef<string | null>(null);
  const verifyStartedRef = useRef(false);

  const loadAttempts = useCallback(
    async (opts?: { silent?: boolean; pageOverride?: number }) => {
      const pageToLoad = opts?.pageOverride ?? page;
      if (!opts?.silent) {
        setAttemptsLoading(true);
      }
      try {
        const data = await listAccessAttempts({
          page: pageToLoad,
          pageSize: PAGE_SIZE,
          from: appliedFrom,
          to: appliedTo,
          result: resultFilter === 'ALL' ? undefined : resultFilter,
        });
        setAttempts(data.items);
        setTotal(data.total);
        setHasMore(data.hasMore);
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
    },
    [page, appliedFrom, appliedTo, resultFilter],
  );

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

  /** Genera QR al entrar a Verificar (una vez por visita a la pestaña). */
  useEffect(() => {
    if (tab !== 'verificar') {
      verifyStartedRef.current = false;
      return;
    }
    if (verifyStartedRef.current) {
      return;
    }
    verifyStartedRef.current = true;
    void startRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al activar tab
  }, [tab]);

  useEffect(() => {
    if (tab !== 'historial') {
      return;
    }
    void loadAttempts();
  }, [tab, loadAttempts]);

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
            setPage(1);
            await loadAttempts({ silent: true, pageOverride: 1 });
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
  }, [sessionId, loadAttempts]);

  function onFilter(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setAppliedFrom(from);
    setAppliedTo(to);
  }

  function refreshHistorial() {
    setPage(1);
    void loadAttempts({ silent: true, pageOverride: 1 });
  }

  return (
    <DoorShell title="Acceso puerta">
      {tab === 'verificar' ? (
        <AdminGrid className="door-dashboard">
          <Panel
            title="Verificar ingreso"
            description="Mostrá este QR; el afiliado lo escanea desde la app (OID4VP)."
          >
            {error ? <p className="error">{error}</p> : null}
            {requestUri ? (
              <VenueQr token={requestUri} />
            ) : (
              <VenueQrSkeleton />
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

          <AccessResultBanner
            result={result}
            emptyText="Cuando un afiliado presente su credencial, verás PERMITIDO o DENEGADO acá."
          />
        </AdminGrid>
      ) : null}

      {tab === 'pase' ? (
        <DoorManualPassPanel onPassRegistered={refreshHistorial} />
      ) : null}

      {tab === 'historial' ? (
        <div className="admin-stack">
          <ListToolbar>
            <form className="toolbar-field search-form" onSubmit={onFilter}>
              <label>
                Desde
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  required
                />
              </label>
              <label>
                Hasta
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  required
                />
              </label>
              <button
                type="submit"
                className="btn ghost"
                disabled={attemptsLoading}
              >
                Aplicar
              </button>
            </form>
            <ListFilterField
              label="Resultado"
              value={resultFilter}
              onChange={(v) => {
                setPage(1);
                setResultFilter(v as 'ALL' | 'ALLOWED' | 'DENIED');
              }}
            >
              <option value="ALL">Todos</option>
              <option value="ALLOWED">ALLOWED</option>
              <option value="DENIED">DENIED</option>
            </ListFilterField>
          </ListToolbar>

          <DataTable
            title="Historial de ingresos"
            description={`${appliedFrom} → ${appliedTo} · ${listCountDescription(total, page, 'intento', 'intentos')}`}
            loading={attemptsLoading}
            error={attemptsError}
            isEmpty={attempts.length === 0}
            emptyText="Sin intentos en este filtro."
            page={page}
            hasMore={hasMore}
            onPageChange={setPage}
            header={
              <>
                <th>Resultado</th>
                <th>Quién</th>
                <th>Motivo</th>
                <th>Cuándo</th>
              </>
            }
          >
            {attempts.map((a) => (
              <tr key={a.id}>
                <td>
                  <StatusPill tone={accessResultTone(a.result)}>
                    {accessResultLabel(a.result)}
                  </StatusPill>
                </td>
                <td>
                  {a.subjectStaffId ? (
                    <Link href={`/staff/${a.subjectStaffId}`}>
                      {subjectLabel(a)}
                    </Link>
                  ) : a.memberId ? (
                    <Link
                      href={memberFichaHref(
                        a.memberId,
                        a.memberName ?? a.memberEmail ?? '',
                      )}
                    >
                      {subjectLabel(a)}
                    </Link>
                  ) : (
                    subjectLabel(a)
                  )}
                </td>
                <td className="muted small">
                  {formatAccessReason(a.reasonCode)}
                </td>
                <td>{formatWhen(a.createdAt)}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      ) : null}
    </DoorShell>
  );
}
