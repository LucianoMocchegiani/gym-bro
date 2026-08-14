/**
 * Reserva confirmada expuesta por la API.
 */
export type ReservationDetail = {
  id: string;
  tenantId: string;
  memberId: string;
  /** Nombre del afiliado (roster / ops). */
  memberName: string | null;
  memberEmail: string;
  sessionId: string;
  sessionStartsAt: Date;
  sessionEndsAt: Date;
  serviceId: string;
  serviceName: string;
  contractId: string | null;
  creditBalanceId: string | null;
  paymentId: string | null;
  paymentAmount: number | null;
  paymentMethod: 'STUB' | 'CASH' | 'MP' | null;
  status: 'CONFIRMED' | 'CANCELLED';
  coverage: 'CREDIT' | 'DROP_IN';
  createdAt: Date;
  updatedAt: Date;
};
