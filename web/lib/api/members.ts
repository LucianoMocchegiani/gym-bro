import { apiRequest } from '@/lib/api/client';
import type { MemberSummary } from '@/lib/api/types';

/**
 * Lista afiliados del gym (para pase manual).
 */
export function listMembers(
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' = 'ACTIVE',
): Promise<MemberSummary[]> {
  return apiRequest<MemberSummary[]>(`/members?status=${status}`);
}
