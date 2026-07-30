import { apiRequest } from '@/lib/api/client';
import type {
  CreateMemberInput,
  MemberAccountDetail,
  MemberDetail,
  MemberStatus,
  UpdateMemberInput,
} from '@/lib/api/types';

/**
 * Lista afiliados del gym (`members.read`).
 *
 * @param status Si se omite, la API devuelve todos.
 */
export function listMembers(
  status?: MemberStatus,
): Promise<MemberDetail[]> {
  const q = status ? `?status=${status}` : '';
  return apiRequest<MemberDetail[]>(`/members${q}`);
}

/**
 * Detalle de un afiliado.
 */
export function getMember(memberId: string): Promise<MemberDetail> {
  return apiRequest<MemberDetail>(`/members/${memberId}`);
}

/**
 * Estado de cuenta (CU-AFI-004).
 */
export function getMemberAccount(
  memberId: string,
): Promise<MemberAccountDetail> {
  return apiRequest<MemberAccountDetail>(`/members/${memberId}/account`);
}

/**
 * Alta de afiliado (CU-AFI-001).
 */
export function createMember(
  input: CreateMemberInput,
): Promise<MemberDetail> {
  return apiRequest<MemberDetail>('/members', {
    method: 'POST',
    body: input,
  });
}

/**
 * Edición de ficha (CU-AFI-002).
 */
export function updateMember(
  memberId: string,
  input: UpdateMemberInput,
): Promise<MemberDetail> {
  return apiRequest<MemberDetail>(`/members/${memberId}`, {
    method: 'PATCH',
    body: input,
  });
}

/**
 * Cambio de status (CU-AFI-003 / `members.deactivate`).
 */
export function updateMemberStatus(
  memberId: string,
  status: MemberStatus,
): Promise<MemberDetail> {
  return apiRequest<MemberDetail>(`/members/${memberId}/status`, {
    method: 'PATCH',
    body: { status },
  });
}
