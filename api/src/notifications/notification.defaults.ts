import { NotificationEventCode } from '@prisma/client';

export const CABLED_NOTIFICATION_EVENTS: NotificationEventCode[] = [
  NotificationEventCode.PAYMENT_APPROVED,
  NotificationEventCode.RESERVATION_CONFIRMED,
  NotificationEventCode.RESERVATION_CANCELLED,
  NotificationEventCode.WAITLIST_PROMOTED,
  NotificationEventCode.REFUND_EXECUTED,
  NotificationEventCode.CONTRACT_EXPIRING,
  NotificationEventCode.CONTRACT_EXPIRING_DEBIT,
  NotificationEventCode.CONTRACT_IN_TOLERANCE,
  NotificationEventCode.DEBIT_CHARGE_FAILED,
  NotificationEventCode.DEBIT_MANDATE_FAILED,
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
    label: 'Pack por vencer (caja)',
    subject: 'Tu pack vence pronto — {{gym}}',
    body: 'Hola {{nombre}}, {{pack}} vence el {{vence}} ({{dias}} día(s)). Renová en el gym o en la app.',
    placeholders: ['gym', 'nombre', 'pack', 'vence', 'dias'],
  },
  CONTRACT_EXPIRING_DEBIT: {
    label: 'Pack por vencer (débito)',
    subject: 'Próximo débito — {{gym}}',
    body: 'Hola {{nombre}}, {{pack}} se renueva el {{vence}} ({{dias}} día(s)). Asegurate de tener saldo en Mercado Pago.',
    placeholders: ['gym', 'nombre', 'pack', 'vence', 'dias'],
  },
  CONTRACT_IN_TOLERANCE: {
    label: 'Pack vencido (tolerancia)',
    subject: 'Pack vencido (tolerancia) — {{gym}}',
    body: 'Hola {{nombre}}, {{pack}} venció el {{vence}}. Estás en período de tolerancia.',
    placeholders: ['gym', 'nombre', 'pack', 'vence'],
  },
  DEBIT_CHARGE_FAILED: {
    label: 'Débito: cobro no acreditado',
    subject: 'No se pudo debitar — {{gym}}',
    body: 'Hola {{nombre}}, Mercado Pago no pudo cobrar {{pack}} ({{motivo}}). Reintentará; revisá el saldo de tu medio de pago.',
    placeholders: ['gym', 'nombre', 'pack', 'motivo'],
  },
  DEBIT_MANDATE_FAILED: {
    label: 'Débito: mandato fallido',
    subject: 'Débito automático detenido — {{gym}}',
    body: 'Hola {{nombre}}, el débito de {{pack}} quedó fallido. Pasá por el gym para renovar o volver a autorizar.',
    placeholders: ['gym', 'nombre', 'pack'],
  },
  PLATFORM_PLAN_PAID: {
    label: 'Plan Faciliter acreditado',
    subject: 'Pago de Faciliter — {{gym}}',
    body: 'Hola {{nombre}}, acreditamos el plan {{pack}} de {{gym}} ({{monto}}).',
    placeholders: ['gym', 'nombre', 'pack', 'monto'],
  },
  PLATFORM_PLAN_EXPIRING: {
    label: 'Plan Faciliter por vencer (caja)',
    subject: 'Renovación Faciliter — {{gym}}',
    body: 'Hola {{nombre}}, el plan {{pack}} de {{gym}} vence el {{vence}} ({{dias}} día(s)). Renová desde Plan / Uso o con el equipo Faciliter.',
    placeholders: ['gym', 'nombre', 'pack', 'vence', 'dias'],
  },
  PLATFORM_PLAN_EXPIRING_DEBIT: {
    label: 'Plan Faciliter por vencer (débito)',
    subject: 'Próximo débito Faciliter — {{gym}}',
    body: 'Hola {{nombre}}, el plan {{pack}} de {{gym}} se renueva el {{vence}} ({{dias}} día(s)). Asegurate de tener saldo en Mercado Pago.',
    placeholders: ['gym', 'nombre', 'pack', 'vence', 'dias'],
  },
  PLATFORM_PLAN_IN_TOLERANCE: {
    label: 'Plan Faciliter en gracia',
    subject: 'Plan Faciliter vencido — {{gym}}',
    body: 'Hola {{nombre}}, el plan {{pack}} de {{gym}} venció el {{vence}}. Estás en días de gracia; después el panel queda limitado.',
    placeholders: ['gym', 'nombre', 'pack', 'vence'],
  },
  PLATFORM_DEBIT_CHARGE_FAILED: {
    label: 'Plan Faciliter: cobro no acreditado',
    subject: 'No se pudo debitar Faciliter — {{gym}}',
    body: 'Hola {{nombre}}, Mercado Pago no pudo cobrar el plan {{pack}} de {{gym}} ({{motivo}}). Reintentará; revisá el saldo.',
    placeholders: ['gym', 'nombre', 'pack', 'motivo'],
  },
  PLATFORM_DEBIT_MANDATE_FAILED: {
    label: 'Plan Faciliter: débito detenido',
    subject: 'Débito Faciliter detenido — {{gym}}',
    body: 'Hola {{nombre}}, el débito del plan {{pack}} de {{gym}} quedó fallido. Renová desde la cuenta o contactá a Faciliter.',
    placeholders: ['gym', 'nombre', 'pack'],
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
