import type { ReactNode } from 'react';

/**
 * Tono visual del pill (mapea a clases `.status-pill.*` en globals).
 */
export type StatusTone = 'ok' | 'warn' | 'muted' | 'danger';

const TONE_CLASS: Record<StatusTone, string> = {
  ok: 'active',
  warn: 'suspended',
  muted: 'inactive',
  danger: 'denied',
};

/**
 * Chip de estado reutilizable en listados Admin.
 *
 * @remarks Preferí `tone` + etiqueta; no pases clases CSS crudas desde las páginas.
 */
export function StatusPill({
  tone,
  children,
}: {
  tone: StatusTone;
  children: ReactNode;
}) {
  return (
    <span className={`status-pill ${TONE_CLASS[tone]}`}>{children}</span>
  );
}

/** Activo / inactivo booleano (staff, servicios, packs, recurrencias). */
export function activeTone(active: boolean): StatusTone {
  return active ? 'ok' : 'muted';
}

/** Status de afiliado (`ACTIVE` | `SUSPENDED` | …). */
export function memberStatusTone(status: string): StatusTone {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return 'ok';
    case 'SUSPENDED':
      return 'warn';
    default:
      return 'muted';
  }
}

/** Solicitud de devolución. */
export function refundStatusTone(
  status: 'PENDING' | 'EXECUTED' | 'REJECTED',
): StatusTone {
  switch (status) {
    case 'PENDING':
      return 'warn';
    case 'EXECUTED':
      return 'ok';
    case 'REJECTED':
      return 'danger';
    default:
      return 'muted';
  }
}

export function refundStatusLabel(
  status: 'PENDING' | 'EXECUTED' | 'REJECTED',
): string {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'EXECUTED':
      return 'Ejecutada';
    case 'REJECTED':
      return 'Rechazada';
    default:
      return status;
  }
}

/** Intento de acceso puerta. */
export function accessResultTone(
  result: 'ALLOWED' | 'DENIED',
): StatusTone {
  return result === 'ALLOWED' ? 'ok' : 'danger';
}

export function accessResultLabel(result: 'ALLOWED' | 'DENIED'): string {
  return result === 'ALLOWED' ? 'OK' : 'NO';
}
