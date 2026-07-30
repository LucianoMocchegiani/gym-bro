/**
 * Members API (módulo `members`).
 */

import { apiRequest } from '@/lib/api/client';
import type { ContractDetail } from '@/lib/api/contracts';

export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export type MemberDetail = {
  id: string;
  tenantId: string;
  email: string;
  name: string | null;
  phone: string | null;
  document: string | null;
  branchId: string | null;
  status: MemberStatus;
  createdAt: string;
  updatedAt: string;
};

/** Alias usado por pase manual / selects. */
export type MemberSummary = MemberDetail;

export type CreateMemberInput = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  document?: string;
};

export type UpdateMemberInput = {
  email?: string;
  name?: string;
  phone?: string | null;
  document?: string | null;
};

export type MemberAccountDetail = {
  member: MemberDetail;
  summary: {
    activeContracts: number;
    hasAccessLibre: boolean;
    totalCreditsRemaining: number;
  };
  debt: {
    amount: number;
    status: 'AL_DIA' | 'EN_DEUDA';
  };
  contracts: ContractDetail[];
  recentPayments: {
    id: string;
    amount: number;
    status: string;
    method: string;
    packId: string | null;
    createdAt: string;
  }[];
  reservations: {
    id: string;
    sessionId: string;
    serviceName: string;
    startsAt: string;
    endsAt: string;
    status: string;
    coverage: string;
  }[];
};

/**
 * Lista afiliados del gym (`members.read`).
 *
 * @param status Si se omite, la API devuelve todos.
 */
export function listMembers(status?: MemberStatus): Promise<MemberDetail[]> {
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
export function createMember(input: CreateMemberInput): Promise<MemberDetail> {
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
