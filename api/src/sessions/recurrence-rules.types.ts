import { Weekday } from '@prisma/client';

/**
 * Regla semanal de sesiones expuesta por la API.
 */
export type RecurrenceRuleDetail = {
  id: string;
  tenantId: string;
  serviceId: string;
  serviceName: string;
  branchId: string;
  branchName: string;
  instructorId: string | null;
  instructorName: string | null;
  weekdays: Weekday[];
  localStartTime: string;
  durationMinutes: number;
  timezone: string;
  startsOn: Date;
  endsOn: Date;
  capacity: number;
  active: boolean;
  generatedSessionsCount: number;
  createdAt: Date;
  updatedAt: Date;
};
