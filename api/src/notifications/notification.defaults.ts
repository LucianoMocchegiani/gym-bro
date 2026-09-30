import { NotificationEventCode } from '@prisma/client';

export const CABLED_NOTIFICATION_EVENTS: NotificationEventCode[] = [
  NotificationEventCode.PAYMENT_APPROVED,
  NotificationEventCode.RESERVATION_CONFIRMED,
  NotificationEventCode.RESERVATION_CANCELLED,
  NotificationEventCode.WAITLIST_PROMOTED,
  NotificationEventCode.REFUND_EXECUTED,
  NotificationEventCode.CONTRACT_EXPIRING,
  NotificationEventCode.CONTRACT_IN_TOLERANCE,
];

const DEFAULTS: Record<
  NotificationEventCode,
  { subject: string; body: string }
> = {
  PAYMENT_APPROVED: {
    subject: 'Pago acreditado — {{gym}}',
    body: 'Hola {{nombre}}, acreditamos un pago de {{monto}} en {{gym}}.',
  },
  RESERVATION_CONFIRMED: {
    subject: 'Reserva confirmada — {{gym}}',
    body: 'Hola {{nombre}}, tu lugar en {{sesion}} ({{cuando}}) está confirmado.',
  },
  RESERVATION_CANCELLED: {
    subject: 'Reserva cancelada — {{gym}}',
    body: 'Hola {{nombre}}, se canceló tu reserva de {{sesion}} ({{cuando}}).',
  },
  WAITLIST_PROMOTED: {
    subject: 'Hay un lugar — {{gym}}',
    body: 'Hola {{nombre}}, saliste de la lista de espera: {{sesion}} ({{cuando}}).',
  },
  REFUND_EXECUTED: {
    subject: 'Devolución — {{gym}}',
    body: 'Hola {{nombre}}, se acreditó una devolución de {{monto}} en {{gym}}.',
  },
  CONTRACT_EXPIRING: {
    subject: 'Tu pack vence pronto — {{gym}}',
    body: 'Hola {{nombre}}, {{pack}} vence el {{vence}} ({{dias}} día(s)).',
  },
  CONTRACT_IN_TOLERANCE: {
    subject: 'Pack vencido (tolerancia) — {{gym}}',
    body: 'Hola {{nombre}}, {{pack}} venció el {{vence}}. Estás en período de tolerancia.',
  },
};

export function defaultTemplate(event: NotificationEventCode): {
  subject: string;
  body: string;
} {
  return DEFAULTS[event];
}

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

export function formatAmountArs(amount: number): string {
  return `$${amount.toLocaleString('es-AR')}`;
}

const TZ = 'America/Argentina/Buenos_Aires';

export function formatSessionWhen(at: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(at);
}
