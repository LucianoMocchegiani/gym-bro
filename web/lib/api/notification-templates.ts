/**
 * Plantillas de aviso del gym (módulo notifications, CU-NOT-002).
 */

import { apiRequest } from '@/lib/api/client';

export type NotificationEventCode =
  | 'PAYMENT_APPROVED'
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_CANCELLED'
  | 'WAITLIST_PROMOTED'
  | 'REFUND_EXECUTED'
  | 'CONTRACT_EXPIRING'
  | 'CONTRACT_EXPIRING_DEBIT'
  | 'CONTRACT_IN_TOLERANCE'
  | 'DEBIT_CHARGE_FAILED'
  | 'DEBIT_MANDATE_FAILED';

/** Nombre del evento para el socio (mismos textos que la app). */
export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventCode, string> = {
  PAYMENT_APPROVED: 'Pago acreditado',
  RESERVATION_CONFIRMED: 'Reserva confirmada',
  RESERVATION_CANCELLED: 'Reserva cancelada',
  WAITLIST_PROMOTED: 'Lugar en lista de espera',
  REFUND_EXECUTED: 'Devolución',
  CONTRACT_EXPIRING: 'Pack por vencer (caja)',
  CONTRACT_EXPIRING_DEBIT: 'Pack por vencer (débito)',
  CONTRACT_IN_TOLERANCE: 'Pack vencido (tolerancia)',
  DEBIT_CHARGE_FAILED: 'Débito: cobro no acreditado',
  DEBIT_MANDATE_FAILED: 'Débito: mandato fallido',
};

export type NotificationTemplateDetail = {
  eventCode: NotificationEventCode;
  label: string;
  subject: string;
  body: string;
  active: boolean;
  customized: boolean;
  placeholders: string[];
};

export type UpsertNotificationTemplateInput = {
  subject: string;
  body: string;
  active: boolean;
};

/**
 * Lista eventos cableados + texto vigente (`tenant.settings.read`).
 */
export function listNotificationTemplates(): Promise<
  NotificationTemplateDetail[]
> {
  return apiRequest<NotificationTemplateDetail[]>('/notification-templates');
}

/**
 * Guarda asunto, cuerpo y activo (`tenant.settings.write`).
 */
export function upsertNotificationTemplate(
  eventCode: NotificationEventCode,
  input: UpsertNotificationTemplateInput,
): Promise<NotificationTemplateDetail> {
  return apiRequest<NotificationTemplateDetail>(
    `/notification-templates/${eventCode}`,
    { method: 'PATCH', body: input },
  );
}
