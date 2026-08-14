/**
 * Session recurrence rules API (módulo `sessions` / CU-SER-004).
 */

import { apiRequest } from '@/lib/api/client';
import { toSearchParams } from '@/lib/api/list';
import type { ListParams, ListResult } from '@/lib/api/list';

export type Weekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

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
  startsOn: string;
  endsOn: string;
  capacity: number;
  active: boolean;
  generatedSessionsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateRecurrenceRuleInput = {
  serviceId: string;
  weekdays: Weekday[];
  localStartTime: string;
  durationMinutes: number;
  timezone: string;
  startsOn: string;
  endsOn: string;
  capacity: number;
  instructorId?: string;
  branchId?: string;
};

/** Timezone fijo MVP Paraguay. */
export const DEFAULT_RECURRENCE_TIMEZONE = 'America/Asuncion';

/**
 * Lista reglas de recurrencia (`sessions.write`).
 */
export function listRecurrenceRules(
  input?: ListParams,
): Promise<ListResult<RecurrenceRuleDetail>> {
  const qs = toSearchParams(input);
  return apiRequest<ListResult<RecurrenceRuleDetail>>(
    `/session-recurrence-rules${qs ? `?${qs}` : ''}`,
  );
}

/**
 * Alta de regla semanal + materialización de sesiones.
 */
export function createRecurrenceRule(
  input: CreateRecurrenceRuleInput,
): Promise<RecurrenceRuleDetail> {
  return apiRequest<RecurrenceRuleDetail>('/session-recurrence-rules', {
    method: 'POST',
    body: input,
  });
}

/**
 * Desactiva la regla (no cancela sesiones ya generadas).
 */
export function deactivateRecurrenceRule(
  ruleId: string,
): Promise<RecurrenceRuleDetail> {
  return apiRequest<RecurrenceRuleDetail>(
    `/session-recurrence-rules/${ruleId}/status`,
    {
      method: 'PATCH',
      body: { active: false },
    },
  );
}
