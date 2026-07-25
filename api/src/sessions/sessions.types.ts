/**
 * Sesión de calendario expuesta por la API.
 */
export type SessionDetail = {
  id: string;
  tenantId: string;
  serviceId: string;
  serviceName: string;
  branchId: string;
  branchName: string;
  instructorId: string | null;
  instructorName: string | null;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  bookedCount: number;
  status: 'PUBLISHED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
};
