/**
 * Reserva confirmada expuesta por la API.
 */
export type ReservationDetail = {
  id: string;
  tenantId: string;
  memberId: string;
  sessionId: string;
  sessionStartsAt: Date;
  sessionEndsAt: Date;
  serviceId: string;
  serviceName: string;
  contractId: string | null;
  creditBalanceId: string | null;
  paymentId: string | null;
  paymentAmount: number | null;
  paymentMethod: 'STUB' | 'CASH' | null;
  status: 'CONFIRMED' | 'CANCELLED';
  coverage: 'CREDIT' | 'DROP_IN';
  createdAt: Date;
  updatedAt: Date;
};
