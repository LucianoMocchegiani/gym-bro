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
  contractId: string;
  creditBalanceId: string;
  status: 'CONFIRMED' | 'CANCELLED';
  coverage: 'CREDIT';
  createdAt: Date;
  updatedAt: Date;
};
