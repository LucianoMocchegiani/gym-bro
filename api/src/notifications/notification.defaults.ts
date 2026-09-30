import { NotificationEventCode } from '@prisma/client';

export const PAYMENT_APPROVED_DEFAULT = {
  subject: 'Pago acreditado — {{gym}}',
  body: 'Hola {{nombre}}, acreditamos un pago de {{monto}} en {{gym}}.',
} as const;

export function defaultTemplate(event: NotificationEventCode): {
  subject: string;
  body: string;
} {
  if (event === NotificationEventCode.PAYMENT_APPROVED) {
    return PAYMENT_APPROVED_DEFAULT;
  }
  return { subject: '{{gym}}', body: '' };
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
