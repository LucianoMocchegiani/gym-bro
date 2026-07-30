'use client';

import { formatAccessReason } from '@/lib/access-labels';
import type { AccessAttemptDetail, AccessVerifyResult } from '@/lib/api/types';

/**
 * Resultado grande de verificación / pase manual.
 */
export function AccessResultBanner({
  result,
}: {
  result: AccessVerifyResult | null;
}) {
  if (!result) {
    return null;
  }
  return (
    <section
      className={`result-banner ${result.allowed ? 'allowed' : 'denied'}`}
      aria-live="polite"
    >
      <p className="result-status">
        {result.allowed ? 'PERMITIDO' : 'DENEGADO'}
      </p>
      <p className="result-reason">{formatAccessReason(result.reasonCode)}</p>
      {result.memberId ? (
        <p className="muted small">Afiliado: {result.memberId}</p>
      ) : null}
    </section>
  );
}

/**
 * Lista compacta de intentos recientes.
 */
export function AttemptsList({
  attempts,
  loading,
  error,
}: {
  attempts: AccessAttemptDetail[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <section className="attempts">
      <h2>Últimos ingresos</h2>
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
            <span>{formatAccessReason(a.reasonCode)}</span>
            <time dateTime={a.createdAt}>
              {new Date(a.createdAt).toLocaleString('es-AR')}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
