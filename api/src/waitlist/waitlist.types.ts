/**
 * Ítem de lista de espera expuesto por la API.
 */
export type WaitlistEntryDetail = {
  id: string;
  tenantId: string;
  sessionId: string;
  sessionStartsAt: Date;
  sessionEndsAt: Date;
  serviceId: string;
  serviceName: string;
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  status: 'WAITING' | 'PROMOTED' | 'LEFT';
  position: number | null;
  createdAt: Date;
  updatedAt: Date;
};
