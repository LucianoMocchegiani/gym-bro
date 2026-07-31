'use client';

import Link from 'next/link';
import { formatAccessReason } from '@/lib/access-labels';
import type { AccessAttemptDetail, AccessVerifyResult } from '@/lib/api/access';
import { Panel } from '@/components/AdminUi';

function memberLabel(a: AccessAttemptDetail): string {
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
 * Resultado grande de verificación / pase manual.
 */
export function AccessResultBanner({
  result,
  emptyText = 'El resultado del próximo ingreso aparecerá acá.',
}: {
  result: AccessVerifyResult | null;
  emptyText?: string;
}) {
  if (!result) {
    return (
      <Panel title="Resultado" className="access-result empty">
        <p className="muted">{emptyText}</p>
      </Panel>
    );
  }
  const who =
    result.attempt.memberName?.trim() ||
    result.attempt.memberEmail?.trim() ||
    result.memberId;
  return (
    <Panel
      title="Resultado"
      className={`access-result ${result.allowed ? 'allowed' : 'denied'}`}
      aria-live="polite"
    >
      <p className="result-status">
        {result.allowed ? 'PERMITIDO' : 'DENEGADO'}
      </p>
      <p className="result-reason">{formatAccessReason(result.reasonCode)}</p>
      {who ? (
        <p className="muted small">
          Afiliado:{' '}
          {result.memberId ? (
            <Link href={`/afiliados/${result.memberId}`}>{who}</Link>
          ) : (
            who
          )}
        </p>
      ) : null}
    </Panel>
  );
}

/**
 * Lista de intentos de puerta con nombre de afiliado.
 */
export function AttemptsList({
  attempts,
  loading,
  error,
  title = 'Últimos ingresos',
  description = 'Actividad registrada en esta puerta.',
}: {
  attempts: AccessAttemptDetail[];
  loading: boolean;
  error: string | null;
  title?: string;
  description?: string;
}) {
  const allowed = attempts.filter((a) => a.result === 'ALLOWED').length;
  const denied = attempts.filter((a) => a.result === 'DENIED').length;

  return (
    <Panel title={title} description={description} className="attempts">
      {!loading && !error && attempts.length > 0 ? (
        <p className="muted small">
          En listado: {allowed} ALLOWED · {denied} DENIED
        </p>
      ) : null}
      {loading ? <p className="muted">Cargando…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {!loading && !error && attempts.length === 0 ? (
        <p className="muted">Sin intentos todavía.</p>
      ) : null}
      <ul className="attempts-list">
        {attempts.map((a) => (
          <li key={a.id} className={a.result === 'ALLOWED' ? 'ok' : 'no'}>
            <span className="badge">
              {a.result === 'ALLOWED' ? 'OK' : 'NO'}
            </span>
            <span className="attempt-who">
              {a.memberId ? (
                <Link href={`/afiliados/${a.memberId}`}>{memberLabel(a)}</Link>
              ) : (
                memberLabel(a)
              )}
            </span>
            <span>
              {formatAccessReason(a.reasonCode)}
              {a.manualPass ? ' · manual' : ''}
              {a.motiveCode ? ` · ${a.motiveCode}` : ''}
            </span>
            <time dateTime={a.createdAt}>
              {new Date(a.createdAt).toLocaleString('es-AR')}
            </time>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
