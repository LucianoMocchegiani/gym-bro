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

type TemplateDefault = {
  label: string;
  subject: string;
  body: string;
  placeholders: string[];
};

const DEFAULTS: Record<NotificationEventCode, TemplateDefault> = {
  PAYMENT_APPROVED: {
    label: 'Pago acreditado',
    subject: 'Pago acreditado — {{gym}}',
    body: 'Hola {{nombre}}, acreditamos un pago de {{monto}} en {{gym}}.',
    placeholders: ['gym', 'nombre', 'monto'],
  },
  RESERVATION_CONFIRMED: {
    label: 'Reserva confirmada',
    subject: 'Reserva confirmada — {{gym}}',
    body: 'Hola {{nombre}}, tu lugar en {{sesion}} ({{cuando}}) está confirmado.',
    placeholders: ['gym', 'nombre', 'sesion', 'cuando'],
  },
  RESERVATION_CANCELLED: {
    label: 'Reserva cancelada',
    subject: 'Reserva cancelada — {{gym}}',
    body: 'Hola {{nombre}}, se canceló tu reserva de {{sesion}} ({{cuando}}).',
    placeholders: ['gym', 'nombre', 'sesion', 'cuando'],
  },
  WAITLIST_PROMOTED: {
    label: 'Lugar en lista de espera',
    subject: 'Hay un lugar — {{gym}}',
    body: 'Hola {{nombre}}, saliste de la lista de espera: {{sesion}} ({{cuando}}).',
    placeholders: ['gym', 'nombre', 'sesion', 'cuando'],
  },
  REFUND_EXECUTED: {
    label: 'Devolución',
    subject: 'Devolución — {{gym}}',
    body: 'Hola {{nombre}}, se acreditó una devolución de {{monto}} en {{gym}}.',
    placeholders: ['gym', 'nombre', 'monto'],
  },
  CONTRACT_EXPIRING: {
    label: 'Pack por vencer',
    subject: 'Tu pack vence pronto — {{gym}}',
    body: 'Hola {{nombre}}, {{pack}} vence el {{vence}} ({{dias}} día(s)).',
    placeholders: ['gym', 'nombre', 'pack', 'vence', 'dias'],
  },
  CONTRACT_IN_TOLERANCE: {
    label: 'Pack vencido (tolerancia)',
    subject: 'Pack vencido (tolerancia) — {{gym}}',
    body: 'Hola {{nombre}}, {{pack}} venció el {{vence}}. Estás en período de tolerancia.',
    placeholders: ['gym', 'nombre', 'pack', 'vence'],
  },
};

export function defaultTemplate(event: NotificationEventCode): {
  subject: string;
  body: string;
} {
  const d = DEFAULTS[event];
  return { subject: d.subject, body: d.body };
}

/**
 * Nombre de producto del evento (Admin y listados).
 */
export function notificationEventLabel(event: NotificationEventCode): string {
  return DEFAULTS[event].label;
}

/**
 * Variables `{{clave}}` que el dispatcher rellena para ese evento.
 */
export function templatePlaceholders(
  event: NotificationEventCode,
): string[] {
  return [...DEFAULTS[event].placeholders];
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
