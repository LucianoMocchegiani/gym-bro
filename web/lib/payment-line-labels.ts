import type {
  PaymentLineDetail,
  PaymentLineService,
} from '@/lib/api/payment-lines';

const TZ = 'America/Argentina/Buenos_Aires';

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TZ,
  }).format(new Date(iso));
}

function formatSessionRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: TZ,
  }).format(start);
  const t1 = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(start);
  const t2 = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  }).format(end);
  return `${day} ${t1}–${t2}`;
}

/**
 * Segunda línea: reserva/contrato + sede + horario o vigencia.
 */
export function formatPaymentLineMeta(line: PaymentLineDetail): string {
  if (line.kind === 'DROP_IN') {
    const parts = [
      line.outcome === 'RESERVATION' ? 'Reserva confirmada' : 'Drop-in',
      line.session?.branchName,
      line.session
        ? formatSessionRange(line.session.startsAt, line.session.endsAt)
        : null,
    ];
    return parts.filter(Boolean).join(' · ');
  }
  const vigencia = line.contract
    ? line.contract.endsAt
      ? `vigencia ${formatDay(line.contract.startsAt)} – ${formatDay(line.contract.endsAt)}`
      : `desde ${formatDay(line.contract.startsAt)} (sin vencimiento)`
    : null;
  const parts = [
    line.outcome === 'CONTRACT' ? 'Contrato' : 'Pack',
    vigencia,
  ];
  return parts.filter(Boolean).join(' · ');
}

/**
 * Una fila de servicio dentro de un pack (créditos o acceso libre).
 */
export function formatPaymentLineService(s: PaymentLineService): string {
  if (s.credits == null) {
    return `${s.name} · acceso libre`;
  }
  return `${s.name} · ${s.credits} ${s.credits === 1 ? 'crédito' : 'créditos'}`;
}
