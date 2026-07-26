import { AuthProfileType, Prisma } from '@prisma/client';

/**
 * Actor que dispara un evento de auditoría (SUPER o STAFF).
 */
export type AuditActor = {
  profileType: 'SUPER' | 'STAFF' | 'MEMBER';
  userId: string;
};

/**
 * Payload para persistir un EventoAuditoria (RN-ROL-008).
 */
export type RecordAuditInput = {
  tenantId: string | null;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
};

/**
 * Evento de auditoría expuesto por la API.
 */
export type AuditEventDetail = {
  id: string;
  tenantId: string | null;
  actorProfile: AuthProfileType;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  before: Prisma.JsonValue | null;
  after: Prisma.JsonValue | null;
  createdAt: Date;
};

/** Códigos de acción usados en E1 (ampliar al cablear más dominios). */
export const AUDIT_ACTIONS = {
  tenantCreate: 'tenant.create',
  tenantUpdate: 'tenant.update',
  roleCreate: 'role.create',
  roleUpdate: 'role.update',
  staffRolesSet: 'staff.roles.set',
  memberCreate: 'member.create',
  memberUpdate: 'member.update',
  memberStatus: 'member.status',
  serviceCreate: 'service.create',
  serviceUpdate: 'service.update',
  packCreate: 'pack.create',
  packUpdate: 'pack.update',
  contractCreate: 'contract.create',
  contractCancel: 'contract.cancel',
  sessionCreate: 'session.create',
  sessionUpdate: 'session.update',
  sessionCancel: 'session.cancel',
  sessionCapacityExpand: 'session.capacity.expand',
  recurrenceRuleCreate: 'session.recurrence.create',
  recurrenceRuleDeactivate: 'session.recurrence.deactivate',
  reservationCreate: 'reservation.create',
  reservationCancel: 'reservation.cancel',
  waitlistJoin: 'waitlist.join',
  waitlistLeave: 'waitlist.leave',
  waitlistPromote: 'waitlist.promote',
  tenantSettingsUpdate: 'tenant.settings.update',
  cashReconcile: 'cash.reconcile',
} as const;
